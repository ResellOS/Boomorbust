'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import OffseasonContextBanner from '@/components/startsit/OffseasonContextBanner';
import CountUpNumber from './weekly/CountUpNumber';
import type {
  DecisionsSummary,
  HighConfidenceAlerts,
  LineupOptimizer,
  SeasonRecord,
  StartSitRecommendation,
  StartSitTopbar,
  WeekContext,
} from '@/lib/startsit/types';
import {
  benchRegretRisks,
  boomCandidates,
  buildDecisionQueue,
  buildLeagueMatchup,
  buildLineupSlots,
  buildPortfolioSummary,
  buildPreviewDecisionCards,
  buildWeeklyCompletion,
  bustRisks,
  recMapFromList,
} from '@/lib/startsit/buildWeeklyDecisionsView';
import DecisionQueue from './weekly/DecisionQueue';
import MatchupBox from './weekly/MatchupBox';
import ProjectedLineupField from './weekly/ProjectedLineupField';
import WhyBobPanel from './weekly/WhyBobPanel';
import WeeklySidePanels from './weekly/WeeklySidePanels';
import WeeklyCompletionCard from './weekly/WeeklyCompletionCard';

const DISMISSED_KEY = 'bob_startsit_dismissed';
const ACCEPTED_KEY = 'bob_startsit_accepted';

function loadIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

interface WeeklyDecisionsClientProps {
  nflWeek: number;
  isOffseason: boolean;
  leagues: { id: string; name: string }[];
  initialLeagueId?: string;
  seasonRecord: SeasonRecord;
  decisions: import('@/lib/startsit/types').LineupDecision[];
  decisionsSummary: DecisionsSummary;
  lineupOptimizer: LineupOptimizer;
  hasRealData: boolean;
  allRecommendations: StartSitRecommendation[];
  alerts: HighConfidenceAlerts;
  rosterByLeague: Record<string, string[]>;
  weekContext: WeekContext;
  topbar: StartSitTopbar;
  leagueCount: number;
}

