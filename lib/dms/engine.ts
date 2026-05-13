/**
 * DMS (Dynasty Matchup Score) — weekly matchup favorability engine.
 *
 * Formula:
 *   DMS = (MatchupGrade × 0.50) + (GameScript × 0.30) + (ConditionsGrade × 0.20)
 *
 * MatchupGrade: opponent defense rank converted to 0-100 (rank 32 = softest = 95, rank 1 = hardest = 30)
 * GameScript:   team's vegas implied total proxy (higher = more favorable passing game volume)
 * ConditionsGrade: dome / wind / precipitation modifiers
 *
 * Tiers: BOOM (≥75) | FAVORABLE (58-74) | STABLE (40-57) | TOUGH (25-39) | BUST (<25)
 */

import {
  getPassDefenseRank,
  getRushDefenseRank,
  defenseRankToMatchupGrade,
} from '@/lib/external/matchups';

// ─── Public types ─────────────────────────────────────────────────────────────

export type DMSTier = 'BOOM' | 'FAVORABLE' | 'STABLE' | 'TOUGH' | 'BUST';

export interface DMSInput {
  position: 'QB' | 'RB' | 'WR' | 'TE';
  /** Player's NFL team abbreviation (e.g. 'KC', 'SF'). */
  playerTeam: string;
  /** Opponent NFL team abbreviation. */
  opponentTeam: string;
  /** True if the player's team is the home team. */
  isHome?: boolean;
  /** Team's vegas implied point total for the game (typical range: 15–35). */
  vegasImplied?: number;
  /** True for indoor dome games — removes weather penalty entirely. */
  isDome?: boolean;
  /** Wind speed in mph at game site. */
  windSpeed?: number;
  /** Probability of precipitation 0–100. */
  precipChance?: number;
}

export interface DMSResult {
  dms_score: number;
  dms_tier: DMSTier;
  /** Raw opponent defense matchup grade 0-100 (component 1, 50% weight). */
  matchup_grade: number;
  /** Situational risk/boost flags surfaced in UI. */
  flags: string[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function defenseRankForPosition(opponentTeam: string, position: string): number {
  return ['QB', 'WR', 'TE'].includes(position.toUpperCase())
    ? getPassDefenseRank(opponentTeam)
    : getRushDefenseRank(opponentTeam);
}

function gameScriptScore(vegasImplied?: number, isHome?: boolean): number {
  // Implied total 15 → 0, 23 → 50 (neutral), 35+ → 100
  const base =
    vegasImplied != null ? clamp(((vegasImplied - 15) / 20) * 100) : 50;
  return clamp(base + (isHome ? 5 : 0));
}

function conditionsGrade(
  isDome?: boolean,
  windSpeed?: number,
  precipChance?: number,
): number {
  if (isDome) return 100;
  let score = 80;
  if (windSpeed != null) {
    if (windSpeed >= 20) score -= 20;
    else if (windSpeed >= 15) score -= 12;
    else if (windSpeed >= 10) score -= 5;
  }
  if (precipChance != null) {
    if (precipChance >= 80) score -= 15;
    else if (precipChance >= 50) score -= 8;
  }
  return clamp(score);
}

function tierFromScore(score: number): DMSTier {
  if (score >= 75) return 'BOOM';
  if (score >= 58) return 'FAVORABLE';
  if (score >= 40) return 'STABLE';
  if (score >= 25) return 'TOUGH';
  return 'BUST';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateDMS(input: DMSInput): DMSResult {
  const flags: string[] = [];

  const defenseRank = defenseRankForPosition(input.opponentTeam, input.position);
  const matchup_grade = defenseRankToMatchupGrade(defenseRank);
  const gameScript = gameScriptScore(input.vegasImplied, input.isHome);
  const conditions = conditionsGrade(input.isDome, input.windSpeed, input.precipChance);

  const raw = matchup_grade * 0.5 + gameScript * 0.3 + conditions * 0.2;
  const dms_score = Math.round(clamp(raw) * 10) / 10;
  const dms_tier = tierFromScore(dms_score);

  if (defenseRank <= 5) flags.push('ELITE_DEFENSE');
  if (defenseRank >= 28) flags.push('POROUS_DEFENSE');
  if (input.windSpeed != null && input.windSpeed >= 20) flags.push('HIGH_WIND_WARNING');
  if (input.vegasImplied != null && input.vegasImplied >= 30) flags.push('SHOOTOUT_GAME');
  if (input.vegasImplied != null && input.vegasImplied <= 17) flags.push('LOW_TOTAL_GAME');
  if (input.isDome) flags.push('DOME_GAME');

  return { dms_score, dms_tier, matchup_grade, flags };
}
