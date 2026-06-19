import { createAdminClient } from '@/lib/supabase/admin';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';
import { fetchLatestFormulaCalculatedAt } from '@/lib/formula/lastRescore';
import { normalizeDirection60d } from '@/lib/dashboard/tickerSignal';
import type { PlayerHubData, HubPlayer, RosterSnapshotPlayer, PlayerHubPortfolio } from './types';
import {
  calcTrend,
  minutesAgo,
  normalizeVerdict,
  resolveSubScores,
  safeScore,
} from './utils';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { parseSleeperBio } from './playerIntelligence';

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

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
  confidence_tier?: string | null;
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
    portfolio: { avgPortfolioTfo: 0, totalPortfolioTfo: 0, positionSharePct: {} },
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
  let boomPlayers = 0;
  let bustPlayers = 0;

  const latestByPlayer = new Map<string, TfoCacheRow>();
  const previousByPlayer = new Map<string, number>();
  const historyByPlayer = new Map<string, number[]>();
  const historyDatesByPlayer = new Map<string, string[]>();
  const confidenceByPlayer = new Map<string, string | null>();

  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select(
        'player_id, tfo_score, verdict, ops_score, sfs_score, yoysi_score, sit_score, projected_ppg, confidence_tier, calculated_at',
      )
      .eq('scoring_context', 'dynasty')
      .order('calculated_at', { ascending: false });
    if (error) throw error;

    for (const row of (data ?? []) as TfoCacheRow[]) {
      const pid = String(row.player_id);
      if (!latestByPlayer.has(pid)) {
        latestByPlayer.set(pid, row);
        confidenceByPlayer.set(pid, typeof row.confidence_tier === 'string' ? row.confidence_tier : null);
      } else if (!previousByPlayer.has(pid)) {
        previousByPlayer.set(pid, safeScore(row.tfo_score));
      }
      const hist = historyByPlayer.get(pid) ?? [];
      const histDates = historyDatesByPlayer.get(pid) ?? [];
      if (hist.length < 12) {
        hist.push(safeScore(row.tfo_score));
        historyByPlayer.set(pid, hist);
        if (row.calculated_at) {
          histDates.push(String(row.calculated_at));
          historyDatesByPlayer.set(pid, histDates);
        }
      }
    }
  } catch (err) {
    console.error('[players] tfo_cache fetch failed:', err);
  }

  let scoreSum = 0;
  let scoreCount = 0;

  const marketVerdicts = await fetchMarketVerdicts(supabase, 'dynasty');
  const lastUpdated = await fetchLatestFormulaCalculatedAt(supabase, 'dynasty');

  let sleeperBioById = new Map<string, ReturnType<typeof parseSleeperBio>>();
  try {
    const sleeperMap = await fetchAllPlayers();
    if (sleeperMap) {
      for (const [pid, row] of Object.entries(sleeperMap)) {
        sleeperBioById.set(pid, parseSleeperBio(row as unknown as Record<string, unknown>));
      }
    }
  } catch {
    /* optional */
  }

  const latestPlayerIds = Array.from(latestByPlayer.keys());

  const valueSignalByPlayer = new Map<string, { direction60d: 'up' | 'down' | 'neutral' | null; prob60d: number | null }>();
  if (latestPlayerIds.length > 0) {
    try {
      for (let i = 0; i < latestPlayerIds.length; i += 200) {
        const slice = latestPlayerIds.slice(i, i + 200);
        const { data: sigRows, error: sigErr } = await supabase
          .from('player_value_signals')
          .select('player_id, direction_60d, prob_60d')
          .in('player_id', slice);
        if (sigErr) throw sigErr;
        for (const row of sigRows ?? []) {
          const pid = String(row.player_id);
          if (valueSignalByPlayer.has(pid)) continue;
          valueSignalByPlayer.set(pid, {
            direction60d: normalizeDirection60d(row.direction_60d as string | null),
            prob60d: typeof row.prob_60d === 'number' ? row.prob_60d : null,
          });
        }
      }
    } catch {
      /* prob_60d column may not exist — retry direction only */
      try {
        for (let i = 0; i < latestPlayerIds.length; i += 200) {
          const slice = latestPlayerIds.slice(i, i + 200);
          const { data: sigRows } = await supabase
            .from('player_value_signals')
            .select('player_id, direction_60d')
            .in('player_id', slice);
          for (const row of sigRows ?? []) {
            const pid = String(row.player_id);
            if (valueSignalByPlayer.has(pid)) continue;
            valueSignalByPlayer.set(pid, {
              direction60d: normalizeDirection60d(row.direction_60d as string | null),
              prob60d: null,
            });
          }
        }
      } catch {
        /* optional */
      }
    }
  }

  for (const row of Array.from(latestByPlayer.values())) {
    const score = safeScore(row.tfo_score);
    if (score <= 0) continue;
    scoreSum += score;
    scoreCount += 1;
  }

  const avgDynastyRating =
    scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;

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
      scoreHistoryDates: (historyDatesByPlayer.get(pid) ?? []).reverse(),
      calculatedAt: tfo.calculated_at ?? null,
      confidenceTier: confidenceByPlayer.get(pid) ?? null,
      valueSignal: valueSignalByPlayer.get(pid) ?? null,
      marketVerdict: marketVerdicts.get(pid) ?? null,
      bio: sleeperBioById.get(pid),
    });
  }

  hubPlayers.sort((a, b) => b.tfoScore - a.tfoScore);

  for (const p of hubPlayers) {
    if (!SKILL_POSITIONS.has(p.position)) continue;
    const mv = p.marketVerdict;
    if (!mv || mv.noMarketData || mv.rankDelta == null) continue;
    playersTracked += 1;
    if (mv.verdict === 'BOOM' || mv.verdict === 'BUY') boomPlayers += 1;
    else if (mv.verdict === 'SELL' || mv.verdict === 'BUST') bustPlayers += 1;
  }

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

  const rosterHub = hubPlayers.filter((p) => rosterSet.has(p.playerId));
  const totalPortfolioTfo = rosterHub.reduce((s, p) => s + p.tfoScore, 0);
  const avgPortfolioTfo =
    rosterHub.length > 0 ? Math.round((totalPortfolioTfo / rosterHub.length) * 10) / 10 : avgDynastyRating;
  const positionTfo: Record<string, number> = {};
  for (const p of rosterHub) {
    positionTfo[p.position] = (positionTfo[p.position] ?? 0) + p.tfoScore;
  }
  const positionSharePct: Record<string, number> = {};
  for (const [pos, tfo] of Object.entries(positionTfo)) {
    positionSharePct[pos] =
      totalPortfolioTfo > 0 ? Math.round((tfo / totalPortfolioTfo) * 1000) / 10 : 0;
  }
  const portfolio: PlayerHubPortfolio = {
    avgPortfolioTfo,
    totalPortfolioTfo,
    positionSharePct,
  };

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
    portfolio,
    edgeOpportunities,
    leagueCount: leagueList.length,
  };
}
