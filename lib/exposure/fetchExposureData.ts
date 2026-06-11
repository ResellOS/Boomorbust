import { createAdminClient } from '@/lib/supabase/admin';
import {
  isBoomVerdict,
  normalizeVerdict,
  resolveSubScores,
  safeScore,
} from '@/lib/players/utils';
import { fetchLeagueMatchups, fetchNflState } from '@/lib/sleeper';
import type {
  ExposurePageData,
  ExposurePlayer,
  PositionBreakdown,
  WeeklyPerformance,
} from './types';
import {
  concentrationLabel,
  exposureRiskLevel,
  healthRiskLabel,
  healthRiskSub,
  isNflGameDay,
  portfolioRiskLabel,
  positionColor,
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
  season: string,
  week: number,
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const positions = ['QB', 'RB', 'WR', 'TE'];
  for (const pos of positions) {
    try {
      const res = await fetch(
        `https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular&position[]=${pos}`,
        { cache: 'no-store' },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        player_id?: string;
        pts_ppr?: number;
        pts_half_ppr?: number;
        pts_std?: number;
        fpts?: number;
      }>;
      for (const item of data ?? []) {
        const pid = item.player_id;
        const pts =
          item.pts_ppr ?? item.pts_half_ppr ?? item.pts_std ?? item.fpts ?? null;
        if (pid && typeof pts === 'number' && Number.isFinite(pts)) {
          map[pid] = pts;
        }
      }
    } catch (err) {
      console.error('[exposure] projections fetch failed:', err);
    }
  }
  return map;
}

