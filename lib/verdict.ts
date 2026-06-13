export function getVerdict(score: number) {
  if (score >= 80) return { label: 'STRONG BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 70) return { label: 'BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 60) return { label: 'HOLD', color: '#FBBF24', class: 'hold' as const };
  if (score >= 50) return { label: 'BUST', color: '#A78BFA', class: 'bust' as const };
  return { label: 'STRONG BUST', color: '#A78BFA', class: 'bust' as const };
}

export function getTier(score: number) {
  if (score >= 90) return 'Elite Tier';
  if (score >= 80) return 'Strong Tier';
  if (score >= 70) return 'Solid Tier';
  if (score >= 60) return 'Average Tier';
  if (score >= 50) return 'Weak Tier';
  return 'Avoid Tier';
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

function seededUnit(seed: string, salt: number): number {
  let h = 0x811c9dc5;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 0.35 + (((h >>> 0) % 6001) / 10000);
}

export function deriveRadarVals(playerId: string, tfoScore: number): number[] {
  const base = tfoScore / 100;
  return Array.from({ length: 5 }, (_, i) =>
    Math.min(0.98, Math.max(0.15, base * seededUnit(playerId, i))),
  );
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
