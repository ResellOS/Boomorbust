import type { BobSuggestion, OwnedPick } from '@/lib/trade/types';
import type { CalculatorAsset } from '@/components/trade/TradeCalculator';
import { buildTradePackage, type PackageAsset } from '@/lib/trade/buildPackage';
import { pickMarketValue, pickRoundFromLabel, parsePickYear, PICK_TFO } from '@/lib/trade/pickValues';

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

function packageAssetToCalculator(a: PackageAsset): CalculatorAsset {
  return {
    key: a.isPick ? `pick-${a.key}` : a.key,
    label: a.label,
    isPick: a.isPick,
    tfoScore: a.tfoScore ?? null,
    ktcValue: a.ktcValue,
  };
}

/** Owned draft picks → package-builder assets (KTC-valued). */
function picksToPackageAssets(picks: OwnedPick[]): PackageAsset[] {
  return picks.map((p) => {
    const round = p.round || pickRoundFromLabel(p.label);
    return {
      key: `${p.label}-${p.season}`,
      label: p.label,
      isPick: true,
      ktcValue: pickMarketValue(round, parsePickYear(p.label) ?? (Number(p.season) || null)),
      tfoScore: PICK_TFO[round] ?? 20,
    };
  });
}

/**
 * Map a BOB suggestion to initial You Give / You Get calculator state.
 *
 * For a buy, auto-fill "You Give" with the fairest package (≤3 pieces, ≤1.5×
 * target) drawn from the user's rostered players + owned picks. For a sell, the
 * player being moved goes on the give side.
 */
export function initialAssetsFromSuggestion(
  s: BobSuggestion,
  pool?: { players?: PackageAsset[]; picks?: OwnedPick[] },
): {
  give: CalculatorAsset[];
  get: CalculatorAsset[];
} {
  const asset = playerAsset(s);
  if (s.type === 'sell') return { give: [asset], get: [] };

  // Buy: build a package that matches the target player's market value.
  const target = s.ktcValue ?? 0;
  const assetPool: PackageAsset[] = [
    ...(pool?.players ?? []),
    ...picksToPackageAssets(pool?.picks ?? []),
  ];
  const pkg = target > 0 ? buildTradePackage(target, assetPool) : null;
  const give = pkg ? pkg.pieces.map(packageAssetToCalculator) : [];
  return { give, get: [asset] };
}
