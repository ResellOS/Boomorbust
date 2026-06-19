import type { StartSitRecommendation } from './types';

/**
 * A player must never appear in both START and SIT lists.
 * Remove from the lower-confidence column; on tie, remove from SIT.
 */
export function dedupeStartSitLists(
  start: StartSitRecommendation[],
  sit: StartSitRecommendation[],
): { start: StartSitRecommendation[]; sit: StartSitRecommendation[] } {
  const startMap = new Map(start.map((r) => [r.playerId, r]));
  const sitMap = new Map(sit.map((r) => [r.playerId, r]));

  for (const id of Array.from(startMap.keys())) {
    if (!sitMap.has(id)) continue;
    const startRec = startMap.get(id)!;
    const sitRec = sitMap.get(id)!;
    if (startRec.confidence > sitRec.confidence) {
      sitMap.delete(id);
    } else if (sitRec.confidence > startRec.confidence) {
      startMap.delete(id);
    } else {
      sitMap.delete(id);
    }
  }

  return {
    start: Array.from(startMap.values()),
    sit: Array.from(sitMap.values()),
  };
}
