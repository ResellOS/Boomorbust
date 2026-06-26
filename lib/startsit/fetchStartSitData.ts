import { createAdminClient } from '@/lib/supabase/admin';
import {
  hasRealSubScoreData,
  normalizeVerdict,
  resolveSubScores,
  safeScore,
} from '@/lib/players/utils';
import { fetchLatestFormulaCalculatedAt } from '@/lib/formula/lastRescore';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';
import { matchupScore } from './matchupRankings';
import { buildStartSitWhyBullets, generateStartSitReasoning } from './reasoning';
import {
  buildFlexDecisionsFromRecs,
  buildLineupDecisions,
  buildLineupOptimizer,
  summarizeDecisions,
} from './buildDecisions';
import { dedupeStartSitLists } from './dedupeStartSit';
import type {
  FlexDecision,
  HighConfidenceAlerts,
  SeasonRecord,
  StartSitPageData,
  StartSitRecommendation,
  WeekRecord,
} from './types';
import {
  confidenceLevelLabel,
  effectiveRecommendationConfidence,
  estimateProjection,
  fetchWeekOpponents,
  isOffseasonWeek,
  isStartSitWindowOpen,
  isObviousSitCall,
  minutesAgo,
  nextLockDeadlineLabel,
  resolveNflWeek,
  sitConfidence,
} from './utils';

function collectRosterIds(row: {
  player_id?: string | null;
  player_ids?: string[] | null;
  players?: string[] | null;
}): string[] {
  const ids: string[] = [];
  if (row.player_id) ids.push(String(row.player_id));
  for (const pid of row.player_ids ?? []) {
    if (pid) ids.push(String(pid));
  }
  for (const pid of row.players ?? []) {
    if (pid) ids.push(String(pid));
  }
  return ids;
}

async function fetchWeekProjections(
  season: number,
  week: number,
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    try {
      const res = await fetch(
        `https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular&position[]=${pos}`,
        { cache: 'no-store' },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        player_id?: string;
        pts_ppr?: number;
        fpts?: number;
      }>;
      for (const item of data ?? []) {
        const pts = item.pts_ppr ?? item.fpts;
        if (item.player_id && typeof pts === 'number') map[item.player_id] = pts;
      }
    } catch {
      // continue
    }
  }
  return map;
}

function buildFlexDecisions(
  recs: StartSitRecommendation[],
): FlexDecision[] {
  return buildFlexDecisionsFromRecs(recs);
}

