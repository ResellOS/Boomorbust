export function getVerdict(score: number) {
  if (score >= 80) return { label: 'STRONG BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 70) return { label: 'BOOM', color: '#36E7A1', class: 'boom' as const };
  if (score >= 60) return { label: 'HOLD', color: '#FBBF24', class: 'hold' as const };
  if (score >= 50) return { label: 'BUST', color: '#A78BFA', class: 'bust' as const };
  return { label: 'STRONG BUST', color: '#A78BFA', class: 'bust' as const };
}

export function getTier(score: number) {
  if (score >= 80) return 'Elite Tier';
  if (score >= 70) return 'Solid Tier';
  if (score >= 60) return 'Weak Tier';
  return 'Avoid Tier';
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

export function placeholderAcquireCost(score: number): string {
  if (score >= 82) return 'Early 2nd + Flex';
  if (score >= 78) return 'Mid 2nd';
  if (score >= 76) return 'Late 2nd';
  if (score >= 71) return 'Late 2nd + 3rd';
  if (score >= 69) return '2nd + 3rd';
  if (score >= 64) return '3rd';
  if (score >= 59) return 'Late 3rd';
  return '3rd + 4th';
}
