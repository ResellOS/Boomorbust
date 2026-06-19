// Percentile-based verdict assignment.
//
// SOURCE OF TRUTH: this mirrors the canonical formula service at
// BoomorBustFormula/lib/formula/engine.ts (percentileCutoffs + verdictByPercentile),
// the engine that nightly populates formula_scores.verdict. It is replicated here
// (the two repos can't share a module) so the local admin rescore in rescoreAll.ts
// produces the SAME taxonomy instead of the old fixed-threshold TFO bands.
//
// Verdicts are assigned by RANK within the scored pool, not by fixed score cutoffs
// (which skewed everything toward BUST because the TFO distribution sits well below
// 75). Buckets: top 5% / next 15% / middle 60% / next 15% / bottom 5% →
// BOOM / BUY / HOLD / SELL / BUST.

import type { MarketVerdict } from '@/lib/verdict/marketVerdict';

export interface PercentileCutoffs {
  p5: number;
  p20: number;
  p80: number;
  p95: number;
}

/** Compute the p5/p20/p80/p95 cutoffs of a score pool (linear interpolation). */
export function percentileCutoffs(scores: number[]): PercentileCutoffs {
  const s = scores.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  const q = (p: number): number => {
    if (s.length === 0) return 0;
    const idx = (s.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return s[lo]!;
    return s[lo]! + (s[hi]! - s[lo]!) * (idx - lo);
  };
  return { p5: q(0.05), p20: q(0.2), p80: q(0.8), p95: q(0.95) };
}

/** Map a TFO score to its percentile-bucket verdict within the pool. */
export function verdictByPercentile(score: number, c: PercentileCutoffs): MarketVerdict {
  if (score >= c.p95) return 'BOOM'; // top 5%
  if (score >= c.p80) return 'BUY'; // next 15%
  if (score >= c.p20) return 'HOLD'; // middle 60%
  if (score >= c.p5) return 'SELL'; // next 15%
  return 'BUST'; // bottom 5%
}
