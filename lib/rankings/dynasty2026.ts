// 2026 Dynasty Rankings — Post-Free Agency snapshot
// Market = KTC consensus. BBSM = internal Boom-or-Bust model value.
// Delta >+5% → arbitrage buy. Delta < -5% → overvalued / sell candidate.

import Fuse from 'fuse.js';
import {
  calculateTFOScore,
  type RBUsageStyle,
  type TFOGrade,
  type TFOVerdict,
  type WRDeployment,
} from '@/lib/tfo/formula';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import { getKTCValues, type KTCPlayer } from '@/lib/values/ktc';

export type Position = 'QB' | 'RB' | 'WR' | 'TE';
export type SignalLabel = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';

/** 85 = confirmed starter, 75 = emerging, 65 = depth/committee — feeds TFO opportunityScore. */
export type TfoOpportunityTier = 'starter' | 'emerging' | 'depth';

export interface DynastyPlayer2026 {
  rank: number;
  name: string;
  firstName: string;
  lastName: string;
  team: string;
  position: Position;
  age: number;
  /** KTC market consensus value */
  marketValue: number;
  /** BBSM internal model value */
  bbsmValue: number;
  /** Pre-computed % delta (bbsmValue - marketValue) / marketValue * 100 */
  delta: number;
  /** Trading signal derived from delta */
  signal: SignalLabel;
  /** Hex color for the delta cell */
  signalColor: string;
  /** Short analyst note */
  note: string;
  /** Numeric opportunity score passed into TFO (85 / 75 / 65) — reapplied when enriching live KTC */
  tfoOpportunityScore: number;
  tfoScore: number;
  tfoGrade: TFOGrade;
  tfoVerdict: TFOVerdict;
  tfoFlags: string[];
  tfoReasoning: string;
  /** Optional TFO profile overrides */
  tfoRbUsageStyle?: RBUsageStyle;
  tfoWrDeployment?: WRDeployment;
  tfoTeamQbIsYoung?: boolean;
}

// ── Utility functions ────────────────────────────────────────────────────────

/**
 * Returns the percentage difference of BBSM vs market.
 * Positive = BBSM sees more value than market (buy signal).
 * Negative = BBSM sees less value (overvalued / sell signal).
 */
export function calculateDelta(marketValue: number, bbsmValue: number): number {
  if (marketValue <= 0) return 0;
  return Math.round(((bbsmValue - marketValue) / marketValue) * 1000) / 10;
}

/**
 * Returns a hex color string for a delta value.
 * > +5%  → Cyan   #06B6D4  (arbitrage buy)
 * < -5%  → Crimson #EF4444  (overvalued / sell)
 * Otherwise → neutral #94A3B8
 */
export function getSignalColor(delta: number): string {
  if (delta > 5) return '#06B6D4';
  if (delta < -5) return '#EF4444';
  return '#94A3B8';
}

/** Derives a 5-tier trading signal from the raw delta percentage. */
export function getSignalLabel(delta: number): SignalLabel {
  if (delta >= 15) return 'STRONG BUY';
  if (delta >= 5) return 'BUY';
  if (delta <= -15) return 'STRONG SELL';
  if (delta <= -5) return 'SELL';
  return 'HOLD';
}

function opportunityFromTier(tier: TfoOpportunityTier): number {
  if (tier === 'starter') return 85;
  if (tier === 'emerging') return 75;
  return 65;
}

function runTfoForRow(
  rank: number,
  name: string,
  team: string,
  position: Position,
  age: number,
  marketValue: number,
  opportunityScore: number,
  extras?: {
    rbUsageStyle?: RBUsageStyle;
    wrDeployment?: WRDeployment;
    teamQbIsYoung?: boolean;
  },
): Pick<
  DynastyPlayer2026,
  'tfoScore' | 'tfoGrade' | 'tfoVerdict' | 'tfoFlags' | 'tfoReasoning'
> {
  const tfo = calculateTFOScore({
    playerId: `dynasty2026-${rank}-${name.replace(/\s+/g, '-').slice(0, 24)}`,
    position,
    age,
    team: team.toUpperCase(),
    ocScheme: schemeForTeam(team),
    opportunityScore,
    olGrade: 70,
    wrCastGrade: 70,
    redZoneShare: 60,
    ktcValue: marketValue,
    ocYear: 3,
    rbUsageStyle: extras?.rbUsageStyle,
    wrDeployment: extras?.wrDeployment,
    teamQbIsYoung: extras?.teamQbIsYoung,
  });
  return {
    tfoScore: tfo.tfoScore,
    tfoGrade: tfo.grade,
    tfoVerdict: tfo.verdict,
    tfoFlags: tfo.flags,
    tfoReasoning: tfo.reasoning,
  };
}

