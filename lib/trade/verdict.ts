import type { TradeVerdictBadge } from '@/lib/trade/types';

export function tradeVerdictFromDelta(netValue: number): TradeVerdictBadge {
  if (netValue > 10) return 'BOOM';
  if (netValue < -10) return 'MISS';
  return 'FAIR';
}

export function tradeVerdictClass(verdict: TradeVerdictBadge): string {
  if (verdict === 'BOOM') return 'text-boom';
  if (verdict === 'MISS') return 'text-[#ef4444]';
  return 'text-hold';
}

export function tradeVerdictHistClass(verdict: TradeVerdictBadge): string {
  if (verdict === 'BOOM') return 'hv-boom text-boom';
  if (verdict === 'MISS') return 'hv-miss text-[#ef4444]';
  return 'hv-fair text-hold';
}
