'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardRotationData } from '@/lib/dashboard/rotation';
import { empireRatingFromTfo } from '@/lib/dashboard/rotation';
import { LEAGUE_ROTATE_SECONDS } from '@/lib/dashboard/constants';
import DashboardTopBar from './DashboardTopBar';
import ModeToggleBar, { type DashboardMode } from './ModeToggleBar';
import LeagueRotationHeader from './LeagueRotationHeader';
import LiveScoreTicker from './LiveScoreTicker';
import PlayerTicker from './PlayerTicker';
import PlayerCardCarousel from './PlayerCardCarousel';
import RightPanel from './RightPanel';
import TradeTargetsTable from './TradeTargetsTable';
import DynastyNewsFeed from './DynastyNewsFeed';
import IncomingTrades from './IncomingTrades';
import LineupOpportunityBanner from './LineupOpportunityBanner';
import Footer from './Footer';

export default function DashboardClient({ data }: { data: DashboardRotationData }) {
  const { leagues, portfolio, tradeTargets, overvalued, incomingTrades, newsItems, nflSeason } =
    data;

  const [mode, setMode] = useState<DashboardMode>('all');
  const [rotIndex, setRotIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(LEAGUE_ROTATE_SECONDS);

  useEffect(() => {
    if (mode !== 'rotate' || leagues.length === 0) return;
    setSecondsLeft(LEAGUE_ROTATE_SECONDS);
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRotIndex((i) => (i + 1) % leagues.length);
          return LEAGUE_ROTATE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [mode, rotIndex, leagues.length]);

  const effectiveMode: DashboardMode = leagues.length === 0 ? 'all' : mode;
  const isAll = effectiveMode === 'all';

  const currentLeague = useMemo(() => {
    if (isAll) return null;
    if (effectiveMode === 'rotate') return leagues[rotIndex] ?? leagues[0] ?? null;
    return leagues.find((l) => l.id === effectiveMode) ?? null;
  }, [isAll, effectiveMode, leagues, rotIndex]);

  const players = useMemo(
    () => (isAll ? portfolio.players : currentLeague?.players ?? []),
    [isAll, portfolio.players, currentLeague?.players],
  );
  const teamTfo = isAll ? portfolio.teamTfo : currentLeague?.teamTfo ?? 0;
  const breakdown = isAll
    ? portfolio.breakdown
    : currentLeague?.breakdown ?? portfolio.breakdown;
  const playersRostered = isAll ? portfolio.playersRostered : players.length;
  const contextLabel = isAll ? 'All Leagues' : currentLeague?.name ?? '—';
  const dynastyEdge = Math.max(0, teamTfo - 70);
  const empireRating = empireRatingFromTfo(teamTfo);

  // News scopes to EVERY player rostered in the selected league (all teams),
  // not just the user's roster. ALL mode shows general news (allMode handles it).
  const newsRosterIds = useMemo(() => {
    if (isAll || !currentLeague) return new Set<string>();
    return new Set(data.leagueRosteredIds[currentLeague.id] ?? []);
  }, [isAll, currentLeague, data.leagueRosteredIds]);

  const leagueIncoming = useMemo(() => {
    if (isAll) return incomingTrades;
    if (!currentLeague) return [];
    return incomingTrades.filter((t) => t.leagueId === currentLeague.id);
  }, [incomingTrades, currentLeague, isAll]);

  return (
    <>
      <DashboardTopBar
        leagueCount={leagues.length}
        playersRostered={playersRostered}
        tradeOffers={incomingTrades.length}
        dynastyEdge={dynastyEdge}
        empireRating={empireRating}
        contextLabel={contextLabel}
      />

      <div
        className="col-start-2 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ display: 'grid', gridTemplateColumns: '1fr 288px', minWidth: 0 }}
      >
        <div className="flex min-w-0 flex-col gap-[9px] overflow-hidden p-[11px_13px]">
          <LiveScoreTicker inSeason={nflSeason.inSeason} />

          <ModeToggleBar leagues={leagues} mode={effectiveMode} onSelect={setMode} />

          <LeagueRotationHeader
            league={currentLeague}
            mode={effectiveMode}
            secondsLeft={secondsLeft}
            rotateSeconds={LEAGUE_ROTATE_SECONDS}
            leagueCount={leagues.length}
          />

          <LineupOpportunityBanner opportunity={data.lineupOpportunity} />

          <PlayerTicker players={players} animated={!isAll} />

          <PlayerCardCarousel players={players} staticMode={isAll} />

          <div className="min-h-0 flex-1" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 9 }}>
            <TradeTargetsTable
              targets={tradeTargets}
              leagueId={currentLeague?.id}
            />
            <div className="flex min-h-0 flex-col gap-[9px]">
              <DynastyNewsFeed
                items={newsItems}
                rosterPlayerIds={newsRosterIds}
                allMode={isAll}
              />
              <IncomingTrades trades={leagueIncoming.length > 0 ? leagueIncoming : incomingTrades} />
            </div>
          </div>
        </div>

        <RightPanel breakdown={breakdown} exposureWarnings={[]} overvalued={overvalued} />
      </div>

      <Footer
        leagueCount={leagues.length}
        edgeOpportunities={tradeTargets.length > 0 ? tradeTargets.length + 19 : 27}
      />
    </>
  );
}
