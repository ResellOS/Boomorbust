// Pure draft helpers — safe to import from both client components and route
// handlers (no server-only or client-only imports here).

import type {
  DraftablePlayer,
  DraftConfig,
  DraftGradeSummary,
  DraftPickRecord,
  Position,
} from './types';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

export const POSITION_COLOR: Record<string, string> = {
  QB: '#FBBF24', // amber
  RB: '#36E7A1', // green
  WR: '#22D3EE', // cyan
  TE: '#A78BFA', // purple
};

export function positionColor(pos: string): string {
  return POSITION_COLOR[pos?.toUpperCase()] ?? '#6b7a99';
}

export const PICK_SECONDS = 60;

// Snake order: round 1 is 1→teams, round 2 is teams→1, and so on.
export function slotForOverall(
  overall: number,
  teams: number,
): { round: number; slot: number } {
  const idx = Math.max(0, overall - 1);
  const round = Math.floor(idx / teams) + 1;
  const posInRound = idx % teams;
  const slot = round % 2 === 1 ? posInRound + 1 : teams - posInRound;
  return { round, slot };
}

export function totalPicks(config: DraftConfig): number {
  return config.teams * config.rounds;
}

// Rounds offered depend on the draft type — rookie drafts are short.
export function roundsForType(type: DraftConfig['draftType']): number[] {
  if (type === 'rookie') return [3, 4, 5];
  if (type === 'redraft') return [10, 15];
  return [5, 10, 15, 20]; // startup
}

export function bestAvailable(
  pool: DraftablePlayer[],
  takenIds: Set<string>,
): DraftablePlayer | null {
  for (const p of pool) {
    if (!takenIds.has(p.playerId)) return p;
  }
  return null;
}

// "Sleeper": BOB rates the player well above where the market does. Scans the
// best available window and returns the largest positive (marketRank - bobRank).
export function sleeperPick(
  pool: DraftablePlayer[],
  takenIds: Set<string>,
  windowSize = 60,
): DraftablePlayer | null {
  const available: DraftablePlayer[] = [];
  for (const p of pool) {
    if (takenIds.has(p.playerId)) continue;
    available.push(p);
    if (available.length >= windowSize) break;
  }
  let best: DraftablePlayer | null = null;
  let bestGap = 0;
  for (const p of available) {
    const gap = p.marketRank - p.bobRank;
    if (gap > bestGap) {
      bestGap = gap;
      best = p;
    }
  }
  return best;
}

const idealCounts = (superflex: boolean): Record<Position, number> => ({
  QB: superflex ? 3 : 2,
  RB: 6,
  WR: 7,
  TE: 2,
});

export function rosterCounts(
  roster: DraftablePlayer[],
): Record<Position, number> {
  const counts: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of roster) {
    const pos = p.position?.toUpperCase();
    if (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') {
      counts[pos] += 1;
    }
  }
  return counts;
}

// Position with the largest remaining need vs. an ideal roster shape.
export function positionalNeed(
  roster: DraftablePlayer[],
  superflex: boolean,
): Position {
  const have = rosterCounts(roster);
  const ideal = idealCounts(superflex);
  let need: Position = 'WR';
  let max = -Infinity;
  for (const pos of POSITIONS) {
    const remaining = ideal[pos] - have[pos];
    if (remaining > max) {
      max = remaining;
      need = pos;
    }
  }
  return need;
}

export function gradeFromAvg(avg: number): 'A' | 'B' | 'C' | 'D' {
  if (avg >= 72) return 'A';
  if (avg >= 62) return 'B';
  if (avg >= 52) return 'C';
  return 'D';
}

export function summarizeDraft(picks: DraftPickRecord[]): DraftGradeSummary {
  const userPicks = picks.filter((p) => p.isUser);

  const avgTfo =
    userPicks.length > 0
      ? Math.round(
          (userPicks.reduce((s, p) => s + p.player.tfoScore, 0) /
            userPicks.length) *
            10,
        ) / 10
      : 0;

  const followed = userPicks.filter((p) => p.followedBob).length;
  const agreementRate =
    userPicks.length > 0
      ? Math.round((followed / userPicks.length) * 1000) / 10
      : 0;

  // Biggest reach: player's BOB rank sits furthest BELOW the overall pick used.
  let biggestReach: DraftGradeSummary['biggestReach'] = null;
  for (const p of userPicks) {
    const margin = p.player.bobRank - p.overall;
    if (margin > 0 && (!biggestReach || margin > biggestReach.margin)) {
      biggestReach = { player: p.player, overall: p.overall, margin };
    }
  }

  // Best value: BOB rates the player far above the market (ADP) rank.
  let bestValue: DraftGradeSummary['bestValue'] = null;
  for (const p of userPicks) {
    const margin = p.player.marketRank - p.player.bobRank;
    if (margin > 0 && (!bestValue || margin > bestValue.margin)) {
      bestValue = { player: p.player, overall: p.overall, margin };
    }
  }

  return {
    grade: gradeFromAvg(avgTfo),
    avgTfo,
    agreementRate,
    biggestReach,
    bestValue,
    userPicks,
  };
}
