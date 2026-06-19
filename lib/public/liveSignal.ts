import { createAdminClient } from '@/lib/supabase/admin';
import { buildPositionRanks, bobPositionRankLabel } from '@/lib/exposure/portfolioEngine';
import {
  computeMarketVerdicts,
  type MarketVerdict,
} from '@/lib/verdict/marketVerdict';

export interface LiveSignalItem {
  signalType: string;
  playerName: string;
  position: string;
  marketRankLabel: string;
  bobRankLabel: string;
  gapSpots: number;
  rankDelta: number;
}

export interface PublicSignalCard {
  category: 'buy' | 'sell' | 'start' | 'add';
  signalType: string;
  playerName: string;
  position: string;
  team: string;
  confidence: number;
  detail: string;
}

export interface LiveSignalResponse {
  signals: LiveSignalItem[];
  landingCards: PublicSignalCard[];
  updatedAt: string;
}

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

function signalLabel(verdict: MarketVerdict): string {
  if (verdict === 'BOOM') return 'BUY NOW';
  if (verdict === 'BUY') return 'BUY WINDOW';
  if (verdict === 'BUST') return 'SELL NOW';
  if (verdict === 'SELL') return 'SELL WINDOW';
  return 'LIVE SIGNAL';
}

function marketPositionRankLabel(
  playerId: string,
  position: string,
  rankByPosition: Map<string, Map<string, number>>,
): string {
  const pos = position.toUpperCase();
  const rank = rankByPosition.get(pos)?.get(playerId);
  return rank != null ? `${pos}${rank}` : `${pos}—`;
}

function buildKtcPositionRanks(
  pool: Array<{ playerId: string; position: string; ktcValue: number }>,
): Map<string, Map<string, number>> {
  const byPos = new Map<string, Array<{ id: string; value: number }>>();
  for (const p of pool) {
    const pos = p.position.toUpperCase();
    if (!SKILL.has(pos)) continue;
    if (p.ktcValue <= 0) continue;
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push({ id: p.playerId, value: p.ktcValue });
  }
  const out = new Map<string, Map<string, number>>();
  for (const [pos, list] of Array.from(byPos.entries())) {
    list.sort((a, b) => b.value - a.value);
    const rankMap = new Map<string, number>();
    list.forEach((item, i) => rankMap.set(item.id, i + 1));
    out.set(pos, rankMap);
  }
  return out;
}

interface PoolContext {
  posById: Map<string, string>;
  nameById: Map<string, string>;
  teamById: Map<string, string>;
  tfoById: Map<string, number>;
  ppgById: Map<string, number>;
  bobRanks: Map<string, Map<string, number>>;
  marketRanks: Map<string, Map<string, number>>;
  verdicts: ReturnType<typeof computeMarketVerdicts>;
}

async function loadSignalPool(supabase: ReturnType<typeof createAdminClient>): Promise<PoolContext | null> {
  const { data: poolScores, error: scoreErr } = await supabase
    .from('formula_scores')
    .select('player_id, tfo_score, projected_ppg')
    .eq('scoring_context', 'dynasty')
    .eq('scoring_type', 'ppr')
    .eq('weight_set_name', 'default');

  if (scoreErr) throw scoreErr;

  const poolIds = Array.from(new Set((poolScores ?? []).map((r) => String(r.player_id))));
  if (poolIds.length === 0) return null;

  const posById = new Map<string, string>();
  const nameById = new Map<string, string>();
  const teamById = new Map<string, string>();

  for (let i = 0; i < poolIds.length; i += 200) {
    const { data } = await supabase
      .from('players')
      .select('id, position, full_name, team')
      .in('id', poolIds.slice(i, i + 200));
    for (const p of data ?? []) {
      const id = String(p.id);
      posById.set(id, (p.position ?? '—').toUpperCase());
      nameById.set(id, String(p.full_name ?? 'Unknown'));
      teamById.set(id, String(p.team ?? '—').toUpperCase());
    }
  }

  const ktcById = new Map<string, number>();
  for (let i = 0; i < poolIds.length; i += 200) {
    const { data } = await supabase
      .from('bbv_values')
      .select('player_id, ktc_value')
      .in('player_id', poolIds.slice(i, i + 200));
    for (const r of data ?? []) {
      ktcById.set(String(r.player_id), Number(r.ktc_value) || 0);
    }
  }

  const tfoById = new Map<string, number>();
  const ppgById = new Map<string, number>();
  for (const r of poolScores ?? []) {
    const id = String(r.player_id);
    tfoById.set(id, Number(r.tfo_score) || 0);
    ppgById.set(id, Number(r.projected_ppg) || 0);
  }

  const inputs = poolIds
    .filter((id) => SKILL.has(posById.get(id) ?? ''))
    .map((id) => ({
      playerId: id,
      tfoScore: tfoById.get(id) ?? 0,
      ktcValue: ktcById.get(id) ?? 0,
    }));

  const verdicts = computeMarketVerdicts(inputs);
  const tfoPool = inputs.map((p) => ({
    playerId: p.playerId,
    position: posById.get(p.playerId) ?? '—',
    tfoScore: p.tfoScore,
  }));
  const ktcPool = inputs
    .filter((p) => p.ktcValue > 0)
    .map((p) => ({
      playerId: p.playerId,
      position: posById.get(p.playerId) ?? '—',
      ktcValue: p.ktcValue,
    }));

  return {
    posById,
    nameById,
    teamById,
    tfoById,
    ppgById,
    bobRanks: buildPositionRanks(tfoPool),
    marketRanks: buildKtcPositionRanks(ktcPool),
    verdicts,
  };
}

