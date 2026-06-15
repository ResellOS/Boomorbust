import { createAdminClient } from '@/lib/supabase/admin';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';
import type { PlayerHubData, HubPlayer, RosterSnapshotPlayer } from './types';
import {
  calcTrend,
  isBoomVerdict,
  isBustVerdict,
  minutesAgo,
  normalizeVerdict,
  resolveSubScores,
  safeScore,
} from './utils';

type PlayerRow = {
  player_id: string;
  full_name: string | null;
  position: string | null;
  team: string | null;
  age?: number | null;
};

type TfoCacheRow = {
  player_id: string;
  tfo_score: number | null;
  verdict?: string | null;
  opportunity?: number | null;
  situation?: number | null;
  age_curve?: number | null;
  iq?: number | null;
  upside?: number | null;
  ops?: number | null;
  sfs?: number | null;
  ffig?: number | null;
  sit?: number | null;
  // Real engine component columns.
  ops_score?: number | null;
  sfs_score?: number | null;
  yoysi_score?: number | null;
  sit_score?: number | null;
  projected_ppg?: number | null;
  calculated_at?: string | null;
};

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

export async function fetchPlayerHubData(
  userId: string,
  sleeperUserId: string,
): Promise<PlayerHubData> {
  const empty: PlayerHubData = {
    leagues: [],
    stats: {
      playersTracked: 0,
      boomPlayers: 0,
      bustPlayers: 0,
      avgDynastyRating: 0,
      lastUpdated: null,
      lastUpdatedMinutes: 8,
    },
    players: [],
    rosterPlayerIds: [],
    rosterSnapshot: [],
    leaguePresence: {},
    edgeOpportunities: 0,
    leagueCount: 0,
  };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[players] createAdminClient failed:', err);
    return empty;
  }

  let leagueList: PlayerHubData['leagues'] = [];
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
    console.error('[players] leagues fetch failed:', err);
    leagueList = [];
  }

  const leagueNameById = new Map(leagueList.map((l) => [l.id, l.name]));

  let rosterPlayerIds: string[] = [];
  const leaguePresence: Record<string, string[]> = {};

  try {
    // rosters.owner_id stores the Sleeper user id; the only player column is
    // players (text[]) — player_id/player_ids don't exist and error the query.
    const { data, error } = await supabase
      .from('rosters')
      .select('league_id, roster_id, players')
      .eq('owner_id', sleeperUserId);
    if (error) throw error;

    const idSet = new Set<string>();
    for (const row of data ?? []) {
      const pids = collectRosterIds(row);
      const leagueName = leagueNameById.get(row.league_id as string) ?? 'League';
      for (const pid of pids) {
        idSet.add(pid);
        if (!leaguePresence[pid]) leaguePresence[pid] = [];
        if (!leaguePresence[pid].includes(leagueName)) {
          leaguePresence[pid].push(leagueName);
        }
      }
    }
    rosterPlayerIds = Array.from(idSet);
  } catch (err) {
    console.error('[players] rosters fetch failed:', err);
    rosterPlayerIds = [];
  }

  let playersTracked = 0;
  try {
    const { count, error } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    playersTracked = count ?? 0;
  } catch (err) {
    console.error('[players] players count failed:', err);
  }

  const latestByPlayer = new Map<string, TfoCacheRow>();
  const previousByPlayer = new Map<string, number>();
  const historyByPlayer = new Map<string, number[]>();

  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score, verdict, ops_score, sfs_score, yoysi_score, sit_score, projected_ppg, calculated_at')
      .order('calculated_at', { ascending: false });
    if (error) throw error;

    for (const row of (data ?? []) as TfoCacheRow[]) {
      const pid = String(row.player_id);
      if (!latestByPlayer.has(pid)) {
        latestByPlayer.set(pid, row);
      } else if (!previousByPlayer.has(pid)) {
        previousByPlayer.set(pid, safeScore(row.tfo_score));
      }
      const hist = historyByPlayer.get(pid) ?? [];
      if (hist.length < 7) {
        hist.push(safeScore(row.tfo_score));
        historyByPlayer.set(pid, hist);
      }
    }
  } catch (err) {
    console.error('[players] tfo_cache fetch failed:', err);
  }

  let boomPlayers = 0;
  let bustPlayers = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let lastUpdated: string | null = null;

  for (const row of Array.from(latestByPlayer.values())) {
    const score = safeScore(row.tfo_score);
    if (score <= 0) continue;
    const verdict = normalizeVerdict(row.verdict, score);
    if (isBoomVerdict(verdict)) boomPlayers += 1;
    if (isBustVerdict(verdict)) bustPlayers += 1;
    scoreSum += score;
    scoreCount += 1;
    if (row.calculated_at) {
      if (!lastUpdated || row.calculated_at > lastUpdated) {
        lastUpdated = row.calculated_at;
      }
    }
  }

  const avgDynastyRating =
    scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;

  const latestPlayerIds = Array.from(latestByPlayer.keys());
  let playerMeta = new Map<string, PlayerRow>();

  if (latestPlayerIds.length > 0) {
    try {
      const batchSize = 200;
      for (let i = 0; i < latestPlayerIds.length; i += batchSize) {
        const batch = latestPlayerIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('players')
          .select('id, full_name, position, team, age')
          .in('id', batch);
        if (error) throw error;
        for (const p of data ?? []) {
          playerMeta.set(String(p.id), p as unknown as PlayerRow);
        }
      }
    } catch (err) {
      console.error('[players] players meta fetch failed:', err);
      playerMeta = new Map();
    }
  }

  // Market verdicts (BUY/SELL vs KTC) — market-wide across the scored skill pool,
  // identical computation to the dashboard via the shared helper.
  const marketVerdicts = await fetchMarketVerdicts(supabase, 'dynasty');

  const hubPlayers: HubPlayer[] = [];
  for (const [pid, tfo] of Array.from(latestByPlayer.entries())) {
    const meta = playerMeta.get(pid);
    const score = safeScore(tfo.tfo_score);
    if (score <= 0) continue;

    const prev = previousByPlayer.get(pid) ?? null;
    const trend = calcTrend(score, prev);
    const subScores = resolveSubScores(tfo, pid, score);

    // Real engine components for the detail radar/signal bars (null when unscored).
    const hasComponents =
      tfo.ops_score != null || tfo.sfs_score != null || tfo.yoysi_score != null || tfo.sit_score != null;
    const components = hasComponents
      ? {
          ops: safeScore(tfo.ops_score),
          sfs: safeScore(tfo.sfs_score),
          yoysi: safeScore(tfo.yoysi_score),
          sit: safeScore(tfo.sit_score),
          projectedPpg: safeScore(tfo.projected_ppg),
        }
      : null;

    hubPlayers.push({
      playerId: pid,
      fullName: meta?.full_name ?? 'Unknown Player',
      position: (meta?.position ?? '—').toUpperCase(),
      team: meta?.team ?? '—',
      age: meta?.age ?? null,
      tfoScore: score,
      verdict: normalizeVerdict(tfo.verdict, score),
      subScores,
      components,
      trend,
      trendDelta: prev !== null && prev > 0 ? Math.round((score - prev) * 10) / 10 : 0,
      scoreHistory: (historyByPlayer.get(pid) ?? [score]).reverse(),
      calculatedAt: tfo.calculated_at ?? null,
      marketVerdict: marketVerdicts.get(pid) ?? null,
    });
  }

  hubPlayers.sort((a, b) => b.tfoScore - a.tfoScore);

  const rosterSet = new Set(rosterPlayerIds);
  const edgeOpportunities = hubPlayers.filter(
    (p) => p.tfoScore > 75 && !rosterSet.has(p.playerId),
  ).length;

  const rosterSnapshot: RosterSnapshotPlayer[] = hubPlayers
    .filter((p) => rosterSet.has(p.playerId))
    .slice(0, 6)
    .map((p) => ({
      playerId: p.playerId,
      name: p.fullName,
      position: p.position,
      team: p.team,
      tfoScore: p.tfoScore,
    }));

  return {
    leagues: leagueList,
    stats: {
      playersTracked,
      boomPlayers,
      bustPlayers,
      avgDynastyRating,
      lastUpdated,
      lastUpdatedMinutes: minutesAgo(lastUpdated),
    },
    players: hubPlayers,
    rosterPlayerIds,
    rosterSnapshot,
    leaguePresence,
    edgeOpportunities,
    leagueCount: leagueList.length,
  };
}
