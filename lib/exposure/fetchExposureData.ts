import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeDirection60d } from '@/lib/dashboard/tickerSignal';
import { fetchLatestFormulaCalculatedAt } from '@/lib/formula/lastRescore';
import { safeScore } from '@/lib/players/utils';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';
import type { ExposurePageData, ExposurePlayer } from './types';
import type { OwnedPlayerAggregate, RosterSlot } from './portfolioEngine';
import {
  bobPositionRankLabel,
  buildPositionBreakdown,
  buildPositionRanks,
  buildVerdictSummary,
  computeChampionshipOdds,
  computePortfolioGrade,
  concentrationBadge,
  concentrationRisk,
  estimatedPortfolioImpact,
  isBuyVerdict,
  largestPosition,
  pickBiggestOpportunity,
  pickBiggestRisk,
  portfolioRiskLevel,
} from './portfolioEngine';
import { sortExposurePlayers } from './utils';

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

const EMPTY: ExposurePageData = {
  leagues: [],
  topbar: {
    totalAssetValue: 0,
    leaguesConnected: 0,
    championshipOdds: 0,
    portfolioRisk: 'LOW',
    largestPosition: '—',
    largestPositionPct: 0,
    portfolioGrade: '—',
    lastUpdatedMinutes: 8,
  },
  overview: {
    totalAssetValue: 0,
    leaguesConnected: 0,
    championshipOdds: 0,
    portfolioRisk: 'LOW',
    portfolioGrade: '—',
    largestPosition: '—',
    largestPositionPct: 0,
    positionBreakdown: [],
  },
  biggestOpportunity: null,
  biggestRisk: null,
  missingElite: [],
  concentrationRows: [],
  verdictSummary: { buyCount: 0, buyImpact: 0, sellCount: 0, sellRisk: 0 },
  players: [],
  simulatorPool: [],
  acquirePool: [],
};

