/**
 * RI (Roster Impact) — how much starting this player improves your lineup, 0-100.
 *
 * Formula:
 *   RI = (TFO_Percentile × 0.50) + (Positional_Scarcity × 0.30) + (Roster_Need × 0.20)
 *
 * High RI = this player meaningfully improves your roster strength.
 */

export interface RIInput {
  /** TFO score (0-100). */
  tfo_score: number;
  /**
   * TFO percentile within the player's position tier (0-100).
   * e.g. 85th percentile WR → 85.
   */
  tfo_percentile: number;
  /** Positional scarcity score (0-100). QB/TE typically higher than WR. */
  positional_scarcity: number;
  /** Whether this position is a current roster need (100 = gap, 0 = oversupply). */
  roster_need: number;
}

export interface RIResult {
  ri_score: number;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calculateRI(input: RIInput): RIResult {
  const ri_score = Math.round(
    clamp(input.tfo_percentile) * 0.50 +
    clamp(input.positional_scarcity) * 0.30 +
    clamp(input.roster_need) * 0.20,
  );
  return { ri_score: clamp(ri_score) };
}
