export function getVerdict(score: number) {
  if (score >= 80) return { label: 'STRONG BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 70) return { label: 'BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 60) return { label: 'HOLD', color: '#FBBF24', class: 'hold' as const };
  if (score >= 50) return { label: 'BUST', color: '#A78BFA', class: 'bust' as const };
  return { label: 'STRONG BUST', color: '#A78BFA', class: 'bust' as const };
}

export function getTier(score: number) {
  if (score >= 90) return 'Elite Asset';
  if (score >= 80) return 'Strong Asset';
  if (score >= 70) return 'Stable Asset';
  if (score >= 60) return 'Developing';
  if (score >= 50) return 'Monitor';
  return 'High Risk';
}

/** Short performance-grade label (descriptive quality, NOT an action signal). */
export function getGradeLabel(score: number): string {
  return getTier(score).toUpperCase();
}

export function getCardBorderStyle(label: string): { border: string; boxShadow?: string } {
  switch (label) {
    case 'STRONG BOOM':
      return { border: '2px solid #36E7A1', boxShadow: '0 0 12px rgba(54,231,161,0.3)' };
    case 'BOOM':
      return { border: '1px solid #36E7A1' };
    case 'HOLD':
      return { border: '1px solid #FBBF24' };
    case 'BUST':
      return { border: '1px solid #A78BFA' };
    case 'STRONG BUST':
      return { border: '2px solid #A78BFA', boxShadow: '0 0 12px rgba(167,139,250,0.3)' };
    default:
      return { border: '1px solid rgba(255,255,255,0.1)' };
  }
}

export function getTradeVerdictLabel(score: number): 'BOOM' | 'HOLD' | 'BUST' {
  const v = getVerdict(score);
  if (v.class === 'boom') return 'BOOM';
  if (v.class === 'hold') return 'HOLD';
  return 'BUST';
}

/** Radar axis fallbacks (0–100 scale) when sub-scores are unavailable. */
const RADAR_AXIS_WEIGHTS = [0.9, 0.85, 0.95, 0.8, 0.85] as const;

function radarFraction(score100: number): number {
  return Math.min(0.98, Math.max(0.15, score100 / 100));
}

export function deriveRadarVals(_playerId: string, tfoScore: number): number[] {
  const tfo =
    typeof tfoScore === 'number' && Number.isFinite(tfoScore) && tfoScore > 0 ? tfoScore : 50;
  return RADAR_AXIS_WEIGHTS.map((w) => radarFraction(tfo * w));
}

/** Honest axis labels for the real engine component radar (≤6 chars each). */
export const COMPONENT_AXIS_LABELS = ['OPS', 'SFS', 'YOY', 'SIT', 'PPG'] as const;

/**
 * Real radar from the engine's stored component scores — replaces the uniform
 * tfo-derived fallback. Inputs are the raw 0–100 component scores plus
 * projected PPG; PPG is normalised onto the same 0–100 scale (28 PPG ≈ max).
 * Returns 5 fractions (0.15–0.98) in COMPONENT_AXIS_LABELS order.
 */
export function radarValsFromComponents(c: {
  ops: number;
  sfs: number;
  yoysi: number;
  sit: number;
  projectedPpg: number;
}): number[] {
  return [
    radarFraction(c.ops),
    radarFraction(c.sfs),
    radarFraction(c.yoysi),
    radarFraction(c.sit),
    radarFraction((c.projectedPpg / 28) * 100),
  ];
}

/** True when at least one component is present — guards against an all-zero row. */
export function hasRealComponents(c: {
  ops: number;
  sfs: number;
  yoysi: number;
  sit: number;
}): boolean {
  return c.ops > 0 || c.sfs > 0 || c.yoysi > 0 || c.sit > 0;
}

/** Validated acquire cost — never underprices elite assets. */
export function acquireCostForScore(score: number): string {
  if (score > 80) return '1st + more';
  if (score >= 70) return '1st round pick';
  if (score >= 60) return '2nd round pick';
  if (score >= 50) return '3rd or later';
  return '3rd or later';
}

export function placeholderAcquireCost(score: number): string {
  return acquireCostForScore(score);
}

export function generateTradeReason(tfoScore: number, verdictLabel: string): string {
  if (tfoScore > 80) return 'Elite dynasty value, years from peak';
  if (tfoScore > 75 && (verdictLabel === 'BOOM' || verdictLabel === 'STRONG BOOM')) {
    return `BOB scores ${tfoScore.toFixed(1)} — strong buy window`;
  }
  if (tfoScore > 70) return 'Usage trending up, buy before market';
  if (tfoScore > 65) return 'Improving situation, ascending value';
  if (tfoScore > 60) return 'Solid floor with room to grow';
  return 'Speculative upside at current cost';
}
