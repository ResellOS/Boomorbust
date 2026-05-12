/**
 * BVI (Boom or Bust Value Index) engine.
 *
 * Formula:
 *   BVI quality (0–100) = TFO trajectory  × 0.30
 *                        + scheme stability × 0.20
 *                        + age curve pos   × 0.20
 *                        + positional scar × 0.15
 *                        + trade momentum  × 0.15
 *
 * Stored in player_values as KTC-scale (×100):
 *   bvi_score  = round(quality × 100)  →  0–10,000 range
 *   ktc_value  = raw KTC integer
 *   delta      = bvi_score − ktc_value (positive = market undervalues this player)
 *
 * Display: "BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED"
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValueForPlayer, getKTCValues } from '@/lib/values/ktc';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';

// ─── Exported types ───────────────────────────────────────────────────────────

export type BVITrend = 'RISING' | 'STABLE' | 'FALLING';
export type BVISignal = 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';
export type BVIScoringType = 'ppr' | 'half_ppr' | 'standard' | 'superflex';

export interface BVIResult {
  player_id: string;
  scoring_type: BVIScoringType;
  /** KTC-scale BVI (0–10,000). Derived from quality × 100. */
  bvi_score: number;
  /** Raw KTC value adjusted for scoring format. */
  ktc_value: number;
  /** Latest TFO score from tfo_cache. */
  tfo_score: number;
  /** bvi_score − ktc_value. Positive = market undervalues this player. */
  delta: number;
  trend: BVITrend;
  signal: BVISignal;
  /** Pre-formatted display string: "BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED" */
  displayString: string;
  calculated_at: string;
}

// ─── Display helper (exported for UI use) ────────────────────────────────────

