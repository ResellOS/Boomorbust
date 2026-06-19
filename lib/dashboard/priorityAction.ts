import type { FrontOfficePriority, RotationPlayer } from './rotation';

/**
 * #1 sell-high task: owned player with SELL/BUST verdict and the most negative
 * rank_delta (market ranks the player highest vs BOB).
 */
export function computeFrontOfficePriority(
  players: RotationPlayer[],
): FrontOfficePriority | null {
  let best: FrontOfficePriority | null = null;

  for (const p of players) {
    const mv = p.marketVerdict;
    if (!mv || mv.noMarketData || mv.rankDelta == null) continue;
    if (mv.verdict !== 'SELL' && mv.verdict !== 'BUST') continue;
    if (mv.rankDelta >= 0) continue;

    if (!best || mv.rankDelta < best.rankDelta) {
      best = {
        playerId: p.playerId,
        playerName: p.name,
        verdict: mv.verdict,
        rankDelta: mv.rankDelta,
        spotGap: Math.abs(Math.round(mv.rankDelta)),
      };
    }
  }

  return best;
}
