'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deriveRadarVals, getTier } from '@/lib/verdict';
import type { DashboardRotationData, SignalCounts } from '@/lib/dashboard/rotation';
import { empireRatingFromTfo } from '@/lib/dashboard/rotation';
import DashboardTopBar from './DashboardTopBar';
import ModeToggleBar, { type DashboardMode } from './ModeToggleBar';
import LeagueRotationHeader from './LeagueRotationHeader';
import PlayerTicker from './PlayerTicker';
import PlayerCard from './PlayerCard';
import RightPanel from './RightPanel';
import TradeTargetsTable from './TradeTargetsTable';
import DynastyNewsFeed from './DynastyNewsFeed';
import IncomingTrades, { type IncomingTrade } from './IncomingTrades';
import Footer from './Footer';

const ROTATE_SECONDS = 60;
const CARD_LIMIT = 16;

const EMPTY_SIGNALS: SignalCounts = { boom: 0, hold: 0, bust: 0, total: 0 };

const PLACEHOLDER_TRADES: IncomingTrade[] = [
  { id: '1', playerId: '6794', playerName: 'Justin Jefferson', leagueName: 'Dynasty 1QB', managerHandle: '@AlphaManager', dynastyEdge: 18.4, status: 'NEW', tfoScore: 94.7 },
  { id: '2', playerId: '10229', playerName: 'Bijan Robinson', leagueName: 'Redraft Main', managerHandle: '@BetaManager', dynastyEdge: 12.7, status: 'PENDING', tfoScore: 76 },
];

export default function DashboardClient({ data }: { data: DashboardRotationData }) {
  const { leagues, portfolio, tradeTargets, overvalued } = data;

  const [mode, setMode] = useState<DashboardMode>('rotate');
  const [rotIndex, setRotIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROTATE_SECONDS);

  // Rotation timer — only runs in ROTATE mode. Restarts on each league change.
  useEffect(() => {
    if (mode !== 'rotate' || leagues.length === 0) return;
    setSecondsLeft(ROTATE_SECONDS);
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRotIndex((i) => (i + 1) % leagues.length);
          return ROTATE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [mode, rotIndex, leagues.length]);

  // Default to ROTATE; if there are no leagues, fall back to ALL.
  const effectiveMode: DashboardMode = leagues.length === 0 ? 'all' : mode;
  const isAll = effectiveMode === 'all';

  const currentLeague = useMemo(() => {
    if (isAll) return null;
    if (effectiveMode === 'rotate') return leagues[rotIndex] ?? leagues[0] ?? null;
    return leagues.find((l) => l.id === effectiveMode) ?? null;
  }, [isAll, effectiveMode, leagues, rotIndex]);

  const players = isAll ? portfolio.players : currentLeague?.players ?? [];
  const teamTfo = isAll ? portfolio.teamTfo : currentLeague?.teamTfo ?? 0;
  const signals = isAll ? portfolio.signalCounts : currentLeague?.signalCounts ?? EMPTY_SIGNALS;
  const playersRostered = isAll ? portfolio.playersRostered : players.length;
  const contextLabel = isAll ? 'All Leagues' : currentLeague?.name ?? '—';
  const dynastyEdge = Math.max(0, teamTfo - 70);
  const empireRating = empireRatingFromTfo(teamTfo);

  const cards = players.slice(0, CARD_LIMIT);

  return (
    <>
      <DashboardTopBar
        leagueCount={leagues.length}
        playersRostered={playersRostered}
        tradeOffers={PLACEHOLDER_TRADES.length}
        dynastyEdge={dynastyEdge}
        empireRating={empireRating}
        contextLabel={contextLabel}
      />

      <div
        className="col-start-2 row-start-2 min-h-0 overflow-hidden"
        style={{ display: 'grid', gridTemplateColumns: '1fr 288px', minWidth: 0 }}
      >
        <div className="flex min-w-0 flex-col gap-[9px] overflow-hidden p-[11px_13px]">
          <ModeToggleBar leagues={leagues} mode={effectiveMode} onSelect={setMode} />

          <LeagueRotationHeader
            league={currentLeague}
            mode={effectiveMode}
            secondsLeft={secondsLeft}
            leagueCount={leagues.length}
          />

          <PlayerTicker players={players} animated={!isAll} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-figtree text-[11.5px] font-semibold uppercase tracking-[1.5px] text-text">
                {isAll ? 'Portfolio Boom/Bust Players' : 'League Boom/Bust Players'}
              </span>
              <Link href="/players" className="font-mono text-[9px] text-boom no-underline">
                View All Players →
              </Link>
            </div>
            {cards.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {cards.map((p) => (
                  <div key={p.playerId} className="w-[185px] shrink-0">
                    <PlayerCard
                      playerId={p.playerId}
                      playerName={p.name}
                      position={p.position}
                      team={p.team}
                      tfoScore={p.tfoScore > 0 ? p.tfoScore : 50}
                      radarVals={deriveRadarVals(p.playerId, p.tfoScore > 0 ? p.tfoScore : 50)}
                      tier={getTier(p.tfoScore > 0 ? p.tfoScore : 50)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[120px] items-center justify-center rounded-[9px] border border-border bg-surface font-mono text-[11px] text-muted">
                No rostered players synced yet — run a league sync to populate your board.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 9 }}>
            <TradeTargetsTable targets={tradeTargets} />
            <div className="flex min-h-0 flex-col gap-[9px]">
              <DynastyNewsFeed />
              <IncomingTrades trades={PLACEHOLDER_TRADES} viewAllCount={24} />
            </div>
          </div>
        </div>

        <RightPanel signals={signals} exposureWarnings={[]} overvalued={overvalued} />
      </div>

      <Footer
        leagueCount={leagues.length}
        edgeOpportunities={tradeTargets.length > 0 ? tradeTargets.length + 19 : 27}
      />
    </>
  );
}
