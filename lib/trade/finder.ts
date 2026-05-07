
const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
const STARTER_THRESHOLDS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1,
};

export interface RosterStrength {
  roster_id: number;
  position_scores: Record<string, { avg_ktc: number; count: number; surplus: boolean; deficit: boolean }>;
  total_ktc: number;
  top_chips: Array<{ name: string; position: string; ktc: number }>;
  weak_positions: string[];
  strong_positions: string[];
}

export interface TradeMatch {
  roster_id: number;
  match_score: number;        // 0–100
  they_need: string[];
  you_need: string[];
  their_chip: string;
  your_chip: string;
  trade_concept: string;
  ai_pitch?: string;
}

export interface PlayerInput {
  full_name: string;
  position: string;
  age: number | null;
}

export type PlayerMap = Record<string, PlayerInput>;

function scoreRoster(
  playerIds: string[],
  players: PlayerMap,
  ktcMap: Record<string, number>
): RosterStrength & { roster_id: number } {
  const byPosition: Record<string, Array<{ id: string; ktc: number; name: string }>> = {};
  for (const pos of KEY_POSITIONS) byPosition[pos] = [];

  let totalKtc = 0;
  for (const id of playerIds) {
    const p = players[id];
    if (!p || !KEY_POSITIONS.includes(p.position)) continue;
    const ktc = ktcMap[p.full_name.toLowerCase()] ?? 0;
    totalKtc += ktc;
    byPosition[p.position].push({ id, ktc, name: p.full_name });
  }

  const position_scores: RosterStrength['position_scores'] = {};
  const weak: string[] = [];
  const strong: string[] = [];

  for (const pos of KEY_POSITIONS) {
    const arr = byPosition[pos].sort((a, b) => b.ktc - a.ktc);
    const starters = arr.slice(0, STARTER_THRESHOLDS[pos] ?? 1);
    const avg_ktc = starters.length
      ? starters.reduce((s, p) => s + p.ktc, 0) / starters.length
      : 0;
    const surplus = arr.length > (STARTER_THRESHOLDS[pos] ?? 1) + 1 && avg_ktc > 3000;
    const deficit = avg_ktc < 2000 || arr.length < (STARTER_THRESHOLDS[pos] ?? 1);

    position_scores[pos] = { avg_ktc: Math.round(avg_ktc), count: arr.length, surplus, deficit };
    if (deficit) weak.push(pos);
    if (surplus) strong.push(pos);
  }

  const top_chips = Object.values(byPosition)
    .flat()
    .sort((a, b) => b.ktc - a.ktc)
    .slice(0, 5)
    .map((p) => {
      const pos = Object.entries(byPosition).find(([, arr]) => arr.some((x) => x.id === p.id))?.[0] ?? 'UNK';
      return { name: p.name, position: pos, ktc: p.ktc };
    });

  return {
    roster_id: 0,
    position_scores,
    total_ktc: Math.round(totalKtc),
    top_chips,
    weak_positions: weak,
    strong_positions: strong,
  };
}

function buildConcept(
  userStrong: string[],
  userWeak: string[],
  theirStrong: string[],
  theirWeak: string[],
  yourChip: string,
  theirChip: string
): string {
  if (userStrong.some((p) => theirWeak.includes(p)) && theirStrong.some((p) => userWeak.includes(p))) {
    return `${yourChip} for ${theirChip} — a natural positional swap that upgrades both rosters.`;
  }
  if (userStrong.some((p) => theirWeak.includes(p))) {
    return `Your ${userStrong[0]} depth addresses their biggest weakness; ${theirChip} fills your ${userWeak[0]} need.`;
  }
  return `${yourChip} and ${theirChip} could unlock complementary value on both sides.`;
}

export function findTradeTargets(
  userRosterId: number,
  userPlayerIds: string[],
  allRosters: Array<{ roster_id: number; players: string[] }>,
  players: PlayerMap,
  ktcMap: Record<string, number>
): TradeMatch[] {
  const userStrength = scoreRoster(userPlayerIds, players, ktcMap);
  userStrength.roster_id = userRosterId;

  const matches: TradeMatch[] = [];

  for (const r of allRosters) {
    if (r.roster_id === userRosterId) continue;

    const them = scoreRoster(r.players, players, ktcMap);
    them.roster_id = r.roster_id;

    // Match score: overlap between user's surpluses and their deficits, vice versa
    let score = 0;
    const they_need: string[] = [];
    const you_need: string[] = [];

    for (const pos of KEY_POSITIONS) {
      const userPs = userStrength.position_scores[pos];
      const themPs = them.position_scores[pos];

      if (userPs?.surplus && themPs?.deficit) { score += 25; they_need.push(pos); }
      if (themPs?.surplus && userPs?.deficit) { score += 25; you_need.push(pos); }
      // Partial — one side has surplus, other has mediocre
      if (userPs?.surplus && !themPs?.surplus && (themPs?.avg_ktc ?? 0) < 3500) score += 8;
      if (themPs?.surplus && !userPs?.surplus && (userPs?.avg_ktc ?? 0) < 3500) score += 8;
    }

    if (score < 20) continue;

    // Best chip from each side
    const yourTopChip = userStrength.top_chips.find((c) =>
      userStrength.strong_positions.includes(c.position) && they_need.includes(c.position)
    ) ?? userStrength.top_chips[0];

    const theirTopChip = them.top_chips.find((c) =>
      them.strong_positions.includes(c.position) && you_need.includes(c.position)
    ) ?? them.top_chips[0];

    const your_chip = yourTopChip ? `${yourTopChip.name} (${yourTopChip.position})` : 'your surplus';
    const their_chip = theirTopChip ? `${theirTopChip.name} (surplus ${theirTopChip.position})` : 'their surplus';

    matches.push({
      roster_id: r.roster_id,
      match_score: Math.min(score, 100),
      they_need,
      you_need,
      their_chip,
      your_chip,
      trade_concept: buildConcept(
        userStrength.strong_positions,
        userStrength.weak_positions,
        them.strong_positions,
        them.weak_positions,
        your_chip,
        their_chip
      ),
    });
  }

  return matches.sort((a, b) => b.match_score - a.match_score).slice(0, 5);
}
