/**
 * RTS (Rookie Transition Score) — bridges F-FIG athleticism data → TFO,
 * evaluating dynasty upside for first-year players.
 *
 * RTS = (Athletic Score × 0.25) + (Production Score × 0.30)
 *     + (Draft Capital × 0.20) + (Landing Spot × 0.25)
 *
 * Triggers Year-2 TFO handoff when available.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RTSGrade = 'ELITE' | 'HIGH_UPSIDE' | 'VIABLE' | 'DEVELOPMENTAL' | 'AVOID';

export interface RTSInput {
  player_id: string;
  position: TFOPosition;
  age: number;
  /** 40-yard dash time. */
  forty_time?: number;
  /** Relative Athletic Score (0–10 scale). */
  ras_score?: number;
  /** College yards per carry or yards per reception. */
  college_ypr?: number;
  /** College dominator rating (0–100). */
  dominator_rating?: number;
  /** NFL Draft round (1–7). */
  draft_round?: number;
  /** NFL Draft pick number overall. */
  draft_pick?: number;
  /** Receiving targets per game in college. */
  college_targets_per_game?: number;
  /** NFL team abbreviation (for scheme lookup). */
  nfl_team?: string;
  /** NFL offensive coordinator scheme string. */
  oc_scheme?: string;
  /** Whether starter role is expected (depth chart #1). */
  starter_expectation?: boolean;
}

