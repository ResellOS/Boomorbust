import type { BobSuggestion } from './types';

export interface SuggestionComponents {
  ops: number;
  sfs: number;
  sit: number;
  direction60d: 'up' | 'down' | 'neutral' | null;
  confidenceTier: string | null;
}

const LOW_COMPONENT = 50;

function spotCount(
  rankDelta: number | null | undefined,
  edgeScore: number,
): number {
  if (rankDelta != null && Number.isFinite(rankDelta)) {
    return Math.abs(Math.round(rankDelta));
  }
  return Math.max(1, Math.round(edgeScore * 10));
}

/** 2–3 plain-English bullets for a BOB trade suggestion row. */
export function buildSuggestionWhyReasons(
  suggestion: BobSuggestion,
  rankDelta: number | null | undefined,
  ctx: SuggestionComponents | null | undefined,
): string[] {
  const spots = spotCount(rankDelta, suggestion.edgeScore);
  const reasons: string[] = [];

  if (suggestion.type === 'sell') {
    if (rankDelta != null && Number.isFinite(rankDelta)) {
      reasons.push(`BOB rates ${spots} spots above market consensus`);
    }
    if (ctx?.direction60d === 'down') {
      reasons.push('BOB sees declining value trajectory');
    }
    if (ctx && ctx.sit > 0 && ctx.sit < LOW_COMPONENT) {
      reasons.push('Situation score declining');
    }
    if (ctx && ctx.ops > 0 && ctx.ops < LOW_COMPONENT) {
      reasons.push('Opportunity share falling');
    }
  } else {
    if (rankDelta != null && Number.isFinite(rankDelta)) {
      reasons.push(`BOB rates ${spots} spots below market — potential buy window`);
    }
    if (ctx?.direction60d === 'up') {
      reasons.push('BOB sees upside vs current market price');
    }
    if (ctx?.confidenceTier?.toUpperCase() === 'HIGH') {
      reasons.push('High confidence signal');
    }
  }

  return reasons.slice(0, 3);
}
