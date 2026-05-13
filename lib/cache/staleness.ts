/**
 * Cache staleness helpers — categorize data freshness for UI indicators.
 *
 * Tiers:
 *   LIVE   < 1 hr   (green  #22c55e)
 *   RECENT 1-6 hrs  (green  #22c55e)
 *   AGING  6-24 hrs (amber  #FBBF24)
 *   STALE  > 24 hrs (red    #EF4444)
 */

export type StalenessTier = 'LIVE' | 'RECENT' | 'AGING' | 'STALE';

export interface StalenessResult {
  tier: StalenessTier;
  color: string;
  label: string;
  ageHours: number;
}

export function getStaleness(calculatedAt: string | null | undefined): StalenessResult {
  if (!calculatedAt) {
    return { tier: 'STALE', color: '#EF4444', label: 'STALE', ageHours: Infinity };
  }

  const ageMs = Date.now() - new Date(calculatedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1)  return { tier: 'LIVE',   color: '#22c55e', label: 'LIVE',   ageHours };
  if (ageHours < 6)  return { tier: 'RECENT', color: '#22c55e', label: 'RECENT', ageHours };
  if (ageHours < 24) return { tier: 'AGING',  color: '#FBBF24', label: 'AGING',  ageHours };
  return              { tier: 'STALE',  color: '#EF4444', label: 'STALE',  ageHours };
}

export function isStale(calculatedAt: string | null | undefined, maxAgeHours = 6): boolean {
  if (!calculatedAt) return true;
  const ageMs = Date.now() - new Date(calculatedAt).getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}

export function stalenessClass(tier: StalenessTier): string {
  if (tier === 'LIVE' || tier === 'RECENT') return 'text-[#22c55e]';
  if (tier === 'AGING') return 'text-[#FBBF24]';
  return 'text-[#EF4444]';
}