export interface RTSResult {
  player_id: string;
  rts_score: number;
  grade: RTSGrade;
  athletic_score: number;
  production_score: number;
  draft_capital_score: number;
  landing_spot_score: number;
  year2_tfo_ready: boolean;
  flags: string[];
  reasoning: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function gradeFromScore(score: number): RTSGrade {
  if (score >= 80) return 'ELITE';
  if (score >= 65) return 'HIGH_UPSIDE';
  if (score >= 50) return 'VIABLE';
  if (score >= 35) return 'DEVELOPMENTAL';
  return 'AVOID';
}

// ─── Component 1: Athletic Score (0–100) ─────────────────────────────────────

function computeAthleticScore(input: RTSInput): number {
  let score = 50; // neutral base

  const { position, forty_time, ras_score } = input;

  if (ras_score != null) {
    // RAS is 0–10; normalize to 0–100
    score = ras_score * 10;
  } else if (forty_time != null) {
    // Position-specific 40 benchmarks
    const benchmarks: Record<TFOPosition, { elite: number; avg: number }> = {
      WR: { elite: 4.38, avg: 4.53 },
      RB: { elite: 4.40, avg: 4.54 },
      TE: { elite: 4.52, avg: 4.68 },
      QB: { elite: 4.50, avg: 4.72 },
    };
    const bench = benchmarks[position];
    const range = bench.avg - bench.elite;
    const relSpeed = (bench.avg - forty_time) / range;
    score = clamp(50 + relSpeed * 50);
  }

  // Age curve boost for very young athletes (21 or under entering NFL)
  if (input.age <= 21) score += 5;

  return clamp(score);
}

// ─── Component 2: Production Score (0–100) ───────────────────────────────────

function computeProductionScore(input: RTSInput): number {
  let score = 50;

  const { position, college_ypr, dominator_rating, college_targets_per_game } = input;

  if (dominator_rating != null) {
    // Dynasty-relevant dominator benchmarks: elite >30%, avg ~18%
    score = clamp(dominator_rating * 2.5);
  }

  if (college_ypr != null) {
    if (position === 'RB') {
      score += college_ypr >= 7 ? 15 : college_ypr >= 5.5 ? 5 : -5;
    } else if (position === 'WR' || position === 'TE') {
      score += college_ypr >= 15 ? 15 : college_ypr >= 12 ? 5 : -5;
    }
  }

  if (position === 'TE' && college_targets_per_game != null) {
    score += college_targets_per_game >= 5 ? 10 : college_targets_per_game >= 3 ? 5 : 0;
  }

  return clamp(score);
}

// ─── Component 3: Draft Capital (0–100) ──────────────────────────────────────

function computeDraftCapitalScore(draftRound?: number, draftPick?: number): number {
  if (draftRound == null) return 50;

  const roundScore: Record<number, number> = {
    1: 90,
    2: 72,
    3: 56,
    4: 42,
    5: 32,
    6: 22,
    7: 14,
  };
  let base = roundScore[draftRound] ?? 10;

  // Within-round pick adjustment (top-10 pick bump)
  if (draftRound === 1 && draftPick != null) {
    if (draftPick <= 10) base += 8;
    else if (draftPick <= 15) base += 4;
  }

  return clamp(base);
}

// ─── Component 4: Landing Spot (0–100) ───────────────────────────────────────

async function computeLandingSpotScore(input: RTSInput): Promise<number> {
  let score = 55;

  const { nfl_team, oc_scheme, starter_expectation, position } = input;

  if (starter_expectation) score += 15;

  if (oc_scheme) {
    const scheme = oc_scheme.toLowerCase();
    // Pass-heavy scheme boosts for skill positions
    if (
      (scheme.includes('air') && scheme.includes('raid')) ||
      scheme.includes('mcvay') ||
      scheme.includes('reid')
    ) {
      if (position === 'WR' || position === 'TE') score += 10;
    }
    // Run-first is bad for WR/TE rookies
    if (scheme.includes('run_first') && (position === 'WR' || position === 'TE')) score -= 8;
  }

  // DB lookup for team opportunity context
  if (nfl_team) {
    const supabase = createAdminClient();
    const { data: teamRow } = await supabase
      .from('team_context')
      .select('opportunity_score')
      .eq('team', nfl_team)
      .maybeSingle();

    const oppScore = (teamRow as { opportunity_score?: number } | null)?.opportunity_score;
    if (oppScore != null) {
      score += (oppScore - 50) * 0.3;
    }
  }

  return clamp(score);
}

// ─── Flags ────────────────────────────────────────────────────────────────────

function buildFlags(input: RTSInput, athleticScore: number, productionScore: number): string[] {
  const flags: string[] = [];
  if (athleticScore >= 85) flags.push('ELITE_ATHLETE');
  if (productionScore >= 75) flags.push('COLLEGE_PRODUCER');
  if ((input.draft_round ?? 99) === 1 && (input.draft_pick ?? 99) <= 15) flags.push('TOP_15_PICK');
  if (input.age <= 21) flags.push('YOUNG_FOR_CLASS');
  if (!input.starter_expectation) flags.push('DEPTH_CHART_RISK');
  return flags;
}

// ─── Reasoning ────────────────────────────────────────────────────────────────

function buildReasoning(
  input: RTSInput,
  grade: RTSGrade,
  athleticScore: number,
  productionScore: number,
  draftCapScore: number,
  landingScore: number,
): string {
  const parts: string[] = [];
  const pos = input.position;

  if (grade === 'ELITE') {
    parts.push(`${pos} projects as an elite dynasty asset from Day 1.`);
  } else if (grade === 'HIGH_UPSIDE') {
    parts.push(`Strong ${pos} prospect with high dynasty ceiling.`);
  } else if (grade === 'VIABLE') {
    parts.push(`${pos} is a legitimate depth piece with starter upside.`);
  } else {
    parts.push(`${pos} needs development time before fantasy relevance.`);
  }

  if (athleticScore >= 80) parts.push('Elite athleticism profile.');
  if (productionScore >= 75) parts.push('Dominant college production.');
  if (draftCapScore >= 85) parts.push('Top draft capital signals heavy investment from team.');
  if (!input.starter_expectation) parts.push('Depth chart competition creates risk.');

  return parts.join(' ');
}

// ─── Main: calculateRTS ───────────────────────────────────────────────────────

export async function calculateRTS(input: RTSInput): Promise<RTSResult> {
  const athleticScore = computeAthleticScore(input);
  const productionScore = computeProductionScore(input);
  const draftCapitalScore = computeDraftCapitalScore(input.draft_round, input.draft_pick);
  const landingSpotScore = await computeLandingSpotScore(input);

  const rawScore =
    athleticScore * 0.25 +
    productionScore * 0.30 +
    draftCapitalScore * 0.20 +
    landingSpotScore * 0.25;

  const rts_score = Math.round(clamp(rawScore) * 10) / 10;
  const grade = gradeFromScore(rts_score);

  // Year 2 TFO handoff: score >= 50 and player has real NFL team context
  const year2_tfo_ready = rts_score >= 50 && !!input.nfl_team;

  const flags = buildFlags(input, athleticScore, productionScore);
  const reasoning = buildReasoning(
    input,
    grade,
    athleticScore,
    productionScore,
    draftCapitalScore,
    landingSpotScore,
  );

  // Cache to bbv_values if player exists
  const supabase = createAdminClient();
  await supabase
    .from('bbv_values')
    .update({ rts_score: rts_score })
    .eq('player_id', input.player_id);

  return {
    player_id: input.player_id,
    rts_score,
    grade,
    athletic_score: Math.round(athleticScore * 10) / 10,
    production_score: Math.round(productionScore * 10) / 10,
    draft_capital_score: Math.round(draftCapitalScore * 10) / 10,
    landing_spot_score: Math.round(landingSpotScore * 10) / 10,
    year2_tfo_ready,
    flags,
    reasoning,
  };
}

// ─── getBatchRTS ──────────────────────────────────────────────────────────────

export async function getBatchRTS(inputs: RTSInput[]): Promise<RTSResult[]> {
  const results: RTSResult[] = [];
  for (const input of inputs) {
    try {
      results.push(await calculateRTS(input));
    } catch {
      // Skip individual failures
    }
  }
  return results;
}
