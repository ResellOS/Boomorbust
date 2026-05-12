/**
 * RTS (Rookie Transition Score) — bridges F-FIG (post-draft athleticism/production data)
 * into a projected TFO score for dynasty evaluation of first-year players.
 *
 * Formula:
 *   RTS = (Athletic Score × 0.25) + (Production Score × 0.30)
 *       + (Draft Capital × 0.20) + (Landing Spot × 0.25)
 *
 * After year 2, once real NFL data is available, TFO takes over entirely.
 *
 * Data source: scouting_profiles table (measurables + landing_spot_data jsonb)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { ageCurveMultiplier, computeSchemeScore, type TFOPosition } from '@/lib/tfo/formula';

// ─── Public types ─────────────────────────────────────────────────────────────

/** Matches TFO grade thresholds: 88+ ELITE, 75+ HIGH, 60+ VIABLE, 45+ SPECULATIVE, else AVOID */
export type RTSGrade = 'ELITE' | 'HIGH' | 'VIABLE' | 'SPECULATIVE' | 'AVOID';

export type RTSTranslationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RTSResult {
  player_id: string;
  rts_score: number;
  grade: RTSGrade;
  /** How confidently the RTS predicts NFL production. Depends on data completeness. */
  translation_confidence: RTSTranslationConfidence;
  /** Estimated TFO score when Year-2 data is available. */
  projected_tfo_year2: number;
  /** Component scores (each 0-100) */
  athletic_score: number;
  production_score: number;
  draft_capital_score: number;
  landing_spot_score: number;
  /** Bust-risk indicator strings */
  flags: string[];
  calculated_at: string;
}

// ─── Measurables jsonb shape ──────────────────────────────────────────────────
// Stored in scouting_profiles.measurables

interface Measurables {
  height?: number;           // inches
  weight?: number;           // lbs
  forty_time?: number;       // 40-yd dash in seconds (e.g. 4.39)
  vertical?: number;         // vertical jump in inches
  broad_jump?: number;       // broad jump in inches
  ras_score?: number;        // Relative Athletic Score 0-10
  sparq?: number;            // SPARQ score percentile 0-100
  breakout_age?: number;     // age at college breakout season
  dom_score?: number;        // dominator rating 0-100 (% of team yards+TDs)
  market_share?: number;     // % of team target/rush share 0-100
  competition_level?: 'power5' | 'group5' | 'fcs';
  [key: string]: unknown;
}

// ─── Landing spot jsonb shape ─────────────────────────────────────────────────
// Stored in scouting_profiles.landing_spot_data