export async function fetchExposureData(
  userId: string,
  sleeperUserId: string,
): Promise<ExposurePageData> {
  const empty: ExposurePageData = {
    leagues: [],
    topbar: {
      totalPlayersTracked: 0,
      highExposureCount: 0,
      highExposurePct: 0,
      dangerZoneCount: 0,
      dangerZonePct: 0,
      portfolioConcentration: 0,
      concentrationLabel: 'Low',
      leaguesAnalyzed: 0,
    },
    portfolioOverview: { totalAssets: 0, avgDynastyRating: 0, boomRate: 0 },
    exposureHealth: {
      score: 0,
      label: 'Low Risk',
      sub: 'Portfolio well diversified',
      pointerPct: 0,
    },
    players: [],
    portfolioRisk: {
      score: 0,
      label: 'Low Risk',
      concentrationRisk: 0,
      positionDiversity: 100,
      ageCurveRisk: 0,
    },
    dangerAlerts: [],
    positionBreakdown: [],
    positionAdvisory: null,
    weeklyPerformance: {
      beating: 0,
      onTrack: 0,
      below: 0,
      totalPoints: 0,
      projected: 0,
      delta: 0,
    },
    nflWeek: 1,
    isGameDay: isNflGameDay(),
    leagueCount: 0,
  };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[exposure] createAdminClient failed:', err);
    return empty;
  }

  let leagueList: ExposurePageData['leagues'] = [];
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
    console.error('[exposure] leagues fetch failed:', err);
    leagueList = [];
  }

  const totalLeagues = leagueList.length;
  const leagueNameById = new Map(leagueList.map((l) => [l.id, l.name]));

  const playerLeagues = new Map<string, Set<string>>();
  const rosterIdByLeague = new Map<string, number>();

  try {
    // rosters.owner_id stores the Sleeper user id (NOT the Supabase auth uid).
    // The only player column is players (text[]); player_id/player_ids don't exist.
    const { data, error } = await supabase
      .from('rosters')
      .select('league_id, roster_id, owner_id, players')
      .eq('owner_id', sleeperUserId);
    if (error) throw error;

    for (const row of data ?? []) {
      const leagueId = String(row.league_id);
      if (row.roster_id) rosterIdByLeague.set(leagueId, Number(row.roster_id));
      const pids = collectRosterIds(row);
      for (const pid of pids) {
        if (!playerLeagues.has(pid)) playerLeagues.set(pid, new Set());
        playerLeagues.get(pid)!.add(leagueId);
      }
    }
  } catch (err) {
    console.error('[exposure] rosters fetch failed:', err);
  }

  const uniquePlayerIds = Array.from(playerLeagues.keys());
  const totalPlayers = uniquePlayerIds.length;

  const tfoByPlayer = new Map<
    string,
    {
      score: number;
      verdict: string | null;
      ageCurve: number | null;
      trend7d: number[];
    }
  >();

  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score, verdict, calculated_at')
      .in('player_id', uniquePlayerIds.length > 0 ? uniquePlayerIds : ['__none__'])
      .order('calculated_at', { ascending: false });
    if (error) throw error;

    const history = new Map<string, number[]>();
    for (const row of data ?? []) {
      const pid = String(row.player_id);
      if (!tfoByPlayer.has(pid)) {
        const score = safeScore(row.tfo_score);
        const sub = resolveSubScores(
          row as unknown as Parameters<typeof resolveSubScores>[0],
          pid,
          score,
        );
        tfoByPlayer.set(pid, {
          score,
          verdict: row.verdict ?? null,
          ageCurve: sub.ageCurve,
          trend7d: [],
        });
      }
      const hist = history.get(pid) ?? [];
      if (hist.length < 7) {
        hist.push(safeScore(row.tfo_score));
        history.set(pid, hist);
      }
    }

    for (const [pid, hist] of Array.from(history.entries())) {
      const entry = tfoByPlayer.get(pid);
      if (entry) entry.trend7d = hist.reverse();
    }
  } catch (err) {
    console.error('[exposure] tfo_cache fetch failed:', err);
  }

  const playerMeta = new Map<
    string,
    { full_name: string; position: string; team: string }
  >();

  if (uniquePlayerIds.length > 0) {
    try {
      const batchSize = 200;
      for (let i = 0; i < uniquePlayerIds.length; i += batchSize) {
        const batch = uniquePlayerIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('players')
          .select('id, full_name, position, team')
          .in('id', batch);
        if (error) throw error;
        for (const p of data ?? []) {
          playerMeta.set(String(p.id), {
            full_name: p.full_name ?? 'Unknown Player',
            position: (p.position ?? '—').toUpperCase(),
            team: p.team ?? '—',
          });
        }
      }
    } catch (err) {
      console.error('[exposure] players meta fetch failed:', err);
    }
  }

  let nflWeek = 1;
  let season = String(new Date().getFullYear());
  let projections: Record<string, number> = {};
  const weeklyPointsByPlayer = new Map<string, number>();

  try {
    const state = await fetchNflState();
    if (state) {
      nflWeek = state.week ?? state.display_week ?? 1;
      season = state.season ?? state.league_season ?? season;
    }
    projections = await fetchWeekProjections(season, nflWeek);

    for (const league of leagueList) {
      const rosterId = rosterIdByLeague.get(league.id);
      if (!rosterId) continue;
      try {
        const matchups = await fetchLeagueMatchups(league.id, nflWeek);
        const mine = matchups?.find((m) => m.roster_id === rosterId);
        if (!mine?.players_points) continue;
        for (const [pid, pts] of Object.entries(mine.players_points)) {
          if (typeof pts !== 'number') continue;
          weeklyPointsByPlayer.set(pid, (weeklyPointsByPlayer.get(pid) ?? 0) + pts);
        }
      } catch (err) {
        console.error(`[exposure] matchups failed for ${league.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[exposure] weekly scoring fetch failed:', err);
  }

  const players: ExposurePlayer[] = [];
  for (const pid of uniquePlayerIds) {
    const leagueSet = playerLeagues.get(pid) ?? new Set();
    const leagueCount = leagueSet.size;
    const exposurePct =
      totalLeagues > 0 ? Math.round((leagueCount / totalLeagues) * 1000) / 10 : 0;
    const leagueNames = Array.from(leagueSet)
      .map((id) => leagueNameById.get(id) ?? 'League')
      .sort();
    const meta = playerMeta.get(pid);
    const tfo = tfoByPlayer.get(pid);
    const score = tfo?.score ?? 0;
    const verdict = normalizeVerdict(tfo?.verdict, score > 0 ? score : 50);

    players.push({
      playerId: pid,
      fullName: meta?.full_name ?? 'Unknown Player',
      position: meta?.position ?? '—',
      team: meta?.team ?? '—',
      leagueCount,
      totalLeagues,
      exposurePct,
      leagueNames,
      tfoScore: score > 0 ? score : 0,
      verdict,
      ageCurve: tfo?.ageCurve ?? null,
      weeklyPoints: weeklyPointsByPlayer.get(pid) ?? null,
      projectedPoints: projections[pid] ?? null,
      trend7d: tfo?.trend7d ?? [],
      riskLevel: exposureRiskLevel(exposurePct),
    });
  }

  players.sort((a, b) => b.exposurePct - a.exposurePct);

  const highExposureCount = players.filter((p) => p.leagueCount >= 3).length;
  const dangerZoneCount = players.filter((p) => p.leagueCount >= 5).length;
  const multiLeagueCount = players.filter((p) => p.leagueCount >= 2).length;
  const portfolioConcentration =
    totalPlayers > 0 ? Math.round((multiLeagueCount / totalPlayers) * 1000) / 10 : 0;

  const dangerCount = players.filter((p) => p.riskLevel === 'DANGER').length;
  const cautionCount = players.filter((p) => p.riskLevel === 'CAUTION').length;

  const concentrationBonus =
    portfolioConcentration > 40 ? 20 : portfolioConcentration > 25 ? 10 : 0;
  const portfolioRiskScore = Math.min(
    100,
    dangerCount * 30 + cautionCount * 15 + concentrationBonus,
  );

  const healthScore =
    totalPlayers > 0
      ? Math.round(
          ((dangerZoneCount * 20 + highExposureCount * 10) / totalPlayers) * 100,
        )
      : 0;
  const healthLabel = healthRiskLabel(healthScore);

  const scoredPlayers = players.filter((p) => p.tfoScore > 0);
  const avgDynastyRating =
    scoredPlayers.length > 0
      ? Math.round(
          (scoredPlayers.reduce((s, p) => s + p.tfoScore, 0) / scoredPlayers.length) * 10,
        ) / 10
      : 0;
  const boomCount = players.filter((p) => isBoomVerdict(p.verdict)).length;
  const boomRate =
    totalPlayers > 0 ? Math.round((boomCount / totalPlayers) * 1000) / 10 : 0;

  const positionCounts = new Map<string, number>();
  for (const p of players) {
    const pos = p.position;
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    positionCounts.set(pos, (positionCounts.get(pos) ?? 0) + 1);
  }

  const positionBreakdown: PositionBreakdown[] = ['WR', 'RB', 'QB', 'TE'].map(
    (pos) => ({
      position: pos,
      count: positionCounts.get(pos) ?? 0,
      pct:
        totalPlayers > 0
          ? Math.round(((positionCounts.get(pos) ?? 0) / totalPlayers) * 1000) / 10
          : 0,
      color: positionColor(pos),
    }),
  );

  const maxPosPct = Math.max(...positionBreakdown.map((p) => p.pct), 0);
  const positionDiversity = Math.round(100 - maxPosPct);
  const heaviest = positionBreakdown.reduce((a, b) => (b.pct > a.pct ? b : a));
  const positionAdvisory =
    heaviest.pct > 60
      ? `${heaviest.position} Heavy — consider ${heaviest.position === 'WR' ? 'RB' : 'WR'} exposure`
      : null;

  const ageCurveLow = players.filter(
    (p) => p.ageCurve !== null && p.ageCurve < 60,
  ).length;
  const ageCurveRisk =
    totalPlayers > 0 ? Math.round((ageCurveLow / totalPlayers) * 100) : 0;

  const weeklyPerformance: WeeklyPerformance = {
    beating: 0,
    onTrack: 0,
    below: 0,
    totalPoints: 0,
    projected: 0,
    delta: 0,
  };

  for (const p of players) {
    if (p.weeklyPoints === null && p.projectedPoints === null) continue;
    const actual = p.weeklyPoints ?? 0;
    const proj = p.projectedPoints ?? actual;
    weeklyPerformance.totalPoints += actual;
    weeklyPerformance.projected += proj;

    if (proj <= 0) continue;
    const ratio = (actual - proj) / proj;
    if (ratio > 0) weeklyPerformance.beating += 1;
    else if (ratio >= -0.1) weeklyPerformance.onTrack += 1;
    else weeklyPerformance.below += 1;
  }
  weeklyPerformance.totalPoints = Math.round(weeklyPerformance.totalPoints * 10) / 10;
  weeklyPerformance.projected = Math.round(weeklyPerformance.projected * 10) / 10;
  weeklyPerformance.delta =
    Math.round((weeklyPerformance.totalPoints - weeklyPerformance.projected) * 10) / 10;

  const dangerAlerts = players
    .filter((p) => p.exposurePct >= 80)
    .sort((a, b) => b.exposurePct - a.exposurePct)
    .slice(0, 5);

  return {
    leagues: leagueList,
    topbar: {
      totalPlayersTracked: totalPlayers,
      highExposureCount,
      highExposurePct:
        totalPlayers > 0
          ? Math.round((highExposureCount / totalPlayers) * 1000) / 10
          : 0,
      dangerZoneCount,
      dangerZonePct:
        totalPlayers > 0
          ? Math.round((dangerZoneCount / totalPlayers) * 1000) / 10
          : 0,
      portfolioConcentration,
      concentrationLabel: concentrationLabel(portfolioConcentration),
      leaguesAnalyzed: totalLeagues,
    },
    portfolioOverview: {
      totalAssets: totalPlayers,
      avgDynastyRating,
      boomRate,
    },
    exposureHealth: {
      score: healthScore,
      label: healthLabel,
      sub: healthRiskSub(healthLabel),
      pointerPct: Math.min(100, Math.max(0, healthScore)),
    },
    players,
    portfolioRisk: {
      score: portfolioRiskScore,
      label: portfolioRiskLabel(portfolioRiskScore),
      concentrationRisk: portfolioConcentration,
      positionDiversity,
      ageCurveRisk,
    },
    dangerAlerts,
    positionBreakdown,
    positionAdvisory,
    weeklyPerformance,
    nflWeek,
    isGameDay: isNflGameDay(),
    leagueCount: totalLeagues,
  };
}
