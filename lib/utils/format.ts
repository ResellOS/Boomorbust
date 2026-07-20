// Central display formatting.
//
// Every function is null / undefined / NaN-safe and returns an em dash for
// missing data — users must never see "NaN", "undefined", or "null" as text.
// Import these instead of hand-rolling number/date formatting in components.

export const EMPTY_DASH = '—';

function isBad(n: unknown): boolean {
  return n == null || (typeof n === 'number' && !Number.isFinite(n));
}

/** KTC / large integer counts with comma separators. 4200 → "4,200". */
export function formatKTC(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  return Math.round(value as number).toLocaleString('en-US');
}

/**
 * Large numbers with a K suffix at/above 100k; full comma form below.
 * 16000 → "16,000" · 150000 → "150K".
 */
export function formatCompact(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  const v = value as number;
  if (Math.abs(v) >= 100_000) return `${Math.round(v / 1000).toLocaleString('en-US')}K`;
  return Math.round(v).toLocaleString('en-US');
}

/**
 * Percentage with one decimal + "%". A value in (0,1) is treated as a ratio and
 * scaled. 71 → "71.0%" · 0.71 → "71.0%".
 */
export function formatPct(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  let v = value as number;
  if (v > 0 && v < 1) v *= 100;
  return `${v.toFixed(1)}%`;
}

/** TFO / one-decimal score. 97 → "97.0". */
export function formatTFO(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  return (value as number).toFixed(1);
}

/** 0–100 score as an integer (Portfolio Strength 57.6 → "57"). */
export function formatScore(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  return String(Math.round(value as number));
}

/** Rank with a hash prefix. 1 → "#1" · 74 → "#74". */
export function formatRank(rank: number | null | undefined): string {
  if (isBad(rank)) return EMPTY_DASH;
  return `#${Math.round(rank as number)}`;
}

/** Signed delta. 219 → "+219" · -50 → "-50" · 0 → "0". */
export function formatDelta(delta: number | null | undefined): string {
  if (isBad(delta)) return EMPTY_DASH;
  const v = Math.round(delta as number);
  return v > 0 ? `+${v.toLocaleString('en-US')}` : v.toLocaleString('en-US');
}

/** Currency with "$" and two decimals. 15 → "$15.00" · 9.99 → "$9.99". */
export function formatCurrency(value: number | null | undefined): string {
  if (isBad(value)) return EMPTY_DASH;
  return `$${(value as number).toFixed(2)}`;
}

/** Human relative time from a millisecond age. */
function relativeFromMs(ageMs: number): string {
  if (!Number.isFinite(ageMs)) return EMPTY_DASH;
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} ago`;
}

/**
 * Human relative time from a date / ISO string / epoch-ms.
 * Never returns a raw ISO string or a giant minute count.
 */
export function formatTimeAgo(date: string | number | Date | null | undefined): string {
  if (date == null) return EMPTY_DASH;
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(t)) return EMPTY_DASH;
  return relativeFromMs(Date.now() - t);
}

/**
 * Human relative time from a pre-computed minute age. Many topbars carry a
 * minute delta rather than a timestamp; this keeps "21614 min ago" from ever
 * rendering — it becomes "15 days ago".
 */
export function formatMinutesAgo(minutes: number | null | undefined): string {
  if (isBad(minutes)) return EMPTY_DASH;
  return relativeFromMs((minutes as number) * 60_000);
}
