import type { BobCall, CallConfidence, CallRecommendation, CallResult } from './types';

export function confidenceFromPct(pct: number | null | undefined): CallConfidence {
  if (pct == null || pct < 55) return 'Lean';
  if (pct >= 71) return 'Smash';
  return 'Strong';
}

export function confidenceLabel(tier: CallConfidence): string {
  if (tier === 'Smash') return 'Smash';
  if (tier === 'Strong') return 'Strong';
  return 'Lean';
}

export function isBuySell(rec: CallRecommendation): boolean {
  return (
    rec === 'Buy Now' ||
    rec === 'Buy Window' ||
    rec === 'Sell Now' ||
    rec === 'Sell Window'
  );
}

export function isStartSit(rec: CallRecommendation): boolean {
  return rec === 'Start' || rec === 'Sit';
}

export function resultBorderColor(result: CallResult): string {
  if (result === 'WIN') return '#36E7A1';
  if (result === 'LOSS') return '#A78BFA';
  if (result === 'PENDING') return '#FBBF24';
  return '#64748B';
}

export function resultEmoji(rec: CallRecommendation, result: CallResult): string {
  if (result === 'PENDING') return '🟡';
  if (result === 'INVALIDATED') return '⚪';
  if (isBuySell(rec)) {
    const sell = rec === 'Sell Now' || rec === 'Sell Window';
    if (result === 'WIN') return sell ? '🔴' : '🟢';
    return sell ? '🟢' : '🔴';
  }
  if (result === 'WIN') return '🟢';
  if (result === 'LOSS') return '🔴';
  return '🟡';
}

export function formatCallDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return '--';
  return `${v.toFixed(digits)}%`;
}

export function parseRecommendation(raw: string): CallRecommendation {
  const s = raw.trim();
  const map: Record<string, CallRecommendation> = {
    'BUY NOW': 'Buy Now',
    'BUY WINDOW': 'Buy Window',
    'SELL NOW': 'Sell Now',
    'SELL WINDOW': 'Sell Window',
    START: 'Start',
    SIT: 'Sit',
  };
  return map[s.toUpperCase()] ?? 'Start';
}

export function parseResult(raw: string): CallResult {
  const s = raw.trim().toUpperCase();
  if (s === 'WIN' || s === 'CORRECT' || s === 'HIT') return 'WIN';
  if (s === 'LOSS' || s === 'INCORRECT' || s === 'MISS') return 'LOSS';
  if (s === 'PUSH') return 'PUSH';
  if (s === 'INVALIDATED' || s === 'INVALID') return 'INVALIDATED';
  return 'PENDING';
}

export function sortByOutcomeMagnitude(a: BobCall, b: BobCall, desc: boolean): number {
  const av = Math.abs(a.outcomePct ?? 0);
  const bv = Math.abs(b.outcomePct ?? 0);
  return desc ? bv - av : av - bv;
}
