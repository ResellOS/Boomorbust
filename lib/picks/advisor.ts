import { calculatePlayerDynastyScore } from '@/lib/values/engine';

// KTC-approximate pick values by round + slot
const PICK_VALUES: Record<number, Record<string, number>> = {
  1: { early: 5500, mid: 4500, late: 3500 },
  2: { early: 3000, mid: 2500, late: 2000 },
  3: { early: 1500, mid: 1100, late: 800 },
  4: { early: 600,  mid: 450,  late: 300 },
};

function getPickValue(round: number, slot_type: 'early' | 'mid' | 'late'): number {
  const row = PICK_VALUES[round] ?? { early: 250, mid: 175, late: 125 };
  return row[slot_type];
}

type Tier = 'high' | 'medium' | 'low';

function pickTier(value: number): { tier: Tier; tier_label: string } {
  if (value >= 3500) return { tier: 'high',   tier_label: 'High Value' };
  if (value >= 1500) return { tier: 'medium', tier_label: 'Fair Value' };
  return               { tier: 'low',    tier_label: 'Low Value'  };
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]);
}

export interface RosterPlayerInput {
  full_name: string;
  position: string;
  age: number | null;
  ktc_value?: number;
}

export interface LeagueInput {
  name: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

export interface PickInput {
  season: string;
  round: number;
  slot_type: 'early' | 'mid' | 'late';
  original_team_name?: string;
}

export interface PickQuickAnalysis {
  pick_label: string;
  estimated_value: number;
  tier: Tier;
  tier_label: string;
  roster_context: string;
  roster_summary: {
    rising: number;
    stable: number;
    declining: number;
    top_players: string[];
    weakest_position: string;
    total_ktc: number;
  };
}

export function analyzePick(
  pick: PickInput,
  rosterPlayers: RosterPlayerInput[],
  league: LeagueInput
): PickQuickAnalysis {
  const estimated_value = getPickValue(pick.round, pick.slot_type);
  const { tier, tier_label } = pickTier(estimated_value);
  const pick_label = `${pick.season} ${ordinal(pick.round)} Round · ${pick.slot_type.charAt(0).toUpperCase() + pick.slot_type.slice(1)}`;

  // Roster analysis
  const scorable = rosterPlayers.filter((p) => p.ktc_value && p.ktc_value > 0);
  const total_ktc = scorable.reduce((s, p) => s + (p.ktc_value ?? 0), 0);

  const trends = scorable.map((p) => {
    const score = calculatePlayerDynastyScore(p, p.ktc_value ?? 0);
    return score.trend;
  });
  const rising   = trends.filter((t) => t === 'rising').length;
  const stable   = trends.filter((t) => t === 'stable').length;
  const declining = trends.filter((t) => t === 'declining').length;

  const top_players = scorable
    .sort((a, b) => (b.ktc_value ?? 0) - (a.ktc_value ?? 0))
    .slice(0, 5)
    .map((p) => `${p.full_name} (${p.position}, ${p.age ?? '?'}y, ${(p.ktc_value ?? 0).toLocaleString()})`);

  // Find weakest position: fewest players with KTC > 3000
  const posGroups: Record<string, number> = {};
  for (const p of scorable) {
    if ((p.ktc_value ?? 0) > 3000) {
      posGroups[p.position] = (posGroups[p.position] ?? 0) + 1;
    }
  }
  const keyPositions = ['QB', 'RB', 'WR', 'TE'];
  const weakest_position = keyPositions.sort((a, b) => (posGroups[a] ?? 0) - (posGroups[b] ?? 0))[0];

  // Context note
  const format = (league.scoring_settings?.rec ?? 0) >= 1 ? 'PPR' : 'Standard';
  let roster_context: string;

  if (declining > rising + stable) {
    roster_context = `Your roster skews veteran — this ${ordinal(pick.round)}-rounder is critical for a rebuild. Hold unless the offer is exceptional.`;
  } else if (rising > declining) {
    if (tier === 'high') {
      roster_context = `Your young core is already strong. A ${tier_label.toLowerCase()} pick like this adds elite depth or becomes a key trade chip.`;
    } else {
      roster_context = `Your roster is trending up. This pick adds youth depth — consider holding for 6–12 months when the value window peaks.`;
    }
  } else {
    if (tier === 'high') {
      roster_context = `Your balanced roster can capitalize on a ${tier_label.toLowerCase()} pick. Ideal to target a rising ${weakest_position} or package for a proven veteran.`;
    } else {
      roster_context = `A ${tier_label.toLowerCase()} pick for a contending roster. Best used in a package to land a proven player at your weakest spot (${weakest_position}).`;
    }
  }

  if (format === 'PPR' && pick.round === 1) {
    roster_context += ` PPR leagues amplify WR and TE value — factor in positional scarcity when considering offers.`;
  }

  return {
    pick_label,
    estimated_value,
    tier,
    tier_label,
    roster_context,
    roster_summary: { rising, stable, declining, top_players, weakest_position, total_ktc },
  };
}
