/**
 * DPEM (Dynasty Player Expected Movement) — projected KTC value change over 12 months.
 *
 * Formula:
 *   DPEM = (Age_Curve_Delta × 0.40) + (TFO_Trajectory × 0.35) + (Market_Lag × 0.25)
 *
 * Output range: -50 to +50 (negative = expected KTC decline, positive = expected rise).
 * Displayed as: "+12 RISING" / "-18 DECLINING" / "0 STABLE"
 */

export type DPEMTrend = 'RISING' | 'STABLE' | 'DECLINING';

export interface DPEMInput {
  /** Current age. */
  age: number;
  /** Age next season (age + 1). */
  age_next: number;
  /** Current age curve multiplier (0.48–1.0). */
  age_curve_now: number;
  /** Next-season age curve multiplier. */
  age_curve_next: number;
  /** TFO trend over last 3 cache entries: +10 = rising, -10 = falling. */
  tfo_trend: number;
  /** BVI delta vs KTC (positive = market undervalues). */
  bvi_market_lag: number;
}

export interface DPEMResult {
  dpem_score: number;
  dpem_trend: DPEMTrend;
  display: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calculateDPEM(input: DPEMInput): DPEMResult {
  // Age curve delta: how much does the curve shift next year?
  // Converted to -50..+50 scale
  const curveDelta = (input.age_curve_next - input.age_curve_now) * 100;
  const curveComponent = clamp(curveDelta * 2, -50, 50);

  // TFO trajectory: +10 maps to +50, -10 maps to -50
  const tfoComponent = clamp(input.tfo_trend * 5, -50, 50);

  // Market lag: positive delta = market will catch up → expected rise
  const marketComponent = clamp(input.bvi_market_lag / 100, -50, 50);

  const dpem_score = Math.round(
    curveComponent * 0.40 +
    tfoComponent * 0.35 +
    marketComponent * 0.25,
  );

  const clamped = clamp(dpem_score, -50, 50);
  const dpem_trend: DPEMTrend = clamped > 5 ? 'RISING' : clamped < -5 ? 'DECLINING' : 'STABLE';
  const sign = clamped > 0 ? '+' : '';
  const display = `${sign}${clamped} ${dpem_trend}`;

  return { dpem_score: clamped, dpem_trend, display };
}