function toPublicCard(
  pool: PoolContext,
  playerId: string,
  category: PublicSignalCard['category'],
  signalType: string,
  detail: string,
): PublicSignalCard {
  const position = pool.posById.get(playerId) ?? '—';
  const tfo = pool.tfoById.get(playerId) ?? 0;
  return {
    category,
    signalType,
    playerName: pool.nameById.get(playerId) ?? 'Unknown',
    position,
    team: pool.teamById.get(playerId) ?? '—',
    confidence: Math.round(Math.min(99, Math.max(55, tfo))),
    detail,
  };
}

export async function fetchLandingPageSignals(): Promise<LiveSignalResponse> {
  const empty: LiveSignalResponse = { signals: [], landingCards: [], updatedAt: new Date().toISOString() };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[liveSignal] admin client failed:', err);
    return empty;
  }

  try {
    const pool = await loadSignalPool(supabase);
    if (!pool) return empty;

    const buyCandidates: { id: string; delta: number; verdict: MarketVerdict }[] = [];
    const sellCandidates: { id: string; delta: number; verdict: MarketVerdict }[] = [];
    const boomCandidates: { id: string; delta: number }[] = [];

    for (const [playerId, mv] of Array.from(pool.verdicts.entries())) {
      if (mv.rankDelta == null || mv.flags.includes('no_market_data')) continue;
      const abs = Math.abs(mv.rankDelta);
      if (mv.verdict === 'BOOM' || mv.verdict === 'BUY') {
        buyCandidates.push({ id: playerId, delta: abs, verdict: mv.verdict });
        if (mv.verdict === 'BOOM') boomCandidates.push({ id: playerId, delta: abs });
      }
      if (mv.verdict === 'SELL' || mv.verdict === 'BUST') {
        sellCandidates.push({ id: playerId, delta: abs, verdict: mv.verdict });
      }
    }

    buyCandidates.sort((a, b) => b.delta - a.delta);
    sellCandidates.sort((a, b) => b.delta - a.delta);
    boomCandidates.sort((a, b) => b.delta - a.delta);

    const startCandidate = Array.from(pool.ppgById.entries())
      .filter(([id]) => SKILL.has(pool.posById.get(id) ?? ''))
      .sort((a, b) => b[1] - a[1])[0];

    const landingCards: PublicSignalCard[] = [];

    if (buyCandidates[0]) {
      const id = buyCandidates[0].id;
      const pos = pool.posById.get(id) ?? '—';
      landingCards.push(
        toPublicCard(
          pool,
          id,
          'buy',
          buyCandidates[0].verdict === 'BOOM' ? 'BUY NOW' : 'BUY WINDOW',
          `BOB Rank: ${bobPositionRankLabel(id, pos, pool.bobRanks)}`,
        ),
      );
    }

    if (sellCandidates[0]) {
      const id = sellCandidates[0].id;
      const pos = pool.posById.get(id) ?? '—';
      landingCards.push(
        toPublicCard(
          pool,
          id,
          'sell',
          sellCandidates[0].verdict === 'BUST' ? 'SELL NOW' : 'SELL WINDOW',
          `BOB Rank: ${bobPositionRankLabel(id, pos, pool.bobRanks)}`,
        ),
      );
    }

    if (startCandidate) {
      const [id, ppg] = startCandidate;
      landingCards.push(
        toPublicCard(pool, id, 'start', 'START', `Top matchup · ${ppg.toFixed(1)} proj`),
      );
    }

    const addId =
      boomCandidates.find((b) => !landingCards.some((c) => c.playerName === pool.nameById.get(b.id)))?.id
      ?? boomCandidates[0]?.id;
    if (addId) {
      const pos = pool.posById.get(addId) ?? '—';
      landingCards.push(
        toPublicCard(pool, addId, 'add', 'ADD', `BOB Rank: ${bobPositionRankLabel(addId, pos, pool.bobRanks)}`),
      );
    }

    const signals: LiveSignalItem[] = [];
    for (const [playerId, mv] of Array.from(pool.verdicts.entries())) {
      if (mv.rankDelta == null || mv.flags.includes('no_market_data')) continue;
      const verdict = mv.verdict;
      const isBuy = verdict === 'BOOM' || verdict === 'BUY';
      const isSell = verdict === 'SELL' || verdict === 'BUST';
      if (!isBuy && !isSell) continue;
      const position = pool.posById.get(playerId) ?? '—';
      signals.push({
        signalType: signalLabel(verdict),
        playerName: pool.nameById.get(playerId) ?? 'Unknown',
        position,
        marketRankLabel: marketPositionRankLabel(playerId, position, pool.marketRanks),
        bobRankLabel: bobPositionRankLabel(playerId, position, pool.bobRanks),
        gapSpots: Math.abs(Math.round(mv.rankDelta)),
        rankDelta: mv.rankDelta,
      });
    }

    signals.sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta));

    return {
      signals: signals.slice(0, 6),
      landingCards: landingCards.slice(0, 4),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[liveSignal] landing fetch failed:', err);
    return empty;
  }
}

export async function fetchLiveSignals(): Promise<LiveSignalResponse> {
  return fetchLandingPageSignals();
}
