import type {
  DraftablePlayer,
  DraftConfig,
  DraftGradeSummary,
  DraftPickRecord,
  SkillPosition,
  TradeAsset,
  TradeProposal,
  TradeResult,
} from './types';

const POSITIONS: SkillPosition[] = ['QB', 'RB', 'WR', 'TE'];

export const POSITION_COLOR: Record<string, string> = {
  QB: '#EF4444',
  RB: '#14B8A6',
  WR: '#3B82F6',
  TE: '#F97316',
  FLEX: '#94A3B8',
  K: '#A855F7',
  DEF: '#64748B',
  BN: '#475569',
};

export function positionColor(pos: string): string {
  return POSITION_COLOR[pos?.toUpperCase()] ?? '#6b7a99';
}

export const PICK_SECONDS = 60;

/** Snake with optional third-round reversal (3rd round same direction as 1st). */
export function slotForOverall(
  overall: number,
  teams: number,
  opts?: { thirdRoundReversal?: boolean; linear?: boolean },
): { round: number; slot: number } {
  const idx = Math.max(0, overall - 1);
  const round = Math.floor(idx / teams) + 1;
  const posInRound = idx % teams;

  if (opts?.linear) {
    return { round, slot: posInRound + 1 };
  }

  let forward = round % 2 === 1;
  if (opts?.thirdRoundReversal && round === 3) forward = true;
  if (opts?.thirdRoundReversal && round === 4) forward = false;

  const slot = forward ? posInRound + 1 : teams - posInRound;
  return { round, slot };
}

export function totalPicks(config: DraftConfig): number {
  return config.teams * config.rounds;
}

export function roundsForType(type: DraftConfig['draftType']): number[] {
  if (type === 'rookie') return [3, 4, 5];
  if (type === 'redraft') return [10, 15];
  return [5, 10, 15, 20];
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

const idealCounts = (superflex: boolean): Record<SkillPosition, number> => ({
  QB: superflex ? 3 : 2,
  RB: 6,
  WR: 7,
  TE: 2,
});

export function rosterCounts(roster: DraftablePlayer[]): Record<SkillPosition, number> {
  const counts: Record<SkillPosition, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of roster) {
    const pos = p.position?.toUpperCase();
    if (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') {
      counts[pos] += 1;
    }
  }
  return counts;
}

export function positionalNeed(
  roster: DraftablePlayer[],
  superflex: boolean,
): SkillPosition {
  const have = rosterCounts(roster);
  const ideal = idealCounts(superflex);
  let need: SkillPosition = 'WR';
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

export function rosterConstructionTip(
  roster: DraftablePlayer[],
  superflex: boolean,
): string {
  const have = rosterCounts(roster);
  if (roster.length === 0) return 'Build foundation early — WR/RB depth drives weekly floor.';

  if (have.QB >= 2 && have.WR < 3) {
    return `You have ${have.QB} QBs. Prioritizing WR increases roster value.`;
  }
  if (have.RB >= 4 && have.WR < 3) {
    return `${have.RB} RBs locked — shift to WR to balance weekly ceiling.`;
  }
  if (have.WR >= 5 && have.RB < 2) {
    return `WR-heavy roster — add RB volume before the run dries up.`;
  }
  if (have.TE === 0 && roster.length >= 4) {
    return 'TE is still open — elite TEs create a weekly edge at the position.';
  }
  if (superflex && have.QB < 2) {
    return 'Superflex league — second QB is premium capital; don\'t wait too long.';
  }

  const need = positionalNeed(roster, superflex);
  return `Thinnest spot: ${need}. Next pick should shore up ${need} depth.`;
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
          (userPicks.reduce((s, p) => s + p.player.tfoScore, 0) / userPicks.length) * 10,
        ) / 10
      : 0;

  const followed = userPicks.filter((p) => p.followedBob).length;
  const agreementRate =
    userPicks.length > 0 ? Math.round((followed / userPicks.length) * 1000) / 10 : 0;

  let biggestReach: DraftGradeSummary['biggestReach'] = null;
  for (const p of userPicks) {
    const margin = p.player.bobRank - p.overall;
    if (margin > 0 && (!biggestReach || margin > biggestReach.margin)) {
      biggestReach = { player: p.player, overall: p.overall, margin };
    }
  }

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
    allPicks: picks,
  };
}

function assetValue(a: TradeAsset): number {
  return a.value;
}

function totalValue(assets: TradeAsset[]): number {
  return assets.reduce((s, a) => s + assetValue(a), 0);
}

/** CPU accepts within 15% of fair; counter-offers when close. */
export function evaluateTrade(proposal: TradeProposal): TradeResult {
  const offerVal = totalValue(proposal.offer);
  const requestVal = totalValue(proposal.request);
  if (offerVal <= 0 || requestVal <= 0) {
    return { accepted: false, message: 'Invalid trade — no assets selected.' };
  }

  const ratio = offerVal / requestVal;
  const fairLow = 0.85;
  const fairHigh = 1.15;

  if (ratio >= fairLow && ratio <= fairHigh) {
    return { accepted: true, message: 'CPU accepts — fair value swap.' };
  }

  if (ratio >= 0.75 && ratio < fairLow) {
    if (Math.random() < 0.5) {
      return {
        accepted: false,
        counter: proposal,
        message: 'CPU counters — wants slightly more value.',
      };
    }
  }

  if (ratio > fairHigh) {
    return { accepted: true, message: 'CPU accepts — you\'re overpaying and they\'ll take it.' };
  }

  return { accepted: false, message: 'CPU rejects — trade too far from fair value.' };
}

/** Swap pick ownership between two team slots for future picks. */
export function swapPickSlots(
  pickOwnership: Map<number, number>,
  overallA: number,
  overallB: number,
): Map<number, number> {
  const next = new Map(pickOwnership);
  const slotA = next.get(overallA);
  const slotB = next.get(overallB);
  if (slotA == null || slotB == null) return pickOwnership;
  next.set(overallA, slotB);
  next.set(overallB, slotA);
  return next;
}

export function initPickOwnership(config: DraftConfig): Map<number, number> {
  const map = new Map<number, number>();
  const total = totalPicks(config);
  for (let o = 1; o <= total; o++) {
    const { slot } = slotForOverall(o, config.teams, {
      thirdRoundReversal: config.thirdRoundReversal,
      linear: config.draftOrderType === 'linear',
    });
    map.set(o, slot);
  }
  return map;
}

export function slotOnClock(
  overall: number,
  config: DraftConfig,
  pickOwnership: Map<number, number>,
): number {
  const owner = pickOwnership.get(overall);
  if (owner != null) return owner;
  return slotForOverall(overall, config.teams, {
    thirdRoundReversal: config.thirdRoundReversal,
    linear: config.draftOrderType === 'linear',
  }).slot;
}

export function picksForSlot(
  picks: DraftPickRecord[],
  slot: number,
): DraftPickRecord[] {
  return picks.filter((p) => p.slot === slot);
}

export function randomCpuChat(slot: number, teamName: string): string {
  const lines = [
    `${teamName} is loading their board…`,
    `Room ${slot} — considering best available.`,
    `Might trade back if the board falls.`,
    `Need RB depth this round.`,
    `Waiting on a QB run to end.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)]!;
}
