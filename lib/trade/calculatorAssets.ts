import type { BobSuggestion } from '@/lib/trade/types';
import type { CalculatorAsset } from '@/components/trade/TradeCalculator';

function playerAsset(s: BobSuggestion): CalculatorAsset {
  const pos = s.position ? ` (${s.position})` : '';
  return {
    key: s.playerId,
    label: `${s.playerName}${pos}`,
    isPick: false,
    tfoScore: s.tfoScore ?? null,
    ktcValue: s.ktcValue ?? null,
  };
}

/** Map a BOB suggestion to initial You Give / You Get calculator state. */
export function initialAssetsFromSuggestion(s: BobSuggestion): {
  give: CalculatorAsset[];
  get: CalculatorAsset[];
} {
  const asset = playerAsset(s);
  if (s.type === 'sell') return { give: [asset], get: [] };
  return { give: [], get: [asset] };
}