/** Convenience: builds a complete DynastyPlayer2026 from raw inputs + TFO. */
function player(
  rank: number,
  name: string,
  team: string,
  position: Position,
  age: number,
  marketValue: number,
  bbsmValue: number,
  note: string,
  oppTier: TfoOpportunityTier,
  extras?: {
    rbUsageStyle?: RBUsageStyle;
    wrDeployment?: WRDeployment;
    teamQbIsYoung?: boolean;
  },
): DynastyPlayer2026 {
  const delta = calculateDelta(marketValue, bbsmValue);
  const [firstName = '', ...rest] = name.split(' ');
  const tfoOpportunityScore = opportunityFromTier(oppTier);
  const tfoBlock = runTfoForRow(rank, name, team, position, age, marketValue, tfoOpportunityScore, extras);

  return {
    rank,
    name,
    firstName,
    lastName: rest.join(' '),
    team,
    position,
    age,
    marketValue,
    bbsmValue,
    delta,
    signal: getSignalLabel(delta),
    signalColor: getSignalColor(delta),
    note,
    tfoOpportunityScore,
    tfoRbUsageStyle: extras?.rbUsageStyle,
    tfoWrDeployment: extras?.wrDeployment,
    tfoTeamQbIsYoung: extras?.teamQbIsYoung,
    ...tfoBlock,
  };
}

// ── 2026 Post-FA Dynasty Rankings (29 players, ranks 1–29, strict order) ───
// Data review: removed duplicate “Jonathon Brooks” (typo duplicate of Jonathan Brooks).
// Jeremiyah Love is rank 2 immediately after JSN. No other duplicate names.
// Ordering follows rank — QB run then TE block after RBs.

export const dynasty2026Players: DynastyPlayer2026[] = [
  player(1, 'Jaxon Smith-Njigba', 'SEA', 'WR', 24, 7200, 8500, 'WR1 breakout confirmed', 'starter'),
  player(2, 'Jeremiyah Love', 'ARI', 'RB', 21, 5500, 6800, 'Elite 3-down rookie profile', 'starter'),
  player(3, 'Bijan Robinson', 'ATL', 'RB', 24, 8100, 8300, 'Volume monster in PPR', 'starter'),
  player(4, 'Nico Collins', 'HOU', 'WR', 26, 6800, 7900, 'Target share king — scheme proof', 'starter'),
  player(5, 'Puka Nacua', 'LAR', 'WR', 24, 6100, 7200, 'McVay slot — upside intact', 'starter', {
    wrDeployment: 'SLOT',
  }),
  player(6, 'Drake London', 'ATL', 'WR', 24, 5900, 6600, 'Bijan + London stack premium', 'starter', {
    wrDeployment: 'WR1',
  }),
  player(7, 'Tank Dell', 'HOU', 'WR', 26, 5400, 6300, 'Deep threat post-injury bounce', 'emerging'),
  player(8, 'Rome Odunze', 'CHI', 'WR', 23, 5100, 6500, 'Caleb Williams pairing — ceiling play', 'emerging'),
  player(9, 'Marvin Harrison Jr', 'ARI', 'WR', 22, 6700, 7400, 'Former #1 pick realizing potential', 'starter', {
    wrDeployment: 'WR1',
  }),
  player(10, 'Malik Nabers', 'NYG', 'WR', 22, 6300, 7100, 'Elite route runner, weak QB risk', 'starter', {
    teamQbIsYoung: true,
  }),
  player(11, 'Brian Thomas Jr', 'JAX', 'WR', 23, 5800, 6900, 'New OC unlock — undervalued', 'emerging'),
  player(12, 'Terry McLaurin', 'WAS', 'WR', 30, 4200, 3100, 'Age 30 WR — window closing', 'starter', {
    wrDeployment: 'WR1',
  }),
  player(13, 'Ashton Jeanty', 'LV', 'RB', 22, 6400, 7200, 'Rookie RB1 — lead back from day 1', 'starter'),
  player(14, 'Jonathan Brooks', 'CAR', 'RB', 23, 4800, 5600, 'Full recovery buy — discount window', 'emerging'),
  player(15, 'Christian McCaffrey', 'SF', 'RB', 29, 6200, 4800, "Buster's Age Cliff Trap", 'starter'),
  player(16, 'Breece Hall', 'NYJ', 'RB', 24, 7400, 7600, 'Scheme fit locked — hold the line', 'starter'),
  player(17, "De'Von Achane", 'MIA', 'RB', 24, 6900, 7100, 'Explosive usage — PPR darling', 'starter', {
    rbUsageStyle: 'RECEIVING',
  }),
  player(18, 'Dameon Pierce', 'HOU', 'RB', 25, 3100, 2300, 'Role erosion risk — monitor', 'depth'),
  player(19, 'Derrick Henry', 'BAL', 'RB', 32, 3200, 1800, 'Age cliff imminent — SELL window', 'starter'),
  player(20, 'C.J. Stroud', 'HOU', 'QB', 23, 7100, 7800, 'Superstar trajectory — QB1 lock', 'starter'),
  player(21, 'Caleb Williams', 'CHI', 'QB', 23, 6400, 7500, 'High-ceiling rebuild — patience req', 'starter'),
  player(22, 'Jayden Daniels', 'WAS', 'QB', 25, 6900, 7200, 'Dual-threat floor + ceiling premium', 'starter'),
  player(23, 'Drake Maye', 'NE', 'QB', 23, 5800, 6900, 'Situation improving — BUY before pop', 'starter'),
  player(24, 'Bo Nix', 'DEN', 'QB', 25, 4200, 4600, 'Steady — not exciting', 'emerging'),
  player(25, 'Brock Bowers', 'LV', 'TE', 23, 7600, 8300, 'TE1 for next decade — undersold', 'starter'),
  player(26, 'Sam LaPorta', 'DET', 'TE', 24, 5200, 5900, 'Strong QB support — rising', 'starter'),
  player(27, 'Trey McBride', 'ARI', 'TE', 25, 5600, 5900, 'Volume + age = cornerstone', 'starter'),
  player(28, "Ja'Tavion Sanders", 'CAR', 'TE', 23, 3800, 4600, 'Roster situation clearing — buy', 'emerging', {
    teamQbIsYoung: true,
  }),
  player(29, 'Travis Kelce', 'KC', 'TE', 36, 3100, 1600, 'Retirement risk premium — SELL', 'starter'),
];

