/**
 * BVI (Boom or Bust Value Index) engine.
 *
 * BVI = (TFO trajectory × 0.30) + (scheme fit stability × 0.20)
 *     + (age curve position × 0.20) + (positional scarcity × 0.15)
 *     + (trade market momentum × 0.15)
 *
 * Sits above KTC. Self-learning as trades table fills with app data.
 * Upserts results into player_values table on (player_id, scoring_type).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';
import { getKTCValueForPlayer } from '@/lib/values/ktc';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BVITrend = 'RISING' | 'STABLE' | 'FALLING';
export type BVISignal = 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';
export type BVIScoringType = 'ppr' | 'half_ppr' | 'standard' | 'superflex';

export interface BVIResult {
  player_id: string;
  scoring_type: BVIScoringType;
  bvi_score: number;
  ktc_value: number;
  tfo_score: number;
  delta: number;
  trend: BVITrend;
  signal: BVISignal;
  calculated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

// KTC adjustment for scoring format — QB rises sharply in superflex
function ktcScoringMultiplier(position: string, scoringType: BVIScoringType): number {
  const pos = position.toUpperCase();
  if (scoringType === 'superflex' && pos === 'QB') return 1.25;
  if (scoringType === 'ppr' && (pos === 'WR' || pos === 'TE')) return 1.05;
  if (scoringType === 'standard' && pos === 'RB') return 1.08;
  return 1.0;
}

// ─── Component 1: TFO Trajectory (0–100) ─────────────────────────────────────
// Rising TFO over last 3 cached runs → trajectory boost

async function computeTFOTrajectory(
  playerId: string,
  scoringType: string,
): Promise<{ score: number; trend: BVITrend }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('tfo_cache')
    .select('tfo_score, calculated_at')
    .eq('player_id', playerId)
    .eq('scoring_type', scoringType)
    .order('calculated_at', { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return { score: 50, trend: 'STABLE' };

  const scores = (data as Array<{ tfo_score: number }>).map(r => r.tfo_score);
  const latest = scores[0];

  if (scores.length === 1) return { score: latest, trend: 'STABLE' };

  const oldest = scores[scores.length - 1];
  const delta = latest - oldest;

  const trend: BVITrend = delta > 3 ? 'RISING' : delta < -3 ? 'FALLING' : 'STABLE';
  const trajectoryBonus = trend === 'RISING' ? 8 : trend === 'FALLING' ? -8 : 0;

  return { score: clamp(latest + trajectoryBonus), trend };
}

// ─── Component 2: Scheme Fit Stability (0–100) ───────────────────────────────
// Low variance in recent TFO scores = stable OC/scheme

async function computeSchemeFitStability(
  playerId: string,
  scoringType: string,
): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('tfo_cache')
    .select('tfo_score, sfs_score')
    .eq('player_id', playerId)
    .eq('scoring_type', scoringType)
    .order('calculated_at', { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return 55;

  const rows = data as Array<{ tfo_score: number; sfs_score: number | null }>;

  // Use stored SFS score if available
  if (rows[0].sfs_score != null) return clamp(rows[0].sfs_score);

  // Fallback: low variance = stable scheme
  if (rows.length < 2) return clamp(rows[0].tfo_score);

  const tfoScores = rows.map(r => r.tfo_score);
  const mean = tfoScores.reduce((a, b) => a + b, 0) / tfoScores.length;
  const variance = tfoScores.reduce((s, v) => s + (v - mean) ** 2, 0) / tfoScores.length;
  return clamp(100 - variance * 1.5);
}

// ─── Component 3: Age Curve Position (0–100) ─────────────────────────────────
// Peak (multiplier 1.0) = 100. Decline curve proportional.

function computeAgeCurvePosition(position: TFOPosition, age: number): number {
  return clamp(ageCurveMultiplier(position, age) * 100);
}

// ─── Component 4: Positional Scarcity (0–100) ────────────────────────────────
// QB and TE inherently scarce in dynasty. Supply vs baseline boosts score.

async function computePositionalScarcity(position: TFOPosition): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('bbv_values')
    .select('*', { count: 'exact', head: true })
    .eq('position', position);

  // Expected dynasty supply baselines per position
  const baselines: Record<string, number> = { QB: 48, RB: 128, WR: 192, TE: 64 };
  const baseline = baselines[position] ?? 96;
  const supply = count ?? baseline;

  const scarcityBoost = Math.max(0, (baseline - supply) / baseline) * 20;
  const baseScarcity: Record<string, number> = { QB: 72, RB: 52, WR: 44, TE: 68 };
  return clamp((baseScarcity[position] ?? 55) + scarcityBoost);
}

// ─── Component 5: Trade Market Momentum (0–100) ───────────────────────────────
// Recent transaction volume signals market interest

async function computeTradeMarketMomentum(playerId: string): Promise<number> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .or(`assets_sent.cs.{${playerId}},assets_received.cs.{${playerId}}`)
    .gte('created_at', thirtyDaysAgo);

  // 0 trades = neutral 40, 5+ trades = high 88
  return clamp(40 + (count ?? 0) * 9.6, 0, 90);
}

// ─── Main: calculateBVI ───────────────────────────────────────────────────────

export async function calculateBVI(
  playerId: string,
  scoringType: BVIScoringType = 'ppr',
  playerMeta?: { position?: string; name?: string; age?: number },
): Promise<BVIResult | null> {
  const supabase = createAdminClient();

  // Resolve position + age from bbv_values if not provided
  let position: TFOPosition = 'WR';
  let age = 26;
  let playerName = playerMeta?.name ?? '';

  if (playerMeta?.position) {
    position = playerMeta.position as TFOPosition;
  }
  if (playerMeta?.age) age = playerMeta.age;

  if (!playerMeta?.position || !playerMeta?.age) {
    const { data: bbv } = await supabase
      .from('bbv_values')
      .select('position, age, player_name')
      .eq('player_id', playerId)
      .maybeSingle();

    if (bbv) {
      if (!playerMeta?.position && bbv.position) position = bbv.position as TFOPosition;
      if (!playerMeta?.age && bbv.age) age = bbv.age as number;
      if (!playerName && bbv.player_name) playerName = bbv.player_name as string;
    }
  }

  // Pull latest cached TFO score
  const { data: tfoRow } = await supabase
    .from('tfo_cache')
    .select('tfo_score')
    .eq('player_id', playerId)
    .eq('scoring_type', scoringType)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const tfo_score = (tfoRow as { tfo_score: number } | null)?.tfo_score ?? 0;

  // Compute all 5 components in parallel
  const [trajectoryResult, schemeFit, scarcity, momentum] = await Promise.all([
    computeTFOTrajectory(playerId, scoringType),
    computeSchemeFitStability(playerId, scoringType),
    computePositionalScarcity(position),
    computeTradeMarketMomentum(playerId),
  ]);

  const ageCurvePos = computeAgeCurvePosition(position, age);

  // BVI formula
  const bviRaw =
    trajectoryResult.score * 0.30 +
    schemeFit * 0.20 +
    ageCurvePos * 0.20 +
    scarcity * 0.15 +
    momentum * 0.15;

  const bvi_score = Math.round(clamp(bviRaw) * 10) / 10;

  // KTC value adjusted for scoring context
  const ktcBase = playerName ? ((await getKTCValueForPlayer(playerName)) ?? 0) : 0;
  const ktc_value = Math.round(ktcBase * ktcScoringMultiplier(position, scoringType));

  // Delta: BVI (0-100) vs KTC normalized to same scale (rough 1000-9000 → 0-100)
  const ktcNorm = Math.round(clamp((ktc_value - 1000) / 80));
  const delta = Math.round(bvi_score - ktcNorm);
  const signal: BVISignal = delta >= 8 ? 'UNDERVALUED' : delta <= -8 ? 'OVERVALUED' : 'FAIR';

  const calculated_at = new Date().toISOString();

  const result: BVIResult = {
    player_id: playerId,
    scoring_type: scoringType,
    bvi_score,
    ktc_value,
    tfo_score,
    delta,
    trend: trajectoryResult.trend,
    signal,
    calculated_at,
  };

  // Upsert into player_values
  await supabase.from('player_values').upsert(
    {
      player_id: playerId,
      scoring_type: scoringType,
      bvi_score,
      ktc_value,
      tfo_score,
      delta,
      trend: trajectoryResult.trend,
      calculated_at,
    },
    { onConflict: 'player_id,scoring_type' },
  );

  return result;
}

// ─── getBVIForRoster ──────────────────────────────────────────────────────────

export async function getBVIForRoster(
  leagueId: string,
  ownerId: string,
  scoringType: BVIScoringType = 'ppr',
): Promise<BVIResult[]> {
  const supabase = createAdminClient();

  const { data: roster } = await supabase
    .from('rosters')
    .select('players, owner_id')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  const playerIds = (roster as { players: string[] | null } | null)?.players ?? [];
  if (!playerIds.length) return [];

  const { data: bbvPlayers } = await supabase
    .from('bbv_values')
    .select('player_id, player_name, position, age')
    .in('player_id', playerIds);

  const playerMap = new Map(
    (bbvPlayers as Array<{ player_id: string; player_name: string; position: string; age: number }> | null ?? [])
      .map(p => [p.player_id, p]),
  );

  const results: BVIResult[] = [];
  for (const pid of playerIds) {
    const meta = playerMap.get(pid);
    try {
      const bvi = await calculateBVI(pid, scoringType, {
        position: meta?.position,
        name: meta?.player_name,
        age: meta?.age,
      });
      if (bvi) results.push(bvi);
    } catch {
      // Skip individual failures — log if needed
    }
  }

  return results;
}