interface LandingSpotData {
  depth_chart?: 'starter' | 'competing' | 'backup';
  oc_scheme?: string;
  oc_year?: number;
  scheme_mismatch?: boolean;
  supporting_cast_quality?: number; // 0-100
  qb_tier?: 'elite' | 'above_avg' | 'avg' | 'below_avg' | 'bad';
  vacated_volume?: number;          // targets/carries vacated by departed players
  scheme_proe?: number;             // pass rate over expected for the NFL team
  lsm_total?: number;               // pre-computed landing spot modifier (optional override)
  [key: string]: unknown;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function toTFOPos(raw: string): TFOPosition {
  const p = raw.toUpperCase() as TFOPosition;
  return ['QB', 'RB', 'WR', 'TE'].includes(p) ? p : 'WR';
}

function gradeFromScore(score: number): RTSGrade {
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

// ─── Component 1: Athletic Score (0-100) ─────────────────────────────────────

/**
 * Barnwell Speed Score for RBs: weight × (200 / forty_time^4)
 * Elite backs (Jamaal Charles, CJ2K): ~120+
 * Average NFL RB: ~95-105
 * Normalized to 0-100 using range [60, 140].
 */
function speedScore(weight: number, fortyTime: number): number {
  const raw = weight * (200 / Math.pow(fortyTime, 4));
  return clamp((raw - 60) / 80 * 100);
}

/**
 * Normalize 40-time by position.
 * Faster = higher score (100 = elite, 0 = slow).
 */
function normalizeFortyTime(fortyTime: number, position: TFOPosition): number {
  const benchmarks: Record<TFOPosition, { elite: number; floor: number }> = {
    WR: { elite: 4.28, floor: 4.65 },
    RB: { elite: 4.33, floor: 4.62 },
    TE: { elite: 4.45, floor: 4.82 },
    QB: { elite: 4.45, floor: 4.90 },
  };
  const { elite, floor } = benchmarks[position];
  return clamp(((floor - fortyTime) / (floor - elite)) * 100);
}

function normalizeVertical(vertical: number): number {
  // Elite: 42+ in; avg: 35 in; floor: 28 in
  return clamp((vertical - 28) / (42 - 28) * 100);
}

function normalizeBroadJump(broadJump: number): number {
  // Elite: 140+ in (11'8"); avg: 120 in; floor: 100 in
  return clamp((broadJump - 100) / (140 - 100) * 100);
}

function computeAthleticScore(
  position: TFOPosition,
  m: Measurables,
): { score: number; flags: string[] } {
  const flags: string[] = [];

  // SPARQ percentile is the most comprehensive — use directly if present
  if (m.sparq != null) {
    const score = clamp(m.sparq);
    if (score < 30) flags.push('POOR_SPARQ');
    return { score, flags };
  }

  // RAS (0-10 → 0-100)
  if (m.ras_score != null) {
    const score = clamp(m.ras_score * 10);
    if (score < 40) flags.push('BELOW_AVG_ATHLETICISM');
    return { score, flags };
  }

  // Build from raw components
  const components: { value: number; weight: number }[] = [];

  if (m.forty_time != null) {
    const fortyNorm = normalizeFortyTime(m.forty_time, position);
    if (fortyNorm < 35) flags.push('SLOW_FORTY');

    // RB: also compute Speed Score if weight is available
    if (position === 'RB' && m.weight != null) {
      const spd = speedScore(m.weight, m.forty_time);
      // Blend 40 normalization (40%) + Speed Score (60%) for RBs
      components.push({ value: fortyNorm * 0.4 + spd * 0.6, weight: 1.0 });
    } else {
      components.push({ value: fortyNorm, weight: 0.5 });
    }
  }

  if (m.vertical != null) {
    components.push({ value: normalizeVertical(m.vertical), weight: 0.3 });
  }

  if (m.broad_jump != null) {
    components.push({ value: normalizeBroadJump(m.broad_jump), weight: 0.2 });
  }

  if (!components.length) {
    flags.push('NO_ATHLETIC_DATA');
    return { score: 50, flags }; // neutral default
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight;
  return { score: clamp(weighted), flags };
}

// ─── Component 2: Production Score (0-100) ───────────────────────────────────

function breakoutAgeScore(breakoutAge: number | undefined): number {
  if (breakoutAge == null) return 60; // neutral
  if (breakoutAge <= 19) return 100;
  if (breakoutAge <= 20) return 90;
  if (breakoutAge <= 21) return 80;
  if (breakoutAge <= 22) return 60;
  if (breakoutAge <= 23) return 30;
  return 10; // 24+
}

const COMPETITION_MULTIPLIER: Record<string, number> = {
  power5: 1.00,
  group5: 0.85,
  fcs:    0.70,
};

function computeProductionScore(
  m: Measurables,
): { score: number; flags: string[] } {
  const flags: string[] = [];

  const domComponent = m.dom_score != null
    ? clamp(m.dom_score)   // dom_score already 0-100 per spec
    : 50;

  const marketComponent = m.market_share != null
    ? clamp(m.market_share)
    : 50;

  const breakoutComponent = breakoutAgeScore(m.breakout_age);
  if ((m.breakout_age ?? 0) >= 23) flags.push('LATE_BREAKOUT');

  // Weighted before competition multiplier
  const raw =
    domComponent * 0.40 +
    marketComponent * 0.30 +
    breakoutComponent * 0.30;

  const compMult = COMPETITION_MULTIPLIER[m.competition_level ?? 'power5'] ?? 1.0;
  if (compMult < 1.0) flags.push(`${(m.competition_level ?? '').toUpperCase()}_COMPETITION`);

  const score = clamp(raw * compMult);
  if (domComponent < 30) flags.push('LOW_DOMINATOR');

  return { score, flags };
}

// ─── Component 3: Draft Capital (0-100) ──────────────────────────────────────

function computeDraftCapitalScore(
  draftRound: number | null | undefined,
  draftPick: number | null | undefined,
): { score: number; flags: string[] } {
  const flags: string[] = [];

  if (draftRound == null) {
    flags.push('UNDRAFTED_OR_UNKNOWN');
    return { score: 15, flags };
  }

  if (draftRound >= 4) {
    flags.push('LATE_DRAFT_CAPITAL');
    return { score: 15, flags };
  }

  if (draftRound === 3) return { score: 30, flags };
  if (draftRound === 2) return { score: 50, flags };

  // Round 1 — granular by pick
  const pick = draftPick ?? 33;
  if (pick <= 5)  return { score: 100, flags };
  if (pick <= 15) return { score: 85,  flags };
  return { score: 70, flags }; // picks 16-32
}

// ─── Component 4: Landing Spot (0-100) ───────────────────────────────────────

function depthChartScore(depthChart: LandingSpotData['depth_chart']): number {
  if (depthChart === 'starter')   return 100;
  if (depthChart === 'competing') return 70;
  if (depthChart === 'backup')    return 30;
  return 55; // unknown — neutral
}

function qbTierModifier(qbTier: LandingSpotData['qb_tier']): number {
  switch (qbTier) {
    case 'elite':     return +8;
    case 'above_avg': return +4;
    case 'avg':       return 0;
    case 'below_avg': return -6;
    case 'bad':       return -12;
    default:          return 0;
  }
}

function computeLandingSpotScore(
  position: TFOPosition,
  age: number,
  lsd: LandingSpotData,
): { score: number; flags: string[] } {
  const flags: string[] = [];

  // If pre-computed total is stored, use it as a weight
  if (lsd.lsm_total != null) {
    return { score: clamp(lsd.lsm_total), flags };
  }

  // Depth chart (40% weight)
  const depthScore = depthChartScore(lsd.depth_chart);
  if (lsd.depth_chart === 'backup') flags.push('DEPTH_CHART_RISK');

  // Scheme fit (35% weight) — reuse TFO computeSchemeScore
  let schemeScore = 70; // neutral default
  if (lsd.oc_scheme) {
    schemeScore = computeSchemeScore({
      playerId: '',
      position,
      age,
      team: '',
      ocScheme: lsd.oc_scheme,
      ocYear: lsd.oc_year,
      schemeMismatch: lsd.scheme_mismatch,
      opportunityScore: 70,
      olGrade: 70,
      wrCastGrade: 70,
      redZoneShare: 15,
      ktcValue: 5000,
    });
    if (lsd.scheme_mismatch) flags.push('SCHEME_MISMATCH');
  }

  // Supporting cast quality (25% weight)
  const supportScore = lsd.supporting_cast_quality ?? 60;

  let score =
    depthScore    * 0.40 +
    schemeScore   * 0.35 +
    supportScore  * 0.25;

  // QB tier modifier
  score += qbTierModifier(lsd.qb_tier);

  // Vacated volume bonus (lots of targets/carries available = opportunity)
  if (lsd.vacated_volume != null) {
    if (lsd.vacated_volume >= 120) score += 8;       // lots of vacated looks
    else if (lsd.vacated_volume >= 60) score += 4;
  }

  // PROE (pass rate over expected) for WR/TE
  if ((position === 'WR' || position === 'TE') && lsd.scheme_proe != null) {
    if (lsd.scheme_proe >= 5)  score += 5;
    if (lsd.scheme_proe <= -5) score -= 5;
  }

  return { score: clamp(score), flags };
}

// ─── Translation confidence ───────────────────────────────────────────────────

function deriveConfidence(
  m: Measurables,
  lsd: LandingSpotData,
  draftRound: number | null | undefined,
): RTSTranslationConfidence {
  let points = 0;

  // Athletic data
  if (m.sparq != null || m.ras_score != null) points += 3;
  else {
    if (m.forty_time != null) points += 1;
    if (m.vertical != null)   points += 1;
    if (m.broad_jump != null) points += 1;
  }

  // Production data
  if (m.dom_score != null)     points += 2;
  if (m.market_share != null)  points += 1;
  if (m.breakout_age != null)  points += 1;
  if (m.competition_level)     points += 1;

  // Draft info
  if (draftRound != null) points += 2;

  // Landing spot
  if (lsd.depth_chart)             points += 2;
  if (lsd.oc_scheme)               points += 2;
  if (lsd.supporting_cast_quality) points += 1;

  if (points >= 12) return 'HIGH';
  if (points >= 6)  return 'MEDIUM';
  return 'LOW';
}

// ─── Projected Year-2 TFO ────────────────────────────────────────────────────

function projectTFOYear2(
  rtsScore: number,
  position: TFOPosition,
  age: number,
  landingSpotScore: number,
): number {
  // Apply age curve for year 2 (age + 2 proxy for NFL age after draft)
  const nflAge = age + 2;
  const ageMult = ageCurveMultiplier(position, nflAge);

  // Base projection from RTS, scaled by age curve
  let projected = rtsScore * ageMult;

  // Landing spot confirms or tempers the projection
  const landingModifier = (landingSpotScore - 60) / 100; // ±0.40
  projected += projected * landingModifier * 0.25;

  // RTS-to-TFO translation discount (year 1 → year 2 data typically +5-10)
  projected = projected * 0.90 + 5;

  return Math.round(clamp(projected) * 10) / 10;
}

// ─── Bust risk flags ──────────────────────────────────────────────────────────

function collectFlags(
  athleticFlags: string[],
  productionFlags: string[],
  draftFlags: string[],
  landingFlags: string[],
): string[] {
  return Array.from(
    new Set([...athleticFlags, ...productionFlags, ...draftFlags, ...landingFlags]),
  );
}

// ─── Data loader ──────────────────────────────────────────────────────────────

interface ScoutingRow {
  player_id: string;
  draft_year: number | null;
  draft_round: number | null;
  draft_pick: number | null;
  ffig_score: number | null;
  rts_score: number | null;
  measurables: Measurables;
  landing_spot_data: LandingSpotData;
}

async function loadScoutingProfile(playerId: string): Promise<ScoutingRow | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('scouting_profiles')
    .select('player_id, draft_year, draft_round, draft_pick, ffig_score, rts_score, measurables, landing_spot_data')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!data) return null;

  const raw = data as {
    player_id: string;
    draft_year: number | null;
    draft_round: number | null;
    draft_pick: number | null;
    ffig_score: number | null;
    rts_score: number | null;
    measurables: unknown;
    landing_spot_data: unknown;
  };

  return {
    player_id: raw.player_id,
    draft_year: raw.draft_year,
    draft_round: raw.draft_round,
    draft_pick: raw.draft_pick,
    ffig_score: raw.ffig_score,
    rts_score: raw.rts_score,
    measurables: (raw.measurables as Measurables) ?? {},
    landing_spot_data: (raw.landing_spot_data as LandingSpotData) ?? {},
  };
}

// ─── Main: calculateRTS ───────────────────────────────────────────────────────

export async function calculateRTS(playerId: string): Promise<RTSResult | null> {
  const supabase = createAdminClient();

  // Load scouting profile
  const profile = await loadScoutingProfile(playerId);
  if (!profile) return null;

  const { measurables: m, landing_spot_data: lsd, draft_round, draft_pick } = profile;

  // Resolve position and age from Sleeper player DB
  const allPlayers = await fetchAllPlayers();
  const sleeperPlayer = allPlayers?.[playerId as keyof typeof allPlayers] as
    | { position?: string; age?: number }
    | undefined;

  const position = toTFOPos(
    (m as { position?: string }).position ?? sleeperPlayer?.position ?? 'WR',
  );
  const age = (m as { age?: number }).age ?? sleeperPlayer?.age ?? 22;

  // Compute all 4 components
  const { score: athleticScore, flags: athleticFlags } = computeAthleticScore(position, m);
  const { score: productionScore, flags: productionFlags } = computeProductionScore(m);
  const { score: draftCapitalScore, flags: draftFlags } = computeDraftCapitalScore(draft_round, draft_pick);
  const { score: landingSpotScore, flags: landingFlags } = computeLandingSpotScore(position, age, lsd);

  // Weighted composite
  const rawScore =
    athleticScore    * 0.25 +
    productionScore  * 0.30 +
    draftCapitalScore * 0.20 +
    landingSpotScore * 0.25;

  const rts_score = Math.round(clamp(rawScore) * 10) / 10;
  const grade = gradeFromScore(rts_score);
  const translation_confidence = deriveConfidence(m, lsd, draft_round);
  const projected_tfo_year2 = projectTFOYear2(rts_score, position, age, landingSpotScore);
  const flags = collectFlags(athleticFlags, productionFlags, draftFlags, landingFlags);
  const calculated_at = new Date().toISOString();

  const result: RTSResult = {
    player_id: playerId,
    rts_score,
    grade,
    translation_confidence,
    projected_tfo_year2,
    athletic_score: Math.round(athleticScore * 10) / 10,
    production_score: Math.round(productionScore * 10) / 10,
    draft_capital_score: Math.round(draftCapitalScore * 10) / 10,
    landing_spot_score: Math.round(landingSpotScore * 10) / 10,
    flags,
    calculated_at,
  };

  // Persist rts_score back to scouting_profiles
  await supabase
    .from('scouting_profiles')
    .update({ rts_score, updated_at: calculated_at })
    .eq('player_id', playerId);

  return result;
}

// ─── getRTSGrade — lightweight lookup, compute if stale/missing ───────────────

export async function getRTSGrade(
  playerId: string,
): Promise<{ grade: RTSGrade; rts_score: number } | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('scouting_profiles')
    .select('rts_score')
    .eq('player_id', playerId)
    .maybeSingle();

