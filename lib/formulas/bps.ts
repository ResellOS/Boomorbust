/**
 * BPS (Breakout Potential Score) — waiver wire breakout likelihood, 0-100.
 *
 * Formula:
 *   BPS = (P3W_Projected × 0.45) + (Trend_Velocity × 0.30) + (Roster_Need_Weight × 0.25)
 *
 * Score ≥ 75 → triggers BREAKOUT_ALERT notification.
 */

export interface BPSInput {
  /** Projected fantasy points for next 3 weeks (avg per week, 0-40 typical range). */
  p3w_projected: number;
  /** TFO score trend velocity — delta between latest and 3-week-ago TFO, range -30 to +30. */
  trend_velocity: number;
  /** Roster need weight: 0 = not needed, 50 = depth, 100 = direct starter gap. */
  roster_need_weight: number;
}

export interface BPSResult {
  bps_score: number;
  /** True when score ≥ 75 — triggers a BREAKOUT_ALERT. */
  breakout_signal: boolean;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calculateBPS(input: BPSInput): BPSResult {
  // Normalize P3W projected (assume 28 pts/week = elite = 100)
  const p3wNorm = clamp((input.p3w_projected / 28) * 100);
  // Normalize trend velocity: +30 = 100, -30 = 0, 0 = 50
  const trendNorm = clamp(50 + (input.trend_velocity / 30) * 50);
  const rosterNorm = clamp(input.roster_need_weight);

  const bps_score = Math.round(
    p3wNorm * 0.45 + trendNorm * 0.30 + rosterNorm * 0.25,
  );

  return { bps_score: clamp(bps_score), breakout_signal: bps_score >= 75 };
}
