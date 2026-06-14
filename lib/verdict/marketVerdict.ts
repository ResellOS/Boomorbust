// Market verdict engine — compares the BOB engine's valuation (TFO rank) against
// the dynasty market (KTC rank) to surface buy-low / sell-high signals.
//
// rank_delta = market(KTC)_rank − engine(TFO)_rank, computed across the supplied
// skill-position pool. Positive = the engine ranks the player higher than the
// market does (undervalued → BUY/BOOM); negative = overvalued (SELL/BUST).
//
// Buckets are PERCENTILE-based (skew-proof): the pool is sorted by rank_delta and
// sliced top 5% BOOM / next 15% BUY / middle 60% HOLD / next 15% SELL / bottom 5%
// BUST. Players with no KTC value get HOLD + a 'no_market_data' flag and never
// receive a fabricated rank_delta.

export type MarketVerdict = 'BOOM' | 'BUY' | 'HOLD' | 'SELL' | 'BUST';

export const MARKET_VERDICT_COLORS: Record<MarketVerdict, string> = {
  BOOM: '#36E7A1',
  BUY: '#60a5fa',
  HOLD: '#FBBF24',
  SELL: '#f59e0b',
  BUST: '#A78BFA',
};

export const NO_MARKET_DATA_FLAG = 'no_market_data';

/** Hover-tooltip definitions for each market verdict (action signal). */
export const MARKET_VERDICT_DEFINITIONS: Record<MarketVerdict, string> = {
  BOOM: 'BOB rates this player far above market — aggressive buy',
  BUY: 'BOB rates this player above market — buy window',
  HOLD: 'BOB roughly agrees with market value',
  SELL: 'BOB rates this player below market — sell window',
  BUST: 'BOB rates this player far below market — sell now',
};

export interface MarketVerdictInput {
  playerId: string;
  tfoScore: number;
  ktcValue: number; // 0 / null treated as "no market data"
}

export interface MarketVerdictResult {
  verdict: MarketVerdict;
  color: string;
  rankDelta: number | null; // null when no_market_data
  flags: string[];
}

// Percentile slice sizes. BOOM/BUST = 5% each, BUY/SELL = 15% each, HOLD = rest.
const PCT_BOOM = 0.05;
const PCT_BUY = 0.15;
const PCT_SELL = 0.15;
const PCT_BUST = 0.05;

function rankDesc<T>(items: T[], value: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => value(b) - value(a));
  const ranks = new Map<T, number>();
  sorted.forEach((item, i) => ranks.set(item, i + 1)); // 1 = best
  return ranks;
}

/**
 * Compute market verdicts for a pool of skill players. Returns a map keyed by
 * playerId. Caller is responsible for scoping the pool to QB/RB/WR/TE.
 */
export function computeMarketVerdicts(
  players: MarketVerdictInput[],
): Map<string, MarketVerdictResult> {
  const out = new Map<string, MarketVerdictResult>();

  const withKtc = players.filter((p) => p.ktcValue > 0);
  const noKtc = players.filter((p) => p.ktcValue <= 0);

  // No-market-data players: HOLD, flagged, no rank_delta.
  for (const p of noKtc) {
    out.set(p.playerId, {
      verdict: 'HOLD',
      color: MARKET_VERDICT_COLORS.HOLD,
      rankDelta: null,
      flags: [NO_MARKET_DATA_FLAG],
    });
  }

  const n = withKtc.length;
  if (n === 0) return out;

  const engineRank = rankDesc(withKtc, (p) => p.tfoScore);
  const marketRank = rankDesc(withKtc, (p) => p.ktcValue);

  // Most undervalued (largest positive delta) first.
  const ranked = withKtc
    .map((p) => ({
      p,
      rankDelta: (marketRank.get(p) ?? n) - (engineRank.get(p) ?? n),
    }))
    .sort((a, b) => b.rankDelta - a.rankDelta);

  const boomCount = Math.round(n * PCT_BOOM);
  const buyCount = Math.round(n * PCT_BUY);
  const bustCount = Math.round(n * PCT_BUST);
  const sellCount = Math.round(n * PCT_SELL);
  // HOLD absorbs the remainder so the slices always sum to n.
  const boomEnd = boomCount;
  const buyEnd = boomEnd + buyCount;
  const bustStart = n - bustCount;
  const sellStart = bustStart - sellCount;

  ranked.forEach((entry, i) => {
    let verdict: MarketVerdict;
    if (i < boomEnd) verdict = 'BOOM';
    else if (i < buyEnd) verdict = 'BUY';
    else if (i >= bustStart) verdict = 'BUST';
    else if (i >= sellStart) verdict = 'SELL';
    else verdict = 'HOLD';

    out.set(entry.p.playerId, {
      verdict,
      color: MARKET_VERDICT_COLORS[verdict],
      rankDelta: entry.rankDelta,
      flags: [],
    });
  });

  return out;
}

export interface VerdictDistribution {
  BOOM: number;
  BUY: number;
  HOLD: number;
  SELL: number;
  BUST: number;
  no_market_data: number;
  total: number;
}

export function verdictDistribution(
  results: Map<string, MarketVerdictResult>,
): VerdictDistribution {
  const d: VerdictDistribution = {
    BOOM: 0, BUY: 0, HOLD: 0, SELL: 0, BUST: 0, no_market_data: 0, total: 0,
  };
  for (const r of Array.from(results.values())) {
    d[r.verdict] += 1;
    if (r.flags.includes(NO_MARKET_DATA_FLAG)) d.no_market_data += 1;
    d.total += 1;
  }
  return d;
}
