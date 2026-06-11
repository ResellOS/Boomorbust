import { createAdminClient } from '@/lib/supabase/admin';
import {
  normalizeVerdict,
  resolveSubScores,
  safeScore,
} from '@/lib/players/utils';
import { matchupScore } from './matchupRankings';
import { generateStartSitReasoning } from './reasoning';
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
  estimateProjection,
  fetchWeekOpponents,
  isStartSitWindowOpen,
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
  const flexPool = recs.filter((r) => r.startScore >= 45 && r.startScore <= 65);
  const out: FlexDecision[] = [];

  for (const pos of ['RB', 'WR', 'TE'] as const) {
    const group = flexPool.filter((r) => r.position === pos);
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => b.startScore - a.startScore);
    const playerA = sorted[0];
    const playerB = sorted[1];
    const pick = playerA.startScore >= playerB.startScore ? playerA : playerB;
    const other = pick.playerId === playerA.playerId ? playerB : playerA;
    const edge = Math.round(Math.abs(playerA.startScore - playerB.startScore) * 10) / 10;

    out.push({
      position: pos,
      playerA,
      playerB,
      pick,
      pickNote: `${pick.fullName} has matchup edge over ${other.fullName}`,
      dynastyEdge: edge,
    });
  }

  return out;
}

export async function fetchStartSitData(
  userId: string,
  sleeperUserId: string,
  selectedWeek?: number,
  selectedLeagueId?: string,
): Promise<StartSitPageData> {
  const { week: currentWeek, season } = await resolveNflWeek();
  const viewWeek = selectedWeek ?? currentWeek;

  const empty: StartSitPageData = {
    leagues: [],
    topbar: {
      seasonRecord: '0-0-0',
      seasonWinRate: 0,
      thisWeekCalls: 0,
      confidenceLevel: 'Low',
      avgConfidence: 0,
      lastUpdatedMinutes: 8,
    },
    weekContext: {
      nflWeek: viewWeek,
      season,
      windowOpen: isStartSitWindowOpen(),
      lockDeadline: nextLockDeadlineLabel(),
      weatherImpact: 'Low',
    },
    bobConfidence: 0,
    seasonRecord: { wins: 0, losses: 0, pushes: 0, winRate: 0, totalDecisions: 0 },
    weekRecord: { correct: 0, incorrect: 0, pending: 0, winRate: 0 },
    seasonSparkline: [],
    startThese: [],
    sitThese: [],
    flexDecisions: [],
    alerts: { mustStart: null, mustSit: null, sleeperPick: null },
    allRecommendations: [],
    leagueCount: 0,
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
      for (const pid of collectRosterIds(row)) {
        if (!playerLeagues.has(pid)) playerLeagues.set(pid, []);
        const arr = playerLeagues.get(pid)!;
        if (!arr.includes(leagueId)) arr.push(leagueId);
      }
    }
  } catch (err) {
    console.error('[startsit] rosters fetch failed:', err);
  }

  const playerIds = Array.from(playerLeagues.keys());
  const totalLeagues = selectedLeagueId && selectedLeagueId !== 'all' ? 1 : leagueList.length;

  const opponents = await fetchWeekOpponents(season, viewWeek);
  const projections = await fetchWeekProjections(season, viewWeek);

  const tfoMap = new Map<
    string,
    {
      score: number;
      verdict: string | null;
      subScores: ReturnType<typeof resolveSubScores>;
      calculatedAt: string | null;
    }
  >();

  if (playerIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('formula_scores')
        .select('player_id, tfo_score, verdict, calculated_at')
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
          calculatedAt: row.calculated_at ?? null,
        });
      }
    } catch (err) {
      console.error('[startsit] tfo_cache fetch failed:', err);
    }
  }

  const playerMeta = new Map<
    string,
    { full_name: string; position: string; team: string }
  >();
  if (playerIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, team')
        .in('id', playerIds);
      if (error) throw error;
      for (const p of data ?? []) {
        playerMeta.set(String(p.id), {
          full_name: p.full_name ?? 'Unknown Player',
          position: (p.position ?? 'WR').toUpperCase(),
          team: p.team ?? 'FA',
        });
      }
    } catch (err) {
      console.error('[startsit] players fetch failed:', err);
    }
  }

  let lastUpdated: string | null = null;
  const recommendations: StartSitRecommendation[] = [];

  for (const pid of playerIds) {
    const meta = playerMeta.get(pid);
    const tfo = tfoMap.get(pid);
    const tfoScore = tfo?.score ?? 50;
    const team = meta?.team ?? 'FA';
    const position = meta?.position ?? 'WR';
    const opponent = opponents[team] ?? 'TBD';
    const mScore = matchupScore(opponent.replace('@', ''), position);
    const startScore = Math.round(tfoScore * 0.6 + mScore * 0.4);
    const leagueIds = playerLeagues.get(pid) ?? [];
    const ownershipPct =
      totalLeagues > 0 ? Math.round((leagueIds.length / totalLeagues) * 100) : 0;

    if (tfo?.calculatedAt && (!lastUpdated || tfo.calculatedAt > lastUpdated)) {
      lastUpdated = tfo.calculatedAt;
    }

    const proj =
      projections[pid] ?? estimateProjection(tfoScore, position);

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
        tfo?.subScores ?? resolveSubScores({}, pid, tfoScore),
        opponent,
        position,
        team,
        startScore,
      ),
      tfoScore,
      verdict: normalizeVerdict(tfo?.verdict, tfoScore),
      leagueIds,
      ownershipPct,
    });
  }

  recommendations.sort((a, b) => b.startScore - a.startScore);

  const startThese = recommendations.slice(0, 8).map((r) => ({
    ...r,
    confidence: Math.round(r.startScore),
    barScore: r.startScore,
  }));

  const sitCandidates = recommendations
    .filter((r) => r.startScore < 50)
    .sort((a, b) => a.startScore - b.startScore);
  const sitThese = (sitCandidates.length >= 8
    ? sitCandidates.slice(0, 8)
    : [...recommendations].sort((a, b) => a.startScore - b.startScore).slice(0, 8)
  ).map((r) => {
    const conf = sitConfidence(r.startScore);
    return {
      ...r,
      confidence: conf,
      barScore: conf,
    };
  });

  const flexDecisions = buildFlexDecisions(recommendations);

  const avgConf =
    recommendations.length > 0
      ? recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length
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

  const mustStart =
    recommendations.find((r) => r.startScore > 90) ?? recommendations[0] ?? null;
  const mustSitRaw =
    [...recommendations].sort((a, b) => a.startScore - b.startScore)[0] ?? null;
  const mustSit = mustSitRaw
    ? { ...mustSitRaw, confidence: sitConfidence(mustSitRaw.startScore) }
    : null;
  const sleeperPick =
    recommendations.find((r) => r.startScore > 70 && r.ownershipPct < 50) ?? null;

  const alerts: HighConfidenceAlerts = {
    mustStart: mustStart
      ? {
          ...mustStart,
          reasoning: 'Matchup of the week — elite play',
        }
      : null,
    mustSit: mustSit
      ? {
          ...mustSit,
          reasoning: `Worst ${mustSit.position} matchup of the week`,
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
      thisWeekCalls: recommendations.length,
      confidenceLevel: confidenceLevelLabel(avgConf),
      avgConfidence: Math.round(avgConf),
      lastUpdatedMinutes: minutesAgo(lastUpdated),
    },
    weekContext: {
      nflWeek: viewWeek,
      season,
      windowOpen: isStartSitWindowOpen(),
      lockDeadline: nextLockDeadlineLabel(),
      weatherImpact: 'Low',
    },
    bobConfidence: Math.round(avgConf),
    seasonRecord,
    weekRecord,
    seasonSparkline,
    startThese,
    sitThese,
    flexDecisions,
    alerts,
    allRecommendations: recommendations,
    leagueCount: leagueList.length,
  };
}
