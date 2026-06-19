import type { RotationPlayer } from './rotation';

export type TickerDirection = 'up' | 'down' | 'neutral';

export type Direction60d = 'up' | 'down' | 'neutral';

const UP_VERDICTS = new Set(['BUY', 'BOOM']);
const DOWN_VERDICTS = new Set(['SELL', 'BUST']);

export function normalizeDirection60d(raw: string | null | undefined): Direction60d | null {
  if (!raw) return null;
  const d = raw.trim().toLowerCase();
  if (d === 'up') return 'up';
  if (d === 'down') return 'down';
  if (d === 'neutral') return 'neutral';
  return null;
}

/** Strong engine-vs-market divergence (no dedicated DB flag yet). */
export function hasValueSignalBoost(rankDelta: number | null | undefined): boolean {
  return rankDelta != null && Number.isFinite(rankDelta) && Math.abs(rankDelta) > 15;
}

export function tickerDirection(
  verdict: string | null | undefined,
  direction60d: Direction60d | null,
): TickerDirection {
  const v = (verdict ?? '').toUpperCase();
  if (UP_VERDICTS.has(v) || direction60d === 'up') return 'up';
  if (DOWN_VERDICTS.has(v) || direction60d === 'down') return 'down';
  return 'neutral';
}

export function tickerReason(
  rankDelta: number | null | undefined,
  verdict: string | null | undefined,
  direction60d: Direction60d | null,
  valueSignalBoost: boolean,
): string {
  if (valueSignalBoost) return 'Value divergence detected';
  if (direction60d === 'up') return 'BOB sees upside vs market';
  if (direction60d === 'down') return 'BOB sees decline risk';
  if (rankDelta != null && rankDelta > 15) return 'Market undervaluing';
  if (rankDelta != null && rankDelta < -15) return 'Market overvaluing';
  return 'Monitor';
}

export function formatTickerDelta(rankDelta: number | null | undefined, direction: TickerDirection): string {
  if (rankDelta != null && Number.isFinite(rankDelta) && rankDelta !== 0) {
    const sign = rankDelta > 0 ? '+' : '';
    return `${sign}${Math.round(rankDelta)}`;
  }
  if (direction === 'up') return '+—';
  if (direction === 'down') return '−—';
  return '—';
}

export function tickerArrow(direction: TickerDirection): string {
  if (direction === 'up') return '▲';
  if (direction === 'down') return '▼';
  return '≡';
}

export function tickerAccentColor(direction: TickerDirection): string {
  if (direction === 'up') return '#36E7A1';
  if (direction === 'down') return '#A78BFA';
  return '#64748B';
}

export function buildTickerDisplay(p: RotationPlayer) {
  const mv = p.marketVerdict;
  const rankDelta = mv?.rankDelta ?? null;
  const verdict = mv?.noMarketData ? null : mv?.verdict ?? null;
  const direction60d = p.valueSignal?.direction60d ?? null;
  const valueSignalBoost = hasValueSignalBoost(rankDelta);
  const direction = tickerDirection(verdict, direction60d);

  return {
    name: p.name?.trim() || 'Unknown Player',
    direction,
    arrow: tickerArrow(direction),
    color: tickerAccentColor(direction),
    delta: formatTickerDelta(rankDelta, direction),
    reason: tickerReason(rankDelta, verdict, direction60d, valueSignalBoost),
  };
}
