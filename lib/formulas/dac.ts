/**
 * DAC (Dynasty Asset Cost) — verdict on whether a player is priced correctly
 * for their dynasty age-curve position and TFO trajectory.
 *
 * Formula:
 *   DAC = (Age_Curve_Adj × 0.40) + (TFO_Trajectory × 0.35) + (Market_Timing × 0.25)
 *
 * Verdict thresholds:
 *   ≥ 65: BUY
 *   50-64: HOLD
 *   35-49: SELL
 *   < 35: NUKE
 */

export type DACVerdict = 'BUY' | 'HOLD' | 'SELL' | 'NUKE';

export interface DACInput {
  /** TFO score (0-100). */
  tfo_score: number;
  /** Age curve multiplier from ageCurveMultiplier() — 0.48–1.0. */
  age_curve_mult: number;
  /** KTC value (0–10000). */
  ktc_value: number;
  /** TFO trend: +10 = rising, -10 = falling, 0 = flat. */
  tfo_trend: number;
}

export interface DACResult {
  dac_score: number;
  dac_verdict: DACVerdict;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calculateDAC(input: DACInput): DACResult {
  // Age curve adjusted score
  const ageCurveAdj = clamp(input.age_curve_mult * 100);

  // TFO trajectory: 0-100 with trend bonus
  const tfoTrajectory = clamp(input.tfo_score + input.tfo_trend * 0.5);

  // Market timing: is KTC price below/above what age curve + TFO suggest?
  // KTC 10000 = elite (100), 0 = worthless (0)
  const ktcNorm = clamp(input.ktc_value / 100);
  const expectedValue = (ageCurveAdj * 0.5 + input.tfo_score * 0.5);
  // Positive = market undervalues, negative = market overvalues
  const marketTiming = clamp(50 + (expectedValue - ktcNorm) * 0.5);

  const dac_score = Math.round(
    ageCurveAdj * 0.40 + tfoTrajectory * 0.35 + marketTiming * 0.25,
  );

  const verdict: DACVerdict =
    dac_score >= 65 ? 'BUY'
    : dac_score >= 50 ? 'HOLD'
    : dac_score >= 35 ? 'SELL'
    : 'NUKE';

  return { dac_score: clamp(dac_score), dac_verdict: verdict };
}
