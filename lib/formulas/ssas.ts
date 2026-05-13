/**
 * SSAS (Start/Sit Advantage Score) — weekly start/sit decision confidence, 0-100.
 *
 * Formula:
 *   SSAS = (DMS × 0.40) + (TFO_Grade × 0.35) + (SOSPP_3W × 0.25)
 *
 * Score ≥ 70: clear START | 50-69: lean start | 35-49: lean sit | < 35: SIT
 */

export type SSASRecommendation = 'START' | 'LEAN_START' | 'LEAN_SIT' | 'SIT';

export interface SSASInput {
  /** DMS score (0-100). */
  dms_score: number;
  /** TFO score (0-100). */
  tfo_score: number;
  /** SOSPP next 3 weeks avg grade (0-100). */
  sospp_3w: number;
}

export interface SSASResult {
  ssas_score: number;
  recommendation: SSASRecommendation;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function calculateSSAS(input: SSASInput): SSASResult {
  const ssas_score = Math.round(
    clamp(input.dms_score) * 0.40 +
    clamp(input.tfo_score) * 0.35 +
    clamp(input.sospp_3w) * 0.25,
  );

  const recommendation: SSASRecommendation =
    ssas_score >= 70 ? 'START'
    : ssas_score >= 50 ? 'LEAN_START'
    : ssas_score >= 35 ? 'LEAN_SIT'
    : 'SIT';

  return { ssas_score: clamp(ssas_score), recommendation };
}
