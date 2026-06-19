import type { DraftablePlayer, TierBreak } from './types';

const TIER_DROP_THRESHOLD = 3;

/** Insert tier breaks where BOB score drops >3 between consecutive ranked players. */
export function computeTierBreaks(pool: DraftablePlayer[]): TierBreak[] {
  const sorted = [...pool].sort((a, b) => a.bobRank - b.bobRank);
  const breaks: TierBreak[] = [];
  let tier = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const drop = prev.tfoScore - curr.tfoScore;
    if (drop >= TIER_DROP_THRESHOLD) {
      tier += 1;
      breaks.push({
        tier,
        afterBobRank: prev.bobRank,
        scoreDrop: Math.round(drop * 10) / 10,
      });
    }
  }

  return breaks;
}

export function tierForBobRank(bobRank: number, breaks: TierBreak[]): number {
  let tier = 1;
  for (const b of breaks) {
    if (bobRank > b.afterBobRank) tier = b.tier;
    else break;
  }
  return tier;
}