export default function WeeklyDecisionsClient({
  nflWeek,
  isOffseason,
  leagues,
  initialLeagueId,
  seasonRecord,
  decisions: initialDecisions,
  decisionsSummary,
  lineupOptimizer,
  hasRealData,
  allRecommendations,
  alerts,
  rosterByLeague,
  weekContext,
  topbar,
  leagueCount,
}: WeeklyDecisionsClientProps) {
  const router = useRouter();
  const preseason = isOffseason || nflWeek === 0;
  const [week, setWeek] = useState(nflWeek);
  const [leagueId, setLeagueId] = useState(initialLeagueId ?? 'all');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(() => loadIdSet(ACCEPTED_KEY));
  const [ignored, setIgnored] = useState<Set<string>>(() => loadIdSet(DISMISSED_KEY));

  const isPortfolio = leagueId === 'all';
  const isPreview = preseason || !hasRealData;

  const recMap = useMemo(() => recMapFromList(allRecommendations), [allRecommendations]);

  const filteredDecisions = useMemo(
    () =>
      isPortfolio
        ? initialDecisions
        : initialDecisions.filter((d) => d.leagueId === leagueId),
    [initialDecisions, leagueId, isPortfolio],
  );

  const decisionCards = useMemo(() => {
    let cards = buildDecisionQueue(
      filteredDecisions,
      alerts,
      weekContext.weatherImpact,
      isPreview,
    );
    if (cards.length === 0 && isPreview) {
      cards = buildPreviewDecisionCards(leagues);
    }
    return cards;
  }, [filteredDecisions, alerts, weekContext.weatherImpact, isPreview, leagues]);

  const selectedCard = useMemo(
    () => decisionCards.find((c) => c.id === selectedDecisionId) ?? decisionCards[0] ?? null,
    [decisionCards, selectedDecisionId],
  );

  const completion = useMemo(
    () => buildWeeklyCompletion(leagueCount, decisionCards, accepted, ignored),
    [leagueCount, decisionCards, accepted, ignored],
  );

  const matchup = useMemo(() => {
    if (isPortfolio) return null;
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return null;
    return buildLeagueMatchup(leagueId, league.name, week, rosterByLeague, recMap);
  }, [isPortfolio, leagueId, leagues, week, rosterByLeague, recMap]);

  const portfolioSummary = useMemo(() => {
    if (!isPortfolio) return null;
    return buildPortfolioSummary(
      rosterByLeague,
      lineupOptimizer,
      initialDecisions,
      recMap,
      leagueCount,
    );
  }, [isPortfolio, rosterByLeague, lineupOptimizer, initialDecisions, recMap, leagueCount]);

  const lineup = useMemo(() => {
    if (isPortfolio) {
      const firstLeague = leagues[0]?.id;
      if (!firstLeague) return { starters: [], bench: [] };
      return buildLineupSlots(firstLeague, rosterByLeague, recMap, filteredDecisions);
    }
    return buildLineupSlots(leagueId, rosterByLeague, recMap, filteredDecisions);
  }, [isPortfolio, leagueId, leagues, rosterByLeague, recMap, filteredDecisions]);

  const filteredRecs = useMemo(() => {
    if (isPortfolio) return allRecommendations;
    return allRecommendations.filter((r) => r.leagueIds.includes(leagueId));
  }, [allRecommendations, leagueId, isPortfolio]);

  const pendingCount = decisionCards.filter(
    (c) => !ignored.has(c.id) && !accepted.has(c.id) && !c.isPreview,
  ).length;
  const notSyncedCount = accepted.size;

  const handleApprove = useCallback((id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIdSet(ACCEPTED_KEY, next);
      return next;
    });
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIdSet(DISMISSED_KEY, next);
      return next;
    });
  }, []);

  const handleApproveAll = useCallback(() => {
    const ids = decisionCards.filter((c) => !c.isPreview && !ignored.has(c.id)).map((c) => c.id);
    setAccepted((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveIdSet(ACCEPTED_KEY, next);
      return next;
    });
  }, [decisionCards, ignored]);

  const handleLeagueChange = (id: string) => {
    setLeagueId(id);
    setSelectedDecisionId(null);
    router.push(`/startsit?week=${week}${id !== 'all' ? `&league=${id}` : ''}`);
  };

  const handleWeekChange = (delta: number) => {
    const minWeek = preseason ? 0 : 1;
    const next = Math.min(18, Math.max(minWeek, week + delta));
    setWeek(next);
    router.push(`/startsit?week=${next}${leagueId !== 'all' ? `&league=${leagueId}` : ''}`);
  };

  const weeklyRisks = useMemo(() => {
    const risks: string[] = [];
    if (alerts.mustSit) risks.push(`Sit flag: ${alerts.mustSit.fullName}`);
    filteredDecisions
      .filter((d) => d.confidence < 62)
      .slice(0, 2)
      .forEach((d) => risks.push(`Low confidence: ${d.startPlayer.fullName}`));
    return risks;
  }, [alerts, filteredDecisions]);

  const displayLeagueName = isPortfolio
    ? 'Portfolio Preview'
    : leagues.find((l) => l.id === leagueId)?.name ?? 'League';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header + league selector */}
      <div className="shrink-0 border-b border-border px-3 py-2 md:px-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-mono text-[18px] uppercase tracking-[-0.5px] text-text md:text-[22px]">
              Weekly Decisions
            </div>
            <div className="font-mono text-[10px] text-muted">
              Game day command center — approve lineup calls before kickoff
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-[5px] border border-border bg-surface2">
              <button
                type="button"
                onClick={() => handleWeekChange(-1)}
                className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-muted hover:text-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="flex h-7 items-center border-x border-border px-2.5 font-mono text-[11px] text-text">
                {preseason ? 'Preseason' : `Week ${week}`}
              </span>
              <button
                type="button"
                onClick={() => handleWeekChange(1)}
                className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-muted hover:text-text"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              className="hidden rounded border border-[#7c3aed]/50 bg-[#7c3aed]/15 px-3 py-1.5 font-mono text-[9px] uppercase text-[#A78BFA] sm:inline-block"
            >
              Sync Lineup
              {notSyncedCount > 0 && (
                <span className="ml-1 text-hold">({notSyncedCount} not synced)</span>
              )}
            </button>
          </div>
        </div>

        {/* League pill bar */}
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleLeagueChange('all')}
            className={`shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] transition-colors ${
              isPortfolio
                ? 'border-boom bg-boom/15 text-boom'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            ALL LEAGUES
          </button>
          {leagues.map((lg) => (
            <button
              key={lg.id}
              type="button"
              onClick={() => handleLeagueChange(lg.id)}
              className={`shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] transition-colors ${
                leagueId === lg.id
                  ? 'border-boom bg-boom/15 font-semibold text-boom'
                  : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              {lg.name}
            </button>
          ))}
        </div>

        {/* Contextual stats strip */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {isPortfolio ? (
            <>
              <StatCell label="Projected Wins" value="—" sub="Week 1 tracking" />
              <StatCell
                label="Total Projected"
                value={
                  portfolioSummary ? (
                    <CountUpNumber
                      value={portfolioSummary.totalProjectedPoints}
                      resetKey={`port-${leagueId}`}
                      decimals={1}
                    />
                  ) : (
                    '—'
                  )
                }
                sub="Across active leagues"
              />
              <StatCell
                label="Expected Gain"
                value={`+${decisionsSummary.expectedGain.toFixed(1)}`}
                sub="If all calls followed"
              />
              <StatCell
                label="High Impact"
                value={String(decisionsSummary.high)}
                sub="Decisions flagged"
              />
              <StatCell
                label="Portfolio Confidence"
                value={preseason ? 'Preseason' : `${topbar.avgConfidence}%`}
                sub="Model consensus"
              />
              <StatCell label="Decisions Remaining" value={String(pendingCount)} sub="To approve" />
            </>
          ) : (
            <>
              <StatCell
                label="Record"
                value={
                  seasonRecord.totalDecisions > 0
                    ? `${seasonRecord.wins}-${seasonRecord.losses}`
                    : '—'
                }
                sub={preseason ? 'Tracking Week 1' : 'Season record'}
              />
              <StatCell
                label="Projected Score"
                value={
                  matchup ? (
                    <CountUpNumber
                      value={matchup.yourProjected}
                      resetKey={`score-${leagueId}`}
                      decimals={1}
                    />
                  ) : (
                    '—'
                  )
                }
                sub="Your lineup"
              />
              <StatCell label="Win Probability" value="—" sub="Opponent syncing" />
              <StatCell
                label="Confidence"
                value={preseason ? 'Preseason' : `${topbar.avgConfidence}%`}
                sub="Lineup confidence"
              />
              <StatCell label="Decisions Remaining" value={String(pendingCount)} sub="High impact" />
              <StatCell
                label="Last Updated"
                value={topbar.lastUpdatedMinutes <= 0 ? 'Now' : `${topbar.lastUpdatedMinutes}m`}
                sub="Data sync"
              />
            </>
          )}
        </div>
      </div>

      <OffseasonContextBanner isOffseason={preseason} />

      {/* 3-column command center */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 md:px-[18px] md:py-3 [scrollbar-width:thin]">
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Col 1 — Decision queue + completion */}
          <div className="flex flex-col gap-2 lg:col-span-3 lg:max-h-[calc(100vh-220px)] lg:overflow-hidden">
            <DecisionQueue
              cards={decisionCards}
              selectedId={selectedCard?.id ?? null}
              approvedIds={accepted}
              ignoredIds={ignored}
              showLeagueLabels={isPortfolio}
              onSelect={(c) => {
                setSelectedDecisionId(c.id);
                if (c.playerId) setSelectedPlayerId(c.playerId);
              }}
              onApprove={handleApprove}
              onDismiss={handleDismiss}
            />
            <WeeklyCompletionCard completion={completion} />
          </div>

          {/* Col 2 — Matchup + lineup + why */}
          <div className="space-y-2 lg:col-span-5">
            <MatchupBox
              mode={isPortfolio ? 'portfolio' : 'league'}
              matchup={matchup}
              portfolio={portfolioSummary}
              fadeKey={leagueId}
            />
            {!isPortfolio && (
              <ProjectedLineupField
                starters={lineup.starters}
                bench={lineup.bench}
                selectedPlayerId={selectedPlayerId}
                leagueName={displayLeagueName}
                onSelectPlayer={setSelectedPlayerId}
                onApproveAll={handleApproveAll}
                notSyncedCount={notSyncedCount}
                isPreview={isPreview}
              />
            )}
            {isPortfolio && (
              <div className="rounded-md border border-border bg-surface2/40 p-3 font-mono text-[10px] text-muted">
                Select a league to view projected lineup field. Portfolio mode shows decisions
                across all {leagueCount} leagues.
              </div>
            )}
            <WhyBobPanel card={selectedCard} />
          </div>

          {/* Col 3 — Side panels */}
          <div className="lg:col-span-4">
            <WeeklySidePanels
              boom={boomCandidates(filteredRecs)}
              bust={bustRisks(filteredRecs)}
              weeklyRisks={weeklyRisks}
              waiverAdd={alerts.sleeperPick}
              benchRegret={benchRegretRisks(filteredDecisions)}
              weatherImpact={weekContext.weatherImpact}
              onSelectPlayer={(id) => {
                setSelectedPlayerId(id);
                router.push(`/players?player=${id}`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded border border-border/60 bg-surface2/30 px-2 py-1.5">
      <div className="font-mono text-[7px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-[14px] text-text">{value}</div>
      <div className="font-mono text-[8px] text-muted">{sub}</div>
    </div>
  );
}