export async function fetchExposureData(
  userId: string,
  sleeperUserId: string,
): Promise<ExposurePageData> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[exposure] createAdminClient failed:', err);
    return EMPTY;
  }

  let leagueList: ExposurePageData['leagues'] = [];
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status')
      .eq('user_id', userId);
    if (error) throw error;
    leagueList = data ?? [];
  } catch (err) {
    console.error('[exposure] leagues fetch failed:', err);
    return EMPTY;
  }

  const leagueNameById = new Map(leagueList.map((l) => [l.id, l.name]));
  const playerLeagues = new Map<string, Set<string>>();
  const rosterByLeague = new Map<string, string[]>();

  try {
    const { data, error } = await supabase
      .from('rosters')
      .select('league_id, players')
      .eq('owner_id', sleeperUserId);
    if (error) throw error;

    for (const row of data ?? []) {
      const leagueId = String(row.league_id);
      const pids = collectRosterIds(row);
      rosterByLeague.set(leagueId, pids);
      for (const pid of pids) {
        if (!playerLeagues.has(pid)) playerLeagues.set(pid, new Set());
        playerLeagues.get(pid)!.add(leagueId);
      }
    }
  } catch (err) {
    console.error('[exposure] rosters fetch failed:', err);
  }

  const ownedIds = Array.from(playerLeagues.keys());
  if (ownedIds.length === 0) {
    return {
      ...EMPTY,
      leagues: leagueList,
      topbar: { ...EMPTY.topbar, leaguesConnected: leagueList.length },
      overview: { ...EMPTY.overview, leaguesConnected: leagueList.length },
    };
  }

  const tfoByPlayer = new Map<string, number>();
  const poolForRanks: Array<{ playerId: string; position: string; tfoScore: number }> = [];

  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score, calculated_at')
      .eq('scoring_context', 'dynasty')
      .order('calculated_at', { ascending: false });
    if (error) throw error;
    for (const row of data ?? []) {
      const pid = String(row.player_id);
      if (tfoByPlayer.has(pid)) continue;
      const score = safeScore(row.tfo_score);
      if (score > 0) tfoByPlayer.set(pid, score);
    }
  } catch (err) {
    console.error('[exposure] formula_scores fetch failed:', err);
  }

  const playerMeta = new Map<
    string,
    { full_name: string; position: string; team: string }
  >();

  const allScoredIds = Array.from(tfoByPlayer.keys());
  const metaIds = Array.from(new Set([...ownedIds, ...allScoredIds.slice(0, 800)]));

  try {
    for (let i = 0; i < metaIds.length; i += 200) {
      const batch = metaIds.slice(i, i + 200);
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

  for (const [pid, score] of Array.from(tfoByPlayer.entries())) {
    const meta = playerMeta.get(pid);
    if (!meta) continue;
    const pos = meta.position.toUpperCase();
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    poolForRanks.push({ playerId: pid, position: pos, tfoScore: score });
  }

  const rankByPosition = buildPositionRanks(poolForRanks);
  const positionByPlayer = new Map(
    Array.from(playerMeta.entries()).map(([id, m]) => [id, m.position]),
  );

  const marketVerdicts = await fetchMarketVerdicts(supabase, 'dynasty');

  const valueSignalUp = new Set<string>();
  try {
    const { data, error } = await supabase
      .from('player_value_signals')
      .select('player_id, direction_60d');
    if (error) throw error;
    for (const row of data ?? []) {
      const dir = normalizeDirection60d(row.direction_60d as string | null);
      if (dir === 'up') valueSignalUp.add(String(row.player_id));
    }
  } catch (err) {
    console.error('[exposure] player_value_signals fetch failed:', err);
  }

  const slots: RosterSlot[] = [];
  for (const [leagueId, pids] of Array.from(rosterByLeague.entries())) {
    for (const pid of pids) {
      const meta = playerMeta.get(pid);
      const tfo = tfoByPlayer.get(pid) ?? 0;
      slots.push({
        playerId: pid,
        leagueId,
        tfoScore: tfo,
        position: meta?.position ?? 'WR',
      });
    }
  }

  const totalTfo = slots.reduce((s, x) => s + x.tfoScore, 0);
  const totalAssetValue = Math.round(totalTfo * 100);

  const aggregates: OwnedPlayerAggregate[] = [];
  for (const pid of ownedIds) {
    const meta = playerMeta.get(pid);
    const leagueSet = playerLeagues.get(pid) ?? new Set();
    const tfoScore = tfoByPlayer.get(pid) ?? 0;
    const slotTfo = tfoScore * leagueSet.size;
    const portfolioPct =
      totalTfo > 0 ? Math.round((slotTfo / totalTfo) * 1000) / 10 : 0;
    const mv = marketVerdicts.get(pid) ?? {
      verdict: 'HOLD' as const,
      color: '#FBBF24',
      rankDelta: null,
      ktcRank: null,
      ktcValue: null,
      noMarketData: true,
    };
    const risk = concentrationRisk(portfolioPct, leagueSet.size);
    aggregates.push({
      playerId: pid,
      fullName: meta?.full_name ?? 'Unknown Player',
      position: meta?.position ?? '—',
      team: meta?.team ?? '—',
      tfoScore,
      leagueCount: leagueSet.size,
      leagueIds: Array.from(leagueSet),
      leagueNames: Array.from(leagueSet)
        .map((id) => leagueNameById.get(id) ?? 'League')
        .sort(),
      portfolioPct,
      concentrationRisk: risk,
      marketVerdict: mv,
      valueSignalUp: valueSignalUp.has(pid),
    });
  }

  const positionBreakdown = buildPositionBreakdown(slots);
  const largest = largestPosition(positionBreakdown);
  const avgOwnedTfo =
    aggregates.length > 0
      ? aggregates.reduce((s, p) => s + p.tfoScore, 0) / aggregates.length
      : 0;
  const poolAvgTfo =
    poolForRanks.length > 0
      ? poolForRanks.reduce((s, p) => s + p.tfoScore, 0) / poolForRanks.length
      : 0;
  const portfolioGrade = computePortfolioGrade(avgOwnedTfo, poolAvgTfo);
  const championshipOdds = computeChampionshipOdds(leagueList);
  const risk = portfolioRiskLevel(aggregates);

  const ownedSet = new Set(ownedIds);
  const opportunityCandidates = poolForRanks
    .filter((p) => !ownedSet.has(p.playerId))
    .filter(
      (p) =>
        valueSignalUp.has(p.playerId) ||
        isBuyVerdict(marketVerdicts.get(p.playerId)?.verdict ?? 'HOLD'),
    )
    .map((p) => {
      const meta = playerMeta.get(p.playerId)!;
      return {
        playerId: p.playerId,
        fullName: meta.full_name,
        position: meta.position,
        team: meta.team,
        tfoScore: p.tfoScore,
        marketVerdict: marketVerdicts.get(p.playerId) ?? {
          verdict: 'HOLD' as const,
          color: '#FBBF24',
          rankDelta: null,
          ktcRank: null,
          ktcValue: null,
          noMarketData: true,
        },
        valueSignalUp: valueSignalUp.has(p.playerId),
      };
    });

  const biggestOpportunity = pickBiggestOpportunity(
    opportunityCandidates,
    rankByPosition,
    rosterByLeague,
    tfoByPlayer,
    positionByPlayer,
    leagueNameById,
  );

  const biggestRisk = pickBiggestRisk(aggregates);

  const missingElite = poolForRanks
    .filter((p) => p.tfoScore > 70 && !ownedSet.has(p.playerId))
    .sort((a, b) => b.tfoScore - a.tfoScore)
    .slice(0, 5)
    .map((p) => {
      const meta = playerMeta.get(p.playerId)!;
      return {
        playerId: p.playerId,
        fullName: meta.full_name,
        position: meta.position,
        team: meta.team,
        tfoScore: p.tfoScore,
        bobRankLabel: bobPositionRankLabel(p.playerId, meta.position, rankByPosition),
        portfolioImpact: estimatedPortfolioImpact(p.tfoScore),
      };
    });

  const concentrationRows = aggregates
    .filter((p) => p.leagueCount >= 2)
    .map((p) => ({
      playerId: p.playerId,
      fullName: p.fullName,
      position: p.position,
      team: p.team,
      leagueCount: p.leagueCount,
      leagueNames: p.leagueNames,
      portfolioPct: p.portfolioPct,
      riskLevel: p.concentrationRisk,
      riskBadge: concentrationBadge(p.concentrationRisk),
      marketVerdict: p.marketVerdict,
      tfoScore: p.tfoScore,
    }))
    .sort((a, b) => {
      const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const ra = riskOrder[a.riskLevel];
      const rb = riskOrder[b.riskLevel];
      if (ra !== rb) return ra - rb;
      return b.leagueCount - a.leagueCount;
    });

  const verdictSummary = buildVerdictSummary(aggregates);

  const multiLeaguePlayers: ExposurePlayer[] = sortExposurePlayers(
    aggregates
      .filter((p) => p.leagueCount >= 2)
      .map((p) => ({
        playerId: p.playerId,
        fullName: p.fullName,
        position: p.position,
        team: p.team,
        leagueCount: p.leagueCount,
        leagueNames: p.leagueNames,
        marketVerdict: p.marketVerdict,
        tfoScore: p.tfoScore,
        portfolioPct: p.portfolioPct,
      })),
  );

  const simulatorPool = aggregates
    .filter((p) => p.tfoScore > 0)
    .map((p) => ({
      playerId: p.playerId,
      fullName: p.fullName,
      position: p.position,
      tfoScore: p.tfoScore,
      leagueCount: p.leagueCount,
    }))
    .sort((a, b) => b.tfoScore - a.tfoScore);

  const acquirePool = poolForRanks
    .filter((p) => !ownedSet.has(p.playerId))
    .sort((a, b) => b.tfoScore - a.tfoScore)
    .slice(0, 60)
    .map((p) => {
      const meta = playerMeta.get(p.playerId);
      return {
        playerId: p.playerId,
        fullName: meta?.full_name ?? 'Unknown Player',
        position: meta?.position ?? 'WR',
        tfoScore: p.tfoScore,
        leagueCount: 0,
      };
    });

  const lastUpdated = await fetchLatestFormulaCalculatedAt(supabase, 'dynasty');
  const lastUpdatedMinutes = lastUpdated
    ? Math.max(0, Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000))
    : 8;

  const overview = {
    totalAssetValue,
    leaguesConnected: leagueList.length,
    championshipOdds,
    portfolioRisk: risk,
    portfolioGrade,
    largestPosition: largest.position,
    largestPositionPct: largest.pct,
    positionBreakdown,
  };

  return {
    leagues: leagueList,
    topbar: {
      totalAssetValue,
      leaguesConnected: leagueList.length,
      championshipOdds,
      portfolioRisk: risk,
      largestPosition: `${largest.position} (${largest.pct}%)`,
      largestPositionPct: largest.pct,
      portfolioGrade,
      lastUpdatedMinutes,
    },
    overview,
    biggestOpportunity,
    biggestRisk,
    missingElite,
    concentrationRows,
    verdictSummary,
    players: multiLeaguePlayers,
    simulatorPool,
    acquirePool,
  };
}