  const stored = (data as { rts_score?: number | null } | null)?.rts_score;

  if (stored != null) {
    return { grade: gradeFromScore(stored), rts_score: stored };
  }

  // Not cached — compute on the fly
  const result = await calculateRTS(playerId);
  if (!result) return null;
  return { grade: result.grade, rts_score: result.rts_score };
}

// ─── Batch processor ─────────────────────────────────────────────────────────

export async function calculateRTSBatch(playerIds: string[]): Promise<RTSResult[]> {
  const results: RTSResult[] = [];
  for (const pid of playerIds) {
    try {
      const r = await calculateRTS(pid);
      if (r) results.push(r);
    } catch {
      // Skip individual failures silently
    }
  }
  return results;
}

// ─── Legacy adapter (for any existing callers with RTSInput shape) ────────────

export interface RTSInput {
  player_id: string;
  position: TFOPosition;
  age: number;
  forty_time?: number;
  ras_score?: number;
  college_ypr?: number;
  dominator_rating?: number;
  draft_round?: number;
  draft_pick?: number;
  college_targets_per_game?: number;
  nfl_team?: string;
  oc_scheme?: string;
  starter_expectation?: boolean;
}

/** @deprecated Use calculateRTS(playerId) — fetches from scouting_profiles */
export async function calculateRTSFromInput(input: RTSInput): Promise<RTSResult | null> {
  const supabase = createAdminClient();

  // Upsert a minimal scouting_profiles row so calculateRTS can find it
  const measurables: Measurables = {
    forty_time: input.forty_time,
    ras_score: input.ras_score,
    dom_score: input.dominator_rating,
    breakout_age: undefined,
    competition_level: 'power5',
    position: input.position,
    age: input.age,
  };
  const landing_spot_data: LandingSpotData = {
    depth_chart: input.starter_expectation ? 'starter' : 'competing',
    oc_scheme: input.oc_scheme,
  };

  await supabase.from('scouting_profiles').upsert(
    {
      player_id: input.player_id,
      draft_round: input.draft_round,
      draft_pick: input.draft_pick,
      measurables,
      landing_spot_data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  );

  return calculateRTS(input.player_id);
}
