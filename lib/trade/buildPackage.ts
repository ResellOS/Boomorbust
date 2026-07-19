// Trade package builder.
//
// Given a target player's dynasty MARKET value (KTC) and a pool of the user's
// tradeable assets (players + owned picks, each carrying a KTC value), find the
// combination that lands *closest to* the target without grossly overpaying.
//
// Rules (locked by product spec):
//   • Total must not exceed 1.5× the target (hard overpay ceiling).
//   • Prefer fewer pieces over more pieces.
//   • Never suggest more than 3 pieces in a package.
//   • Every piece surfaces its own KTC value in the UI ("Tua Tagovailoa (4,241 KTC)").
//
// Fairness is measured on KTC, the only tradeable value. TFO is a talent grade
// and is deliberately ignored here — see lib/trade/pickValues.

export interface PackageAsset {
  key: string;
  label: string;
  isPick: boolean;
  ktcValue: number;
  tfoScore?: number | null;
}

export interface TradePackage {
  pieces: PackageAsset[];
  total: number;
  target: number;
  /** 0–100: 100 = exact match, drops 1 point per 1% of target off. */
  fairness: number;
  /** True when no in-budget combo existed and we fell back to the smallest overpay. */
  overCap: boolean;
}

export const MAX_PIECES = 3;
export const OVERPAY_CEILING = 1.5;

/** 0–100 fairness from how far `total` sits from `target` (in % of target). */
export function packageFairness(total: number, target: number): number {
  if (target <= 0) return 0;
  const pctOff = (Math.abs(total - target) / target) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - pctOff)));
}

interface Combo {
  pieces: PackageAsset[];
  total: number;
}

/**
 * Pick the best package for `targetKtc` from `pool`.
 *
 * Returns `null` only when the pool is empty. Otherwise always returns a
 * package: an in-budget combo when one exists (closest to target, fewest
 * pieces), or the smallest possible overpay flagged `overCap: true`.
 */
export function buildTradePackage(
  targetKtc: number,
  pool: PackageAsset[],
  opts: { maxPieces?: number; overpayCeiling?: number } = {},
): TradePackage | null {
  const maxPieces = Math.max(1, Math.min(opts.maxPieces ?? MAX_PIECES, MAX_PIECES));
  const ceiling = opts.overpayCeiling ?? OVERPAY_CEILING;

  // Only assets with a real, positive market value can anchor a package.
  const assets = pool.filter((a) => Number.isFinite(a.ktcValue) && a.ktcValue > 0);
  if (assets.length === 0 || targetKtc <= 0) return null;

  const cap = targetKtc * ceiling;

  // Enumerate every combination up to maxPieces (pool is a single roster's worth
  // of assets — a few dozen at most — so O(n^3) brute force is trivial and exact).
  const combos: Combo[] = [];
  const n = assets.length;

  const add = (pieces: PackageAsset[]) =>
    combos.push({ pieces, total: pieces.reduce((s, a) => s + a.ktcValue, 0) });

  for (let i = 0; i < n; i++) {
    add([assets[i]]);
    if (maxPieces < 2) continue;
    for (let j = i + 1; j < n; j++) {
      add([assets[i], assets[j]]);
      if (maxPieces < 3) continue;
      for (let k = j + 1; k < n; k++) {
        add([assets[i], assets[j], assets[k]]);
      }
    }
  }

  const inBudget = combos.filter((c) => c.total <= cap);

  const best = inBudget.length > 0
    ? pickBest(inBudget, targetKtc)
    // Nothing fits under the 1.5× ceiling — offer the smallest overpay so the
    // user still sees a starting point, but flag it rather than pretend it's fair.
    : [...combos].sort((a, b) => a.total - b.total)[0];

  return {
    pieces: [...best.pieces].sort((a, b) => b.ktcValue - a.ktcValue),
    total: best.total,
    target: targetKtc,
    fairness: packageFairness(best.total, targetKtc),
    overCap: inBudget.length === 0,
  };
}

/**
 * Closest total to target wins; ties break toward fewer pieces, then toward the
 * smaller total (don't overpay to break a tie).
 */
function pickBest(combos: Combo[], target: number): Combo {
  return combos.reduce((best, c) => {
    const dBest = Math.abs(best.total - target);
    const dC = Math.abs(c.total - target);
    if (dC !== dBest) return dC < dBest ? c : best;
    if (c.pieces.length !== best.pieces.length) {
      return c.pieces.length < best.pieces.length ? c : best;
    }
    return c.total < best.total ? c : best;
  });
}

/** "Total: 7,041 KTC" style summary line for a built package. */
export function formatPackageSummary(pkg: TradePackage): string {
  return `Total: ${pkg.total.toLocaleString()} KTC · Target: ${pkg.target.toLocaleString()} KTC · Fairness: ${pkg.fairness}/100`;
}
