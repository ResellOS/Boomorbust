import type { MarketVerdict } from '@/lib/verdict/marketVerdict';

/** Plain-English market verdict badges (internal enum values unchanged). */
export function formatMarketVerdictLabel(verdict: MarketVerdict): string {
  switch (verdict) {
    case 'BOOM':
      return 'Buy Now';
    case 'BUY':
      return 'Buy Window';
    case 'HOLD':
      return 'Hold';
    case 'SELL':
      return 'Sell Window';
    case 'BUST':
      return 'Sell Now';
  }
}

/** Legacy performance verdict pills (STRONG BOOM / HOLD / etc.). */
export function formatPerformanceVerdictLabel(label: string): string {
  const u = label.toUpperCase();
  if (u === 'STRONG BOOM' || u === 'BOOM' || u === 'LEAN BOOM') return 'Buy Now';
  if (u === 'STRONG BUST' || u === 'BUST' || u === 'LEAN BUST') return 'Sell Now';
  if (u === 'HOLD' || u === 'NEUTRAL') return 'Hold';
  return label;
}

/** Dynasty asset tier from score — user-facing label. */
export function formatDynastyAssetTier(score: number): string {
  if (score >= 90) return 'Elite Asset';
  if (score >= 80) return 'Strong Asset';
  if (score >= 70) return 'Stable Asset';
  if (score >= 60) return 'Developing';
  if (score >= 50) return 'Monitor';
  return 'High Risk';
}

export function formatDynastyAssetGrade(score: number): string {
  return formatDynastyAssetTier(score).toUpperCase();
}

/** Engine component breakdown — plain English axis labels. */
export const COMPONENT_UI_LABELS = [
  'Opportunity',
  'Scheme Fit',
  'Year-Over-Year',
  'Situation',
  'Projected Output',
] as const;

/** Map sidebar signal bucket keys to display labels. */
export function formatSignalBucketLabel(bucket: 'boom' | 'hold' | 'bust'): string {
  if (bucket === 'boom') return 'Buy Now';
  if (bucket === 'hold') return 'Hold';
  return 'Sell Now';
}

export type StartSitConfidenceTier = 'Lean' | 'Strong' | 'Smash';

/**
 * Start/Sit confidence tier — never shows raw % above 85 unless obviousCall
 * (e.g. injured starter out).
 *
 * 55–61% → Lean · 62–70% → Strong · 71%+ → Smash
 */
export function formatStartSitConfidence(
  rawPct: number,
  options?: { obviousCall?: boolean },
): StartSitConfidenceTier {
  const pct = options?.obviousCall ? rawPct : Math.min(85, rawPct);
  if (pct >= 71) return 'Smash';
  if (pct >= 62) return 'Strong';
  return 'Lean';
}

/** Tier colors — Lean yellow, Strong/Smash green (Strong at 70% opacity). */
export function startSitConfidenceStyle(tier: StartSitConfidenceTier): {
  color: string;
  opacity: number;
} {
  if (tier === 'Smash') return { color: '#36E7A1', opacity: 1 };
  if (tier === 'Strong') return { color: '#36E7A1', opacity: 0.7 };
  return { color: '#FBBF24', opacity: 1 };
}

/** Player Hub / legacy card verdict badges. */
export function formatLegacyVerdictLabel(verdict: 'BOOM' | 'BUST' | 'HOLD' | 'SELL'): string {
  switch (verdict) {
    case 'BOOM':
      return 'Buy Now';
    case 'SELL':
      return 'Sell Window';
    case 'HOLD':
      return 'Hold';
    case 'BUST':
      return 'Sell Now';
  }
}

/** Trade offer verdict badges (FAIR/MISS map to Hold / Sell Window). */
export function formatTradeOfferVerdict(verdict: string): string {
  const u = verdict.toUpperCase();
  if (u === 'BOOM' || u === 'FAIR') return u === 'BOOM' ? 'Buy Now' : 'Hold';
  if (u === 'MISS') return 'Sell Window';
  return formatPerformanceVerdictLabel(verdict);
}

/** Player Hub filter chips — internal keys unchanged. */
export const FILTER_VERDICT_LABELS: Record<string, string> = {
  ALL: 'All',
  BOOM: 'Buy Now',
  HOLD: 'Hold',
  BUST: 'Sell Now',
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
};

/** Engine performance grade pills (ELITE / HIGH VALUE / etc.). */
export function formatEngineGradeLabel(grade: string | null): string {
  if (!grade) return '';
  const map: Record<string, string> = {
    ELITE: 'Elite Asset',
    'HIGH VALUE': 'Strong Asset',
    VIABLE: 'Stable Asset',
    SPEC: 'Developing',
    SPECULATIVE: 'Developing',
    AVOID: 'High Risk',
  };
  return map[grade.toUpperCase()] ?? grade;
}