export async function fetchStartSitData(
  userId: string,
  sleeperUserId: string,
  selectedWeek?: number,
  selectedLeagueId?: string,
): Promise<StartSitPageData> {
  const { week: currentWeek, season } = await resolveNflWeek();
  const viewWeek = selectedWeek ?? currentWeek;
  const isOffseason = isOffseasonWeek(viewWeek);

  const empty: StartSitPageData = {
    leagues: [],
    topbar: {
      seasonRecord: '0-0-0',
      seasonWinRate: 0,
      thisWeekCalls: 0,
      decisionsToday: 0,
      expectedGain: 0,
      confidenceLevel: isOffseason ? 'Preseason' : 'Lean',
      avgConfidence: 0,
      lastUpdatedMinutes: 8,
    },
    weekContext: {
      nflWeek: viewWeek,
      season,
      windowOpen: isStartSitWindowOpen(),
      lockDeadline: nextLockDeadlineLabel(),
      weatherImpact: 'Low',
      isOffseason,
    },
    bobConfidence: 0,
    seasonRecord: { wins: 0, losses: 0, pushes: 0, winRate: 0, totalDecisions: 0 },
    weekRecord: { correct: 0, incorrect: 0, pending: 0, winRate: 0 },
    seasonSparkline: [],
    startThese: [],
    sitThese: [],
    decisions: [],
    decisionsSummary: {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      expectedGain: 0,
      potentialCost: 0,
    },
    lineupOptimizer: {
      grade: '—',
      currentLineupPts: 0,
      optimizedLineupPts: 0,
      potentialGain: 0,
      leagueCount: 0,
      changesRecommended: 0,
      totalPotentialGain: 0,
      leagueChanges: [],
    },
    flexDecisions: [],
    alerts: { mustStart: null, mustSit: null, sleeperPick: null },
    allRecommendations: [],
    leagueCount: 0,
    hasRealData: false,
    rosterByLeague: {},
  };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[startsit] createAdminClient failed:', err);
    return empty;
  }

  let leagueList: StartSitPageData['leagues'] = [];
  try {
    // leagues are keyed by the Supabase auth uid (user_id). The table has no
    // owner_id or league_type columns — selecting/filtering them errors out.
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status')
      .eq('user_id', userId);
    if (error) throw error;
    leagueList = data ?? [];
  } catch (err) {
    console.error('[startsit] leagues fetch failed:', err);
  }

  const playerLeagues = new Map<string, string[]>();
  const leagueRosters = new Map<string, string[]>();
  try {
    // rosters.owner_id stores the Sleeper user id; players (text[]) is the only
    // player column — player_id/player_ids don't exist and error the query.
    let query = supabase
      .from('rosters')
      .select('league_id, players')
      .eq('owner_id', sleeperUserId);
    if (selectedLeagueId && selectedLeagueId !== 'all') {
      query = query.eq('league_id', selectedLeagueId);
    }
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data ?? []) {
      const leagueId = String(row.league_id);
      if (!leagueRosters.has(leagueId)) leagueRosters.set(leagueId, []);
      const rosterPids = leagueRosters.get(leagueId)!;
      for (const pid of collectRosterIds(row)) {
        if (!playerLeagues.has(pid)) playerLeagues.set(pid, []);
        const arr = playerLeagues.get(pid)!;
        if (!arr.includes(leagueId)) arr.push(leagueId);
        if (!rosterPids.includes(pid)) rosterPids.push(pid);
      }
    }
  } catch (err) {
    console.error('[startsit] rosters fetch failed:', err);
  }

  const playerIds = Array.from(playerLeagues.keys());
  const totalLeagues = selectedLeagueId && selectedLeagueId !== 'all' ? 1 : leagueList.length;

  const opponents = await fetchWeekOpponents(season, viewWeek);
  const projections = await fetchWeekProjections(season, viewWeek);
  const lastUpdated = await fetchLatestFormulaCalculatedAt(supabase, 'dynasty');

  const tfoMap = new Map<
    string,
    {
      score: number;
      verdict: string | null;
      subScores: ReturnType<typeof resolveSubScores>;
      hasRealSubScores: boolean;
      calculatedAt: string | null;
      opsScore: number | null;
      sitScore: number | null;
      sfsScore: number | null;
      efficiencyRow: { iq?: number | null; ffig?: number | null; sit_score?: number | null };
    }
  >();

  if (playerIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('formula_scores')
        .select(
          'player_id, tfo_score, verdict, calculated_at, ops_score, sfs_score, yoysi_score, sit_score, opportunity, situation, age_curve, iq, upside, ops, sfs, ffig, sit',
        )
        .eq('scoring_context', 'dynasty')
        .in('player_id', playerIds)
        .order('calculated_at', { ascending: false });
      if (error) throw error;
      for (const row of data ?? []) {
        const pid = String(row.player_id);
        if (tfoMap.has(pid)) continue;
        const score = safeScore(row.tfo_score);
        tfoMap.set(pid, {
          score,
          verdict: row.verdict ?? null,
          subScores: resolveSubScores(
            row as unknown as Parameters<typeof resolveSubScores>[0],
            pid,
            score > 0 ? score : 50,
          ),
          hasRealSubScores: hasRealSubScoreData(
            row as unknown as Parameters<typeof hasRealSubScoreData>[0],
          ),
          calculatedAt: row.calculated_at ?? null,
          opsScore:
            typeof row.ops_score === 'number' && Number.isFinite(row.ops_score)
              ? row.ops_score
              : null,
          sitScore:
            typeof row.sit_score === 'number' && Number.isFinite(row.sit_score)
              ? row.sit_score
              : null,
          sfsScore:
            typeof row.sfs_score === 'number' && Number.isFinite(row.sfs_score)
              ? row.sfs_score
              : null,
          efficiencyRow: {
            iq: row.iq ?? null,
            ffig: row.ffig ?? null,
            sit_score: row.sit_score ?? null,
          },
        });
      }
    } catch (err) {
      console.error('[startsit] tfo_cache fetch failed:', err);
    }
  }

  let marketVerdicts = new Map<string, { rankDelta: number | null }>();
  try {
    marketVerdicts = await fetchMarketVerdicts(supabase, 'dynasty');
  } catch (err) {
    console.error('[startsit] market verdicts fetch failed:', err);
  }

  const playerMeta = new Map<
    string,
    { full_name: string; position: string; team: string; injury_status: string | null }
  >();
  if (playerIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, team, injury_status')
        .in('id', playerIds);
      if (error) throw error;
      for (const p of data ?? []) {
        playerMeta.set(String(p.id), {
          full_name: p.full_name ?? 'Unknown Player',
          position: (p.position ?? 'WR').toUpperCase(),
          team: p.team ?? 'FA',
          injury_status: p.injury_status ?? null,
        });
      }
    } catch (err) {
      console.error('[startsit] players fetch failed:', err);
    }
  }

  const recommendations: StartSitRecommendation[] = [];

  for (const pid of playerIds) {
    const meta = playerMeta.get(pid);
    const tfo = tfoMap.get(pid);
    const rawTfo = tfo?.score ?? 0;
    if (rawTfo <= 0) continue;

    const tfoScore = rawTfo;
    const team = meta?.team ?? 'FA';
    const position = meta?.position ?? 'WR';
    const opponent = opponents[team] ?? 'TBD';
    const mScore = matchupScore(opponent.replace('@', ''), position);
    const startScore = Math.round(tfoScore * 0.6 + mScore * 0.4);
    const leagueIds = playerLeagues.get(pid) ?? [];
    const ownershipPct =
      totalLeagues > 0 ? Math.round((leagueIds.length / totalLeagues) * 100) : 0;

    const proj =
      projections[pid] ??
      (tfoScore > 0 ? estimateProjection(tfoScore, position) : null);

    const rankDelta = marketVerdicts.get(pid)?.rankDelta ?? null;
    const subScores = tfo?.subScores ?? resolveSubScores({}, pid, tfoScore);
    const hasRealSubScores = tfo?.hasRealSubScores ?? false;
    const injuryStatus = meta?.injury_status ?? null;

    const whyBullets = buildStartSitWhyBullets({
      variant: startScore >= 50 ? 'start' : 'sit',
      opsScore: tfo?.opsScore,
      sitScore: tfo?.sitScore,
      sfsScore: tfo?.sfsScore,
      rankDelta,
      opponent,
      position,
      hasRealSubScores,
      subScores,
      efficiencyRow: tfo?.efficiencyRow,
    });

    recommendations.push({
      playerId: pid,
      fullName: meta?.full_name ?? 'Unknown Player',
      position,
      team,
      opponent,
      startScore,
      confidence: Math.round(startScore),
      barScore: startScore,
      projectedPoints: proj,
      reasoning: generateStartSitReasoning(
        subScores,
        opponent,
        position,
        team,
        startScore,
        {
          hasRealSubScores,
          efficiencyRow: tfo?.efficiencyRow,
        },
      ),
      whyBullets,
      obviousCall: isObviousSitCall(startScore, injuryStatus),
      tfoScore,
      verdict: normalizeVerdict(tfo?.verdict, tfoScore),
      leagueIds,
      ownershipPct,
    });
  }

  recommendations.sort((a, b) => b.startScore - a.startScore);

  const leagueNames = new Map(leagueList.map((l) => [l.id, l.name]));
  const recById = new Map(recommendations.map((r) => [r.playerId, r]));
  const decisions = buildLineupDecisions(leagueRosters, leagueNames, recById);
  const decisionsSummary = summarizeDecisions(decisions);
  const lineupOptimizer = buildLineupOptimizer(decisions, leagueRosters, recById);
  const hasRealData = recommendations.length > 0 && decisions.length > 0;

  const startTheseRaw = recommendations.slice(0, 8).map((r) => {
    const tfo = tfoMap.get(r.playerId);
    return {
      ...r,
      confidence: Math.round(r.startScore),
      barScore: r.startScore,
      whyBullets: buildStartSitWhyBullets({
        variant: 'start',
        opsScore: tfo?.opsScore,
        sitScore: tfo?.sitScore,
        sfsScore: tfo?.sfsScore,
        rankDelta: marketVerdicts.get(r.playerId)?.rankDelta ?? null,
        opponent: r.opponent,
        position: r.position,
        hasRealSubScores: tfo?.hasRealSubScores ?? false,
        subScores: tfo?.subScores ?? resolveSubScores({}, r.playerId, r.tfoScore),
        efficiencyRow: tfo?.efficiencyRow,
      }),
    };
  });

  const sitCandidates = recommendations
    .filter((r) => r.startScore < 50)
    .sort((a, b) => a.startScore - b.startScore);
  const sitTheseRaw = (sitCandidates.length >= 8
    ? sitCandidates.slice(0, 8)
    : [...recommendations].sort((a, b) => a.startScore - b.startScore).slice(0, 8)
  ).map((r) => {
    const obvious = r.obviousCall ?? isObviousSitCall(r.startScore, null);
    const conf = sitConfidence(r.startScore, obvious);
    return {
      ...r,
      confidence: conf,
      barScore: conf,
      obviousCall: obvious,
      whyBullets: buildStartSitWhyBullets({
        variant: 'sit',
        opsScore: tfoMap.get(r.playerId)?.opsScore,
        sitScore: tfoMap.get(r.playerId)?.sitScore,
        sfsScore: tfoMap.get(r.playerId)?.sfsScore,
        rankDelta: marketVerdicts.get(r.playerId)?.rankDelta ?? null,
        opponent: r.opponent,
        position: r.position,
        hasRealSubScores: tfoMap.get(r.playerId)?.hasRealSubScores ?? false,
        subScores: tfoMap.get(r.playerId)?.subScores ?? resolveSubScores({}, r.playerId, r.tfoScore),
        efficiencyRow: tfoMap.get(r.playerId)?.efficiencyRow,
      }),
    };
  });

  const { start: startThese, sit: sitThese } = dedupeStartSitLists(
    startTheseRaw,
    sitTheseRaw,
  );

  const flexDecisions = buildFlexDecisions(recommendations);

  const avgConf =
    recommendations.length > 0
      ? recommendations.reduce(
          (s, r) =>
            s +
            effectiveRecommendationConfidence(
              r,
              r.startScore < 50 ? 'sit' : 'start',
            ),
          0,
        ) / recommendations.length
      : 0;

  let seasonRecord: SeasonRecord = {
    wins: 0,
    losses: 0,
    pushes: 0,
    winRate: 0,
    totalDecisions: 0,
  };
  let weekRecord: WeekRecord = { correct: 0, incorrect: 0, pending: 0, winRate: 0 };
  let seasonSparkline: { week: number; winRate: number }[] = [];

  try {
    const { data, error } = await supabase
      .from('startsit_history')
      .select('week, result')
      .eq('user_id', userId)
      .eq('season', season);
    if (error) throw error;

    const rows = data ?? [];
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    const weekBuckets = new Map<number, { win: number; total: number }>();

    for (const row of rows) {
      const result = (row.result ?? '').toUpperCase();
      if (result === 'WIN') wins += 1;
      else if (result === 'LOSS') losses += 1;
      else if (result === 'PUSH') pushes += 1;

      const wk = Number(row.week);
      if (!weekBuckets.has(wk)) weekBuckets.set(wk, { win: 0, total: 0 });
      const b = weekBuckets.get(wk)!;
      if (result === 'WIN' || result === 'LOSS') {
        b.total += 1;
        if (result === 'WIN') b.win += 1;
      }
    }

    const decided = wins + losses;
    seasonRecord = {
      wins,
      losses,
      pushes,
      winRate: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0,
      totalDecisions: rows.length,
    };

    seasonSparkline = Array.from(weekBuckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, b]) => ({
        week,
        winRate: b.total > 0 ? Math.round((b.win / b.total) * 100) : 0,
      }));

    const weekRows = rows.filter((r) => Number(r.week) === viewWeek);
    let correct = 0;
    let incorrect = 0;
    let pending = 0;
    for (const row of weekRows) {
      const result = (row.result ?? '').toUpperCase();
      if (result === 'WIN') correct += 1;
      else if (result === 'LOSS') incorrect += 1;
      else pending += 1;
    }
    const weekDecided = correct + incorrect;
    weekRecord = {
      correct,
      incorrect,
      pending: pending || Math.max(0, recommendations.length - weekDecided),
      winRate: weekDecided > 0 ? Math.round((correct / weekDecided) * 100) : 0,
    };
  } catch (err) {
    console.error('[startsit] history fetch failed:', err);
    weekRecord.pending = recommendations.length;
  }

  const highConfDecisions = decisions.filter((d) => d.confidence >= 71);
  const mustStartDec =
    highConfDecisions.find((d) => d.variant === 'start') ?? highConfDecisions[0] ?? null;
  const mustSitDec =
    highConfDecisions.find((d) => d.variant === 'sit') ??
    decisions.find((d) => d.sitPlayer.obviousCall) ??
    null;

  const mustStart = mustStartDec
    ? {
        ...mustStartDec.startPlayer,
        confidence: mustStartDec.confidence,
        reasoning: mustStartDec.whyOneLine,
      }
    : recommendations.find((r) => r.startScore > 70) ?? null;

  const mustSit = mustSitDec
    ? {
        ...mustSitDec.sitPlayer,
        confidence: mustSitDec.confidence,
        reasoning: `Sit ${mustSitDec.sitPlayer.fullName} — start ${mustSitDec.startPlayer.fullName} instead`,
      }
    : null;

  const sleeperPick =
    recommendations.find((r) => r.startScore > 70 && r.ownershipPct < 50) ?? null;

  const alerts: HighConfidenceAlerts = {
    mustStart: mustStart
      ? {
          ...mustStart,
          reasoning: mustStart.reasoning || 'High-confidence start call',
        }
      : null,
    mustSit: mustSit
      ? {
          ...mustSit,
          reasoning: mustSit.reasoning || `Fade ${mustSit.fullName} this week`,
        }
      : null,
    sleeperPick: sleeperPick
      ? { ...sleeperPick, reasoning: 'Breakout game incoming' }
      : null,
  };

  return {
    leagues: leagueList,
    topbar: {
      seasonRecord: `${seasonRecord.wins}-${seasonRecord.losses}-${seasonRecord.pushes}`,
      seasonWinRate: seasonRecord.winRate,
      thisWeekCalls: decisionsSummary.total,
      decisionsToday: decisionsSummary.total,
      expectedGain: decisionsSummary.expectedGain,
      confidenceLevel: isOffseason ? 'Preseason' : confidenceLevelLabel(avgConf),
      avgConfidence: Math.round(avgConf),
      lastUpdatedMinutes: minutesAgo(lastUpdated ?? null),
    },
    weekContext: {
      nflWeek: viewWeek,
      season,
      windowOpen: isStartSitWindowOpen(),
      lockDeadline: nextLockDeadlineLabel(),
      weatherImpact: 'Low',
      isOffseason,
    },
    bobConfidence: Math.round(avgConf),
    seasonRecord,
    weekRecord,
    seasonSparkline,
    startThese,
    sitThese,
    decisions,
    decisionsSummary,
    lineupOptimizer,
    flexDecisions,
    alerts,
    allRecommendations: recommendations,
    leagueCount: leagueList.length,
    hasRealData,
    rosterByLeague: Object.fromEntries(leagueRosters),
  };
}