export function formatBVIDisplay(
  bviScore: number,
  ktcValue: number,
  delta: number,
  signal: BVISignal,
): string {
  const d = Math.round(delta);
  const sign = d >= 0 ? '+' : '−';
  const absDelta = Math.abs(d);
  return (
    `BVI: ${Math.round(bviScore).toLocaleString()} | ` +
    `KTC: ${Math.round(ktcValue).toLocaleString()} | ` +
    `△${sign}${absDelta.toLocaleString()} ${signal}`
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function toTFOPos(pos: string): TFOPosition {
  const p = pos.toUpperCase() as TFOPosition;
  return ['QB', 'RB', 'WR', 'TE'].includes(p) ? p : 'WR';
}

/** KTC adjustment multiplier per scoring context. */
function ktcScoringMultiplier(position: string, scoringType: BVIScoringType): number {
  const pos = position.toUpperCase();
  if (scoringType === 'superflex' && pos === 'QB') return 1.25;
  if ((scoringType === 'ppr' || scoringType === 'half_ppr') && (pos === 'WR' || pos === 'TE'))
    return pos === 'TE' ? 1.08 : 1.04;
  if (scoringType === 'standard' && pos === 'RB') return 1.08;
  return 1.0;
}

// ─── Component 1: TFO Trajectory (0–100) ─────────────────────────────────────
// Pulls last 3 tfo_cache rows for the player+scoring_type.
// Increasing score → trajectory bonus; decreasing → penalty.

async function computeTFOTrajectory(
  playerId: string,
  scoringType: string,
): Promise<{ score: number; tfoLatest: number; trend: BVITrend }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('tfo_cache')
    .select('tfo_score, calculated_at')
    .eq('player_id', playerId)
    .eq('scoring_type', scoringType)
    .order('calculated_at', { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return { score: 50, tfoLatest: 0, trend: 'STABLE' };

  type TfoRow = { tfo_score: number };
  const scores = (data as TfoRow[]).map((r) => Number(r.tfo_score));
  const latest = scores[0]!;

  if (scores.length === 1) return { score: latest, tfoLatest: latest, trend: 'STABLE' };

  const oldest = scores[scores.length - 1]!;
  const delta = latest - oldest;

  const trend: BVITrend = delta > 3 ? 'RISING' : delta < -3 ? 'FALLING' : 'STABLE';
  // Trajectory bonus/penalty: ±8 quality points
  const trajectoryAdj = trend === 'RISING' ? 8 : trend === 'FALLING' ? -8 : 0;

  return { score: clamp(latest + trajectoryAdj), tfoLatest: latest, trend };
}

// ─── Component 2: Scheme Fit Stability (0–100) ───────────────────────────────
// Low variance in recent TFO scores = stable OC + scheme continuity.
// Uses stored sfs_score if present, else infers from TFO variance.

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

  type SfsRow = { tfo_score: number; sfs_score: number | null };
  const rows = data as SfsRow[];

  // Use stored SFS if available on the latest row
  if (rows[0]!.sfs_score != null) return clamp(Number(rows[0]!.sfs_score));

  // Fallback: compute from TFO score variance (low variance = stable scheme)
  if (rows.length < 2) return clamp(Number(rows[0]!.tfo_score));

  const tfoScores = rows.map((r) => Number(r.tfo_score));
  const mean = tfoScores.reduce((a, b) => a + b, 0) / tfoScores.length;
  const variance =
    tfoScores.reduce((s, v) => s + (v - mean) ** 2, 0) / tfoScores.length;

  // Variance of 0 = 100, variance of 67 = 0 (cap)
  return clamp(100 - variance * 1.5);
}

// ─── Component 3: Age Curve Position (0–100) ─────────────────────────────────
// ageCurveMultiplier returns 0.48–1.0 based on position + age archetype.
// Scale directly to 0–100.

function computeAgeCurvePosition(position: TFOPosition, age: number): number {
  return clamp(ageCurveMultiplier(position, age) * 100);
}

// ─── Component 4: Positional Scarcity (0–100) ────────────────────────────────
// How scarce is this position in dynasty? Uses tfo_cache to count scored
// players per position as a proxy for rostered supply across the app.
// Falls back to static baselines when tfo_cache is not yet populated.

const STATIC_SCARCITY: Record<string, number> = {
  QB: 72, // inherently scarce — few top-tier dynasty QBs
  RB: 50, // rapidly depreciating asset; mid scarcity
  WR: 42, // most supply; lowest scarcity
  TE: 68, // elite TEs extremely rare in dynasty
};

const SUPPLY_BASELINE: Record<string, number> = {
  QB: 48,
  RB: 128,
  WR: 192,
  TE: 64,
};

async function computePositionalScarcity(position: TFOPosition): Promise<number> {
  const supabase = createAdminClient();

  // Count distinct players that appear in any league's roster
  // as a proxy for "how many viable options exist at this position"
  const { count } = await supabase
    .from('rosters')
    .select('players', { count: 'exact', head: true })
    .not('players', 'is', null);

  const baseline = SUPPLY_BASELINE[position] ?? 96;
  const base = STATIC_SCARCITY[position] ?? 55;

  // If rosters table has data, use league density to fine-tune
  if (count && count > 0) {
    // More active leagues → more demand for scarce positions
    const leagueDensityBoost = Math.min(8, Math.floor(count / 20));
    return clamp(base + leagueDensityBoost);
  }

  void baseline;
  return base;
}

// ─── Component 5: Trade Market Momentum (0–100) ───────────────────────────────
// Recent transaction volume for this player in the trades table.
// 0 trades in last 30d = neutral 40; 5+ trades = high 88 (cap).

async function computeTradeMarketMomentum(playerId: string): Promise<number> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .or(`assets_sent.cs.{${playerId}},assets_received.cs.{${playerId}}`)
    .gte('created_at', thirtyDaysAgo);

  // 0 → 40 (neutral), each trade +9.6 pts, hard cap 88
  return clamp(40 + (count ?? 0) * 9.6, 0, 88);
}

// ─── Main: calculateBVI ───────────────────────────────────────────────────────

export async function calculateBVI(
  playerId: string,
  scoringType: BVIScoringType = 'ppr',
  playerMeta?: { position?: string; name?: string; age?: number },
): Promise<BVIResult | null> {
  const supabase = createAdminClient();

  // Resolve position, age, and name — prefer caller-provided meta
  let position: TFOPosition = 'WR';
  let age = 26;
  let playerName = playerMeta?.name ?? '';

  if (playerMeta?.position) position = toTFOPos(playerMeta.position);
  if (playerMeta?.age) age = playerMeta.age;

  // If meta is incomplete, try the Sleeper player DB (cached in Redis)
  if (!playerMeta?.position || !playerMeta?.age) {
    const allPlayers = await fetchAllPlayers();
    const p = allPlayers?.[playerId as keyof typeof allPlayers] as
      | { full_name?: string; position?: string; age?: number }
      | undefined;

    if (p) {
      if (!playerMeta?.position && p.position) position = toTFOPos(p.position);
      if (!playerMeta?.age && p.age) age = p.age;
      if (!playerName && p.full_name) playerName = p.full_name;
    }
  }

  // Compute all 5 components in parallel
  const [trajectoryResult, schemeFit, scarcity, momentum] = await Promise.all([
    computeTFOTrajectory(playerId, scoringType),
    computeSchemeFitStability(playerId, scoringType),
    computePositionalScarcity(position),
    computeTradeMarketMomentum(playerId),
  ]);

  const ageCurvePos = computeAgeCurvePosition(position, age);

  // BVI quality score (0–100)
  const quality =
    trajectoryResult.score * 0.3 +
    schemeFit * 0.2 +
    ageCurvePos * 0.2 +
    scarcity * 0.15 +
    momentum * 0.15;

  // Scale to KTC-comparable range: quality 0-100 → bvi_score 0-10000
  const bvi_score = Math.round(clamp(quality) * 100);

  // KTC value adjusted for scoring context
  const ktcBase = playerName ? ((await getKTCValueForPlayer(playerName)) ?? 0) : 0;
  const ktc_value = Math.round(ktcBase * ktcScoringMultiplier(position, scoringType));

  // Delta in KTC units (positive = BVI rates player higher than market)
  const delta = bvi_score - ktc_value;

  // Signal thresholds: ±400 KTC points ≈ meaningful divergence
  const signal: BVISignal =
    delta >= 400 ? 'UNDERVALUED' : delta <= -400 ? 'OVERVALUED' : 'FAIR';

  const tfo_score = trajectoryResult.tfoLatest;
  const calculated_at = new Date().toISOString();
  const displayString = formatBVIDisplay(bvi_score, ktc_value, delta, signal);

  const result: BVIResult = {
    player_id: playerId,
    scoring_type: scoringType,
    bvi_score,
    ktc_value,
    tfo_score,
    delta,
    trend: trajectoryResult.trend,
    signal,
    displayString,
    calculated_at,
  };

  // Upsert into player_values (non-blocking — don't let DB failure kill the result)
  try {
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
  } catch (err) {
    console.warn(`[bvi] upsert failed for ${playerId}:`, err);
  }

  return result;
}

// ─── calculateBVIBatch ────────────────────────────────────────────────────────
// Processes multiple player IDs efficiently by pre-loading shared data once
// (Sleeper player DB + KTC values + tfo_cache rows), then computing per-player.

interface BatchPlayerMeta {
  player_id: string;
  position?: string;
  name?: string;
  age?: number;
}

export async function calculateBVIBatch(
  players: BatchPlayerMeta[],
  scoringType: BVIScoringType = 'ppr',
): Promise<BVIResult[]> {
  if (!players.length) return [];

  const supabase = createAdminClient();
  const playerIds = players.map((p) => p.player_id);

  // Pre-load shared data in parallel
  const [allPlayersDb, ktcList, tfoRows, tradeRows] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
    supabase
      .from('tfo_cache')
      .select('player_id, tfo_score, sfs_score, calculated_at')
      .in('player_id', playerIds)
      .eq('scoring_type', scoringType)
      .order('calculated_at', { ascending: false }),
    supabase
      .from('trades')
      .select('assets_sent, assets_received, created_at')
      .or(playerIds.map((id) => `assets_sent.cs.{${id}}`).join(',') + ',' +
          playerIds.map((id) => `assets_received.cs.{${id}}`).join(','))
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // Build KTC lookup by lowercase name
  const ktcByName = new Map<string, number>();
  for (const v of ktcList ?? []) {
    if (v.player_name) ktcByName.set(v.player_name.toLowerCase(), v.ktc_value);
  }

  // Build TFO lookup: player_id → sorted rows (already ordered desc by calculated_at)
  type TfoR = { player_id: string; tfo_score: number; sfs_score: number | null; calculated_at: string };
  const tfoByPlayer = new Map<string, TfoR[]>();
  for (const row of (tfoRows.data ?? []) as TfoR[]) {
    const pid = String(row.player_id);
    if (!tfoByPlayer.has(pid)) tfoByPlayer.set(pid, []);
    tfoByPlayer.get(pid)!.push(row);
  }

  // Build trade momentum lookup: player_id → count
  const tradeMomentum = new Map<string, number>();
  type TradeR = { assets_sent: string[]; assets_received: string[] };
  for (const trade of (tradeRows.data ?? []) as TradeR[]) {
    for (const pid of [...(trade.assets_sent ?? []), ...(trade.assets_received ?? [])]) {
      tradeMomentum.set(pid, (tradeMomentum.get(pid) ?? 0) + 1);
    }
  }

  // Get static positional scarcity scores
  const scarcityCache = new Map<TFOPosition, number>();
  for (const pos of ['QB', 'RB', 'WR', 'TE'] as TFOPosition[]) {
    scarcityCache.set(pos, await computePositionalScarcity(pos));
  }

  const results: BVIResult[] = [];
  const upsertRows: Record<string, unknown>[] = [];

  for (const playerInput of players) {
    const { player_id: pid } = playerInput;

    // Resolve metadata from caller or Sleeper DB
    let position: TFOPosition = 'WR';
    let age = 26;
    let playerName = playerInput.name ?? '';

    if (playerInput.position) position = toTFOPos(playerInput.position);
    if (playerInput.age) age = playerInput.age;

    if (!playerInput.position || !playerInput.age) {
      const sleeperP = allPlayersDb?.[pid as keyof typeof allPlayersDb] as
        | { full_name?: string; position?: string; age?: number }
        | undefined;
      if (sleeperP) {
        if (!playerInput.position && sleeperP.position) position = toTFOPos(sleeperP.position);
        if (!playerInput.age && sleeperP.age) age = sleeperP.age;
        if (!playerName && sleeperP.full_name) playerName = sleeperP.full_name;
      }
    }

    // TFO trajectory from pre-loaded rows
    const tfoPlayerRows = (tfoByPlayer.get(pid) ?? []).slice(0, 3);
    let trajectoryScore = 50;
    let tfoLatest = 0;
    let trend: BVITrend = 'STABLE';

    if (tfoPlayerRows.length > 0) {
      const scores = tfoPlayerRows.map((r) => Number(r.tfo_score));
      tfoLatest = scores[0]!;
      if (scores.length > 1) {
        const d = tfoLatest - scores[scores.length - 1]!;
        trend = d > 3 ? 'RISING' : d < -3 ? 'FALLING' : 'STABLE';
      }
      const adj = trend === 'RISING' ? 8 : trend === 'FALLING' ? -8 : 0;
      trajectoryScore = clamp(tfoLatest + adj);
    }

    // Scheme fit from pre-loaded rows
    let schemeFit = 55;
    if (tfoPlayerRows.length > 0) {
      if (tfoPlayerRows[0]!.sfs_score != null) {
        schemeFit = clamp(Number(tfoPlayerRows[0]!.sfs_score));
      } else if (tfoPlayerRows.length >= 2) {
        const sc = tfoPlayerRows.map((r) => Number(r.tfo_score));
        const mean = sc.reduce((a, b) => a + b, 0) / sc.length;
        const variance = sc.reduce((s, v) => s + (v - mean) ** 2, 0) / sc.length;
        schemeFit = clamp(100 - variance * 1.5);
      }
    }

    const ageCurvePos = computeAgeCurvePosition(position, age);
    const scarcity = scarcityCache.get(position) ?? 55;
    const momentum = clamp(40 + (tradeMomentum.get(pid) ?? 0) * 9.6, 0, 88);

    const quality =
      trajectoryScore * 0.3 +
      schemeFit * 0.2 +
      ageCurvePos * 0.2 +
      scarcity * 0.15 +
      momentum * 0.15;

    const bvi_score = Math.round(clamp(quality) * 100);

    const ktcBase = playerName ? (ktcByName.get(playerName.toLowerCase()) ?? 0) : 0;
    const ktc_value = Math.round(ktcBase * ktcScoringMultiplier(position, scoringType));
    const delta = bvi_score - ktc_value;

    const signal: BVISignal =
      delta >= 400 ? 'UNDERVALUED' : delta <= -400 ? 'OVERVALUED' : 'FAIR';

    const tfo_score = tfoLatest;
    const calculated_at = new Date().toISOString();
    const displayString = formatBVIDisplay(bvi_score, ktc_value, delta, signal);

    const result: BVIResult = {
      player_id: pid,
      scoring_type: scoringType,
      bvi_score,
      ktc_value,
      tfo_score,
      delta,
      trend,
      signal,
      displayString,
      calculated_at,
    };

    results.push(result);
    upsertRows.push({
      player_id: pid,
      scoring_type: scoringType,
      bvi_score,
      ktc_value,
      tfo_score,
      delta,
      trend,
      calculated_at,
    });
  }

  // Batch upsert all results
  if (upsertRows.length > 0) {
    try {
      await supabase
        .from('player_values')
        .upsert(upsertRows, { onConflict: 'player_id,scoring_type' });
    } catch (err) {
      console.warn('[bvi] batch upsert failed:', err);
    }
  }

  return results;
}

// ─── getBVIForRoster ──────────────────────────────────────────────────────────
// Fetches roster player IDs from Supabase, then runs BVI for each player.
// Uses calculateBVIBatch for efficiency (single shared data load).

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

  const playerIds = ((roster as { players: string[] | null } | null)?.players ?? []).filter(
    Boolean,
  );
  if (!playerIds.length) return [];

  // Resolve Sleeper player metadata once for all IDs
  const allPlayersDb = await fetchAllPlayers();
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

  const batchInput: BatchPlayerMeta[] = [];
  for (const pid of playerIds) {
    const p = allPlayersDb?.[pid as keyof typeof allPlayersDb] as
      | { full_name?: string; position?: string; age?: number }
      | undefined;
    if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;
    batchInput.push({
      player_id: pid,
      position: p.position,
      name: p.full_name,
      age: p.age ?? undefined,
    });
  }

  return calculateBVIBatch(batchInput, scoringType);
}

