import type { RotationPlayer } from './rotation';

/** Absolute rank_delta for market-signal sort; -1 when no signal. */
export function marketSignalRank(p: RotationPlayer): number {
  const mv = p.marketVerdict;
  if (!mv || mv.noMarketData || mv.rankDelta == null || !Number.isFinite(mv.rankDelta)) {
    return -1;
  }
  return Math.abs(mv.rankDelta);
}

/** Biggest |rank_delta| first (BOOM + BUST extremes), then TFO, then name. */
export function sortByMarketSignal(players: RotationPlayer[]): RotationPlayer[] {
  return [...players].sort((a, b) => {
    const db = marketSignalRank(b);
    const da = marketSignalRank(a);
    if (db !== da) return db - da;
    const scoreB = b.tfoScore > 0 ? b.tfoScore : 0;
    const scoreA = a.tfoScore > 0 ? a.tfoScore : 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  });
}