/** Alias for docs / importers — same reference as `dynasty2026Players`. */
export const dynastyRankings2026 = dynasty2026Players;

// ── Derived views (static snapshot) ─────────────────────────────────────────

/** All players sorted by rank (default). */
export const byRank = [...dynasty2026Players].sort((a, b) => a.rank - b.rank);

/** Arbitrage targets: BBSM sees ≥10% more value than market. */
export const arbitrageTargets = dynasty2026Players
  .filter((p) => p.delta >= 10)
  .sort((a, b) => b.delta - a.delta);

/** Sell candidates: BBSM sees ≥10% LESS value than market. */
export const sellCandidates = dynasty2026Players
  .filter((p) => p.delta <= -10)
  .sort((a, b) => a.delta - b.delta);

/** By position. */
export const byPosition = (pos: Position) =>
  dynasty2026Players.filter((p) => p.position === pos).sort((a, b) => a.rank - b.rank);

// ── Live KTC enrichment ──────────────────────────────────────────────────────

let _enrichFuse: Fuse<KTCPlayer> | null = null;
let _enrichFuseData: KTCPlayer[] | null = null;

function applyLiveMarketAndTfo(p: DynastyPlayer2026, marketValue: number): DynastyPlayer2026 {
  const delta = calculateDelta(marketValue, p.bbsmValue);
  const tfoBlock = runTfoForRow(
    p.rank,
    p.name,
    p.team,
    p.position,
    p.age,
    marketValue,
    p.tfoOpportunityScore,
    {
      rbUsageStyle: p.tfoRbUsageStyle,
      wrDeployment: p.tfoWrDeployment,
      teamQbIsYoung: p.tfoTeamQbIsYoung,
    },
  );
  return {
    ...p,
    marketValue,
    delta,
    signal: getSignalLabel(delta),
    signalColor: getSignalColor(delta),
    ...tfoBlock,
  };
}

/**
 * Static rankings merged with live KTC (fuzzy name match, same Fuse threshold as BBV cron).
 * Recomputes delta + TFO when market value changes.
 */
export async function getEnrichedRankings(): Promise<DynastyPlayer2026[]> {
  const base = dynastyRankings2026;
  const ktcRows = await getKTCValues();
  if (!ktcRows.length) {
    return [...base].sort((a, b) => a.rank - b.rank);
  }

  if (_enrichFuseData !== ktcRows) {
    _enrichFuse = new Fuse(ktcRows, { keys: ['player_name'], threshold: 0.35 });
    _enrichFuseData = ktcRows;
  }

  const enriched = base.map((p) => {
    const hit = _enrichFuse!.search(p.name)[0]?.item;
    const live =
      hit?.ktc_value != null && Number.isFinite(hit.ktc_value) && hit.ktc_value > 0
        ? hit.ktc_value
        : p.marketValue;
    return applyLiveMarketAndTfo(p, live);
  });

  return enriched.sort((a, b) => a.rank - b.rank);
}
