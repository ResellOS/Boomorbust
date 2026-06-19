'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardRotationData } from '@/lib/dashboard/rotation';
import { empireRatingFromTfo } from '@/lib/dashboard/rotation';
import { empireRatingDelta } from '@/lib/dashboard/empireRating';
import { computeDynastyGps } from '@/lib/dashboard/dynastyGps';
import { computePortfolioExposure } from '@/lib/dashboard/portfolioExposure';
import { computeLeagueCounts } from '@/lib/dashboard/leagueCounts';
import { computeDashboardPortfolioOverview } from '@/lib/dashboard/portfolioOverview';
import { LEAGUE_ROTATE_SECONDS } from '@/lib/dashboard/constants';
import DashboardTopBar from './DashboardTopBar';
import ModeToggleBar, { type DashboardMode } from './ModeToggleBar';
import LeagueRotationHeader from './LeagueRotationHeader';
import LiveScoreTicker from './LiveScoreTicker';
import FrontOfficeCommandCenter from './FrontOfficeCommandCenter';
import DynastyGpsCard from './DynastyGpsCard';
import OpportunityFeed from './OpportunityFeed';
import MarketSignalsCompact from './MarketSignalsCompact';
import DashboardPortfolioOverview from './DashboardPortfolioOverview';
import DynastyNewsFeed from './DynastyNewsFeed';
import RightPanel from './RightPanel';
import Footer from './Footer';
import type { DailyTask } from '@/lib/dashboard/dailyTasks';

export default function DashboardClient({
  data,
  dailyTasks,
  lastEmpireRating,
}: {
  data: DashboardRotationData;
  dailyTasks: DailyTask[];
  lastEmpireRating: number | null;
}) {
  const {
    leagues,
    portfolio,
    tradeTargets,
    incomingTrades,
    newsItems,
    nflSeason,
    lineupOpportunity,
  } = data;

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
  const playersRostered = isAll ? portfolio.playersRostered : players.length;
  const empireRating = empireRatingFromTfo(data.portfolio.teamTfo);
  const empireDelta = empireRatingDelta(empireRating, lastEmpireRating);
  const dynastyEdge = Math.max(0, (isAll ? portfolio.teamTfo : currentLeague?.teamTfo ?? 0) - 70);
  const contextLabel = isAll ? 'All Leagues' : currentLeague?.name ?? '—';

  const gps = useMemo(
    () => computeDynastyGps(portfolio, leagues, currentLeague, empireRating),
    [portfolio, leagues, currentLeague, empireRating],
  );

  const rosterMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const lg of leagues) {
      map.set(
        lg.id,
        lg.players.map((p) => p.playerId),
      );
    }
    return map;
  }, [leagues]);

  const leagueCounts = useMemo(() => computeLeagueCounts(rosterMap), [rosterMap]);

  const portfolioOverview = useMemo(
    () => computeDashboardPortfolioOverview(portfolio, leagues),
    [portfolio, leagues],
  );

  const exposure = useMemo(
    () => computePortfolioExposure(rosterMap, portfolio.players, tradeTargets),
    [rosterMap, portfolio.players, tradeTargets],
  );

  const signalPlayerIds = useMemo(
    () => new Set(players.filter((p) => p.marketVerdict && !p.marketVerdict.noMarketData).map((p) => p.playerId)),
    [players],
  );

  const newsRosterIds = useMemo(() => {
    if (isAll) {
      return new Set(portfolio.players.map((p) => p.playerId));
    }
    if (!currentLeague) return new Set<string>();
    return new Set(data.leagueRosteredIds[currentLeague.id] ?? []);
  }, [isAll, currentLeague, data.leagueRosteredIds, portfolio.players]);

  const filteredNews = useMemo(() => {
    return newsItems.filter((item) => {
      if (!item.playerId) return false;
      if (newsRosterIds.has(item.playerId)) return true;
      if (signalPlayerIds.has(item.playerId)) return true;
      return false;
    });
  }, [newsItems, newsRosterIds, signalPlayerIds]);

  return (
    <>
      <DashboardTopBar
        leagueCount={leagues.length}
        playersRostered={playersRostered}
        tradeOffers={incomingTrades.length}
        dynastyEdge={dynastyEdge}
        portfolioStrength={empireRating}
        portfolioDelta={empireDelta}
        contextLabel={contextLabel}
      />

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden lg:col-start-2 lg:grid lg:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden p-[11px_13px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LiveScoreTicker inSeason={nflSeason.inSeason} />

          <ModeToggleBar leagues={leagues} mode={effectiveMode} onSelect={setMode} />

          <LeagueRotationHeader
            league={currentLeague}
            mode={effectiveMode}
            secondsLeft={secondsLeft}
            rotateSeconds={LEAGUE_ROTATE_SECONDS}
            leagueCount={leagues.length}
          />

          <FrontOfficeCommandCenter initialTasks={dailyTasks} lineupOpportunity={lineupOpportunity} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:min-h-[300px]">
            <DynastyGpsCard data={gps} />
            <OpportunityFeed
              lineupOpportunity={lineupOpportunity}
              players={players}
              tradeTargets={tradeTargets}
            />
            <MarketSignalsCompact players={players} leagueCounts={leagueCounts} />
          </div>

          <DashboardPortfolioOverview
            data={portfolioOverview}
            title={isAll ? 'Portfolio Overview (All Leagues)' : `Portfolio Overview · ${contextLabel}`}
          />

          <DynastyNewsFeed
            items={filteredNews.length > 0 ? filteredNews : newsItems.slice(0, 4)}
            rosterPlayerIds={newsRosterIds}
            allMode={isAll}
            title="Latest News"
          />
        </div>

        <RightPanel mostExposed={exposure.mostExposed} noExposure={exposure.noExposure} />
      </div>

      <Footer
        leagueCount={leagues.length}
        edgeOpportunities={tradeTargets.length > 0 ? tradeTargets.length + 19 : 27}
      />
    </>
  );
}
