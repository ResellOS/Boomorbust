// SALS — Score-Adjusted League Scarcity
// Full spec: BBSM_DOCS.md §1

export type SalsPosition = 'QB' | 'RB' | 'WR' | 'TE' | string;
export type LeagueSize = 10 | 12 | 16 | 32 | number;

export type SalsTier =
  | 'IMMORTAL'
  | 'ELITE_BUY'
  | 'BUY'
  | 'HOLD'
  | 'SELL'
  | 'NUKE_ALERT';

export interface SalsResult {
  score: number;
  tier: SalsTier;
  delta: number;
  /** Hex color for UI rendering */
  color: string;
  /** True when score ≥ 2500 — apply cyan glow in UI */
  isImmortal: boolean;
}

// ── Exponent by position ─────────────────────────────────────────────────────

function positionExponent(position: SalsPosition): number {
  const pos = position.toUpperCase();
  return pos === 'QB' || pos === 'RB' ? 1.2 : 0.8;
}

// ── Tier classification ──────────────────────────────────────────────────────

function classifyTier(score: number): SalsTier {
  if (score >= 2500) return 'IMMORTAL';
  if (score >= 1000) return 'ELITE_BUY';
  if (score >= 0) return 'BUY';
  if (score >= -999) return 'HOLD';
  if (score >= -2499) return 'SELL';
  return 'NUKE_ALERT';
}

const TIER_COLORS: Record<SalsTier, string> = {
  IMMORTAL:   '#06B6D4',
  ELITE_BUY:  '#06B6D4',
  BUY:        '#10B981',
  HOLD:       '#94A3B8',
  SELL:       '#F59E0B',
  NUKE_ALERT: '#EF4444',
};

// ── Core formula ─────────────────────────────────────────────────────────────

/**
 * SALS = (V_BBSM − V_Market) × (1 + Δ/100) × (L/12)^x
 *
 * Δ = (V_BBSM − V_Market) / V_Market × 100
 * x = 1.2 for QB/RB, 0.8 for all others
 * L = league size (10 | 12 | 16 | 32)
 */
export function calculateSals(
  vMarket: number,
  vBbsm: number,
  position: SalsPosition,
  leagueSize: LeagueSize = 12,
): SalsResult {
  if (vMarket <= 0) {
    return { score: 0, tier: 'HOLD', delta: 0, color: TIER_COLORS.HOLD, isImmortal: false };
  }

  const delta = ((vBbsm - vMarket) / vMarket) * 100;
  const x = positionExponent(position);
  const leagueScale = Math.pow(leagueSize / 12, x);
  const score = Math.round((vBbsm - vMarket) * (1 + delta / 100) * leagueScale);

  const tier = classifyTier(score);
  return {
    score,
    tier,
    delta: Math.round(delta * 10) / 10,
    color: TIER_COLORS[tier],
    isImmortal: score >= 2500,
  };
}

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Human-readable tier label for display. */
export const SALS_TIER_LABELS: Record<SalsTier, string> = {
  IMMORTAL:   'IMMORTAL',
  ELITE_BUY:  'ELITE BUY',
  BUY:        'BUY',
  HOLD:       'HOLD',
  SELL:       'SELL',
  NUKE_ALERT: 'NUKE ALERT',
};

/** Tailwind class string for the IMMORTAL cyan glow — apply to the card wrapper. */
export const IMMORTAL_GLOW_CLASS =
  'shadow-[0_0_20px_rgba(6,182,212,0.25)] border-[rgba(6,182,212,0.4)]';

/**
 * Returns true if the player card should render the IMMORTAL glow treatment.
 * Use this as the single source of truth across all components.
 */
export function shouldGlow(sals: SalsResult): boolean {
  return sals.isImmortal;
}

/**
 * Batch-calculate SALS for an array of player-like objects.
 * Useful for sorting rankings tables by SALS score.
 */
export function batchSals(
  players: Array<{
    vMarket: number;
    vBbsm: number;
    position: SalsPosition;
  }>,
  leagueSize: LeagueSize = 12,
): SalsResult[] {
  return players.map((p) => calculateSals(p.vMarket, p.vBbsm, p.position, leagueSize));
}
