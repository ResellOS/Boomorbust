export type AssetTier = 'diamond' | 'gem' | 'starter' | 'nuke';
export type PrimarySignal = 'BOOM' | 'BUST' | 'STABLE';

export interface RankedPlayer {
  id: string;
  name: string;
  position: string;
  age: number | null;
  ktcValue: number;
  /** 1-based rank within the player's position across the combined roster pool. */
  positionRank: number;
}

export interface AssetDistribution {
  diamonds: number; // Top 12 at position — elite dynasty assets
  gems: number;     // Ranks 13–36 at position — clear value / trade chips
  starters: number; // KTC >= 1500 outside top 36 — usable depth
  nukes: number;    // RB > 27 or WR > 30 — roster clogs eating bench spots
}

export interface HealthScoreInput {
  rankedPlayers: RankedPlayer[];
  /**
   * Draft picks rostered beyond the owner's own 1st in the next two years.
   * Each extra 1st adds +15 to the health score.
   */
  extra1stRoundPicks: number;
}

// ── Asset Classification ─────────────────────────────────────────────────────

/**
 * Nuke check takes priority: an aged veteran blocks a roster spot regardless
 * of their position rank.
 */
export function classifyAsset(player: RankedPlayer): AssetTier {
  const pos = player.position.toUpperCase();
  const age = player.age ?? 0;

  if ((pos === 'RB' && age > 27) || (pos === 'WR' && age > 30)) return 'nuke';
  if (player.positionRank <= 12) return 'diamond';
  if (player.positionRank <= 36) return 'gem';
  if (player.ktcValue >= 1500) return 'starter';
  return 'nuke';
}

// ── Health Score ─────────────────────────────────────────────────────────────

/**
 * Scores a league 0–100.
 *
 * Weights:
 *   +10  per Diamond  (Top-12 position rank)
 *   −5   per Nuke     (RB > 27 or WR > 30)
 *   +15  per extra 1st-round pick in next 2 years
 *
 * Base of 50 anchors a "no assets, no nukes" roster to STABLE territory.
 */
export function calculateLeagueHealthScore(input: HealthScoreInput): number {
  let score = 50;

  for (const player of input.rankedPlayers) {
    const tier = classifyAsset(player);
    if (tier === 'diamond') score += 10;
    else if (tier === 'nuke') score -= 5;
  }

  score += input.extra1stRoundPicks * 15;

  return Math.max(0, Math.min(100, score));
}

// ── Asset Distribution ───────────────────────────────────────────────────────

export function getAssetDistribution(players: RankedPlayer[]): AssetDistribution {
  const dist: AssetDistribution = { diamonds: 0, gems: 0, starters: 0, nukes: 0 };
  for (const p of players) {
    const tier = classifyAsset(p);
    dist[tier === 'diamond' ? 'diamonds' : tier === 'gem' ? 'gems' : tier === 'starter' ? 'starters' : 'nukes']++;
  }
  return dist;
}

// ── Signal ───────────────────────────────────────────────────────────────────

export function derivePrimarySignal(healthScore: number): PrimarySignal {
  if (healthScore >= 70) return 'BOOM';
  if (healthScore < 40) return 'BUST';
  return 'STABLE';
}
