'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardRotationData } from '@/lib/dashboard/rotation';
import { empireRatingFromTfo } from '@/lib/dashboard/rotation';
import { empireRatingDelta } from '@/lib/dashboard/empireRating';
import { computeDynastyGps } from '@/lib/dashboard/dynastyGps';
import { computePortfolioExposure } from '@/lib/dashboard/portfolioExposure';
import { computeLeagueCounts } from '@/lib/dashboard/leagueCounts';
import { computeLeagueIntel } from '@/lib/dashboard/leagueIntel';
import {
  breakdownForContext,
  computeRosterConstructionGrades,
} from '@/lib/dashboard/rosterConstruction';
import { buildOpportunityFeed } from '@/lib/dashboard/opportunityFeed';
import { buildMissionCards } from '@/lib/dashboard/missionTasks';
import { LEAGUE_ROTATE_SECONDS } from '@/lib/dashboard/constants';
import DashboardKeyboardShortcuts from './DashboardKeyboardShortcuts';
import DashboardTopBar from './DashboardTopBar';
import ModeToggleBar, { type DashboardMode } from './ModeToggleBar';
import ViewModeToggle, { type DashboardViewMode } from './ViewModeToggle';
import LeagueRotationHeader from './LeagueRotationHeader';
import PageBriefingHeader from './PageBriefingHeader';
import LiveScoreTicker from './LiveScoreTicker';
import TodayTopPriority from './TodayTopPriority';
import FrontOfficeTasks from './FrontOfficeTasks';
import DynastyGpsCard from './DynastyGpsCard';
import OpportunityFeed from './OpportunityFeed';
import MarketSignalsCompact from './MarketSignalsCompact';
import RosterConstruction from './RosterConstruction';
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

  const contextLeagueId = currentLeague?.id;

  const players = useMemo(
    () => (isAll ? portfolio.players : currentLeague?.players ?? []),
    [isAll, portfolio.players, currentLeague?.players],
  );

  const scopedTradeTargets = useMemo(
    () =>
      isAll || !contextLeagueId
        ? tradeTargets
        : tradeTargets.filter((t) => t.leagueId === contextLeagueId),
    [isAll, contextLeagueId, tradeTargets],
  );

  const scopedTasks = useMemo(() => {
    if (isAll || !currentLeague) return dailyTasks;
    return dailyTasks.filter((t) => {
      const raw = t.taskData as { league_id?: string; league_name?: string };
      return raw.league_id === currentLeague.id || raw.league_name === currentLeague.name;
    });
  }, [isAll, currentLeague, dailyTasks]);

  const scopedLineup = useMemo(() => {
    if (!lineupOpportunity) return null;
    if (isAll) return lineupOpportunity;
    return lineupOpportunity.leagueId === contextLeagueId ? lineupOpportunity : null;
  }, [lineupOpportunity, isAll, contextLeagueId]);

  const ownedInLeagueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lg of leagues) {
      for (const p of lg.players) ids.add(p.playerId);
    }
    return ids;
  }, [leagues]);

  const empireRating = empireRatingFromTfo(
    isAll ? portfolio.teamTfo : currentLeague?.teamTfo ?? portfolio.teamTfo,
  );
  const empireDelta = empireRatingDelta(empireRating, lastEmpireRating);
  const contextLabel = isAll ? 'All Leagues' : currentLeague?.name ?? '—';
  const viewMode: DashboardViewMode = isAll ? 'global' : 'league';
  const viewSubtitle = isAll ? 'Portfolio command center' : 'League war room';

  const handleViewMode = (next: DashboardViewMode) => {
    if (next === 'global') {
      setMode('all');
      return;
    }
    if (mode === 'all' && leagues.length > 0) {
      setMode(leagues[0]!.id);
    }
  };

  const handleLeagueView = () => {
    if (mode === 'all' && leagues.length > 0) {
      setMode(leagues[0]!.id);
    }
  };

  const leagueSwitchKey = `${effectiveMode}-${contextLeagueId ?? 'all'}`;

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

  const breakdown = useMemo(
    () => breakdownForContext(portfolio, currentLeague),
    [portfolio, currentLeague],
  );

  const rosterGrades = useMemo(
    () => computeRosterConstructionGrades(breakdown, portfolio),
    [breakdown, portfolio],
  );

  const exposure = useMemo(
    () => computePortfolioExposure(rosterMap, portfolio.players, scopedTradeTargets),
    [rosterMap, portfolio.players, scopedTradeTargets],
  );

  const leagueIntel = useMemo(
    () => computeLeagueIntel(currentLeague, leagues, scopedTasks, incomingTrades, scopedTradeTargets),
    [currentLeague, leagues, scopedTasks, incomingTrades, scopedTradeTargets],
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

  const opportunityItems = useMemo(
    () =>
      buildOpportunityFeed({
        lineupOpportunity: scopedLineup,
        players,
        tradeTargets: scopedTradeTargets,
      }),
    [scopedLineup, players, scopedTradeTargets],
  );

  const fallbackFeedItem = opportunityItems[0] ?? null;
  const pendingOffers = incomingTrades.filter((t) => t.status === 'PENDING' || t.status === 'NEW').length;
  const todaysPriorities = buildMissionCards(scopedTasks, scopedLineup, 3).length;
  const leagueIntelHref = currentLeague ? `/leagues/${currentLeague.id}` : '/leagues';

  return (
    <>
      <DashboardKeyboardShortcuts
        onGlobalView={() => handleViewMode('global')}
        onLeagueView={handleLeagueView}
      />

      <DashboardTopBar
        leagueCount={leagues.length}
        tradeOffers={incomingTrades.length}
        pendingOffers={pendingOffers}
        todaysPriorities={todaysPriorities}
        portfolioStrength={empireRating}
        portfolioDelta={empireDelta}
        strengthLabel={gps.strengthLabel}
        strengthDisplay={gps.strengthValue}
      />

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden lg:col-start-2 lg:grid lg:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden p-[11px_13px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LiveScoreTicker inSeason={nflSeason.inSeason} />

          <PageBriefingHeader contextLabel={contextLabel} isAll={isAll} viewSubtitle={viewSubtitle} />

          <ViewModeToggle mode={viewMode} onChange={handleViewMode} leagueName={currentLeague?.name} />

          <ModeToggleBar leagues={leagues} mode={effectiveMode} onSelect={setMode} />

          <LeagueRotationHeader
            league={currentLeague}
            mode={effectiveMode}
            secondsLeft={secondsLeft}
            rotateSeconds={LEAGUE_ROTATE_SECONDS}
            leagueCount={leagues.length}
          />

          <div key={leagueSwitchKey} className="dash-league-switch-enter flex flex-col gap-3">
            <TodayTopPriority
              tasks={scopedTasks}
              tradeTargets={scopedTradeTargets}
              lineupOpportunity={scopedLineup}
              fallbackFeedItem={fallbackFeedItem}
            />

            <FrontOfficeTasks initialTasks={scopedTasks} lineupOpportunity={scopedLineup} />

            {/* Opportunity Feed promoted above the context cards */}
            <OpportunityFeed
              lineupOpportunity={scopedLineup}
              players={players}
              tradeTargets={scopedTradeTargets}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Mispriced Assets — capped at 3 */}
              <MarketSignalsCompact
                players={players}
                leagueCounts={leagueCounts}
                isAll={isAll}
                currentLeague={currentLeague}
                ownedInLeagueIds={ownedInLeagueIds}
                tradeTargets={scopedTradeTargets}
              />
              {/* Dynasty GPS — collapsed to summary; full GPS via card link */}
              <DynastyGpsCard data={gps} leagueId={contextLeagueId} summary />
              <RosterConstruction grades={rosterGrades} compact leagueId={contextLeagueId} />
            </div>

            {/* News moved to the bottom of the feed */}
            <DynastyNewsFeed
              items={filteredNews.length > 0 ? filteredNews : newsItems.slice(0, 4)}
              rosterPlayerIds={newsRosterIds}
              allMode={isAll}
            />
          </div>
        </div>

        <RightPanel
          mostExposed={exposure.mostExposed}
          leagueIntel={leagueIntel}
          leagueIntelHref={leagueIntelHref}
        />
      </div>

      <Footer
        leagueCount={leagues.length}
        edgeOpportunities={scopedTradeTargets.length > 0 ? scopedTradeTargets.length : 0}
      />
    </>
  );
}
