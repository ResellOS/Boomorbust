import type { DraftConfig, DraftablePlayer, DraftPickRecord, TierBreak } from './types';
import { positionalNeed, rosterCounts, slotForOverall } from './engine';
import { tierBreakStatus } from './analyst';
import { tierForBobRank } from './tiers';
import { safeNum, safePickLabel, safeTeams } from './safeDisplay';

export function draftSubheading(config: DraftConfig): string {
  const teams = safeTeams(config);
  const sf = config.superflex ? 'Superflex' : '1QB';
  if (config.draftType === 'rookie') {
    return `${teams} Team ${sf} Rookie Mock`;
  }
  if (config.draftType === 'redraft') {
    return `${teams} Team Redraft Mock`;
  }
  return `${teams} Team ${sf} Startup Mock`;
}

export type NeedLevel = 'High' | 'Medium' | 'Low';

export interface TeamNeedRow {
  position: string;
  level: NeedLevel;
  depth: number;
}

export function teamNeedsDetailed(
  roster: DraftablePlayer[],
  superflex: boolean,
): TeamNeedRow[] {
  const have = rosterCounts(roster);
  const ideal = superflex
    ? { QB: 3, RB: 6, WR: 7, TE: 2 }
    : { QB: 2, RB: 6, WR: 7, TE: 2 };

  const positions = superflex ? ['QB', 'RB', 'WR', 'TE', 'SF'] : ['QB', 'RB', 'WR', 'TE'];

  return positions.map((pos) => {
    const key = pos === 'SF' ? 'QB' : (pos as keyof typeof have);
    const depth = pos === 'SF' ? have.QB : have[key];
    const target = pos === 'SF' ? ideal.QB : ideal[key];
    const gap = target - depth;
    let level: NeedLevel = 'Low';
    if (gap >= 3) level = 'High';
    else if (gap >= 1) level = 'Medium';
    return { position: pos, level, depth };
  });
}

export function needsLabel(needs: TeamNeedRow[]): string {
  return needs
    .filter((n) => n.level !== 'Low')
    .map((n) => n.position)
    .join(' / ') || 'Balanced';
}

export function pickConfidence(
  player: DraftablePlayer,
  currentOverall: number,
  tierStatus: { kind: string },
): number {
  const adp = safeNum(player.adp, player.bobRank);
  const gap = adp - currentOverall;
  let score = 72 + Math.min(18, Math.max(-5, gap * 0.8));
  if (tierStatus.kind === 'last') score += 10;
  if (tierStatus.kind === 'warning') score += 5;
  return Math.min(98, Math.max(42, Math.round(score)));
}

export function draftEdgeScore(config: DraftConfig): {
  score: number;
  label: string;
  detail: string;
} {
  const pick = Math.max(1, config.yourPick);
  const teams = safeTeams(config);
  const pct = Math.round(((teams - pick + 1) / teams) * 100);
  const score = Math.min(92, Math.max(48, 40 + pct / 1.4));
  const label =
    pick <= 2 ? 'Elite Draft Position' : pick <= 5 ? 'Strong Draft Position' : 'Value Build Spot';
  const detail = `Top ${Math.max(1, Math.round((pick / teams) * 100))}% slot · Pick ${pick}`;
  return { score: Math.round(score), label, detail };
}

export function userUpcomingPicks(
  config: DraftConfig,
  currentOverall: number,
  count = 4,
): string[] {
  const teams = safeTeams(config);
  const total = teams * config.rounds;
  const slotOpts = {
    thirdRoundReversal: config.thirdRoundReversal,
    linear: config.draftOrderType === 'linear',
  };
  const labels: string[] = [];
  for (let o = currentOverall; o <= total && labels.length < count; o++) {
    const { slot } = slotForOverall(o, teams, slotOpts);
    if (slot === config.yourPick) {
      labels.push(safePickLabel(o, teams));
    }
  }
  return labels;
}

export function draftStrategySummary(
  config: DraftConfig,
  roster: DraftablePlayer[],
  tierStatus: { kind: string; tier: number },
  round: number,
): {
  strategy: string;
  roundFocus: string;
  tierBreak: string;
  approach: 'BPA' | 'Need' | 'Both';
} {
  const need = positionalNeed(roster, config.superflex);
  const early = round <= 2;
  const strategy =
    config.draftType === 'redraft' ? 'Weekly Upside First' : 'Best Player Available';
  let roundFocus = 'Elite talent at any position';
  if (config.draftType === 'rookie') {
    roundFocus = early ? 'Elite rookie RB or WR' : 'Depth + upside swings';
  } else if (early && need === 'QB' && config.superflex) {
    roundFocus = 'Franchise QB or elite Superflex asset';
  } else if (early && need === 'RB') {
    roundFocus = 'Elite RB or franchise QB';
  } else if (early && need === 'WR') {
    roundFocus = 'Alpha WR or elite RB';
  }

  const tierBreak =
    tierStatus.kind === 'last'
      ? `Tier cliff after this pick — Tier ${tierStatus.tier}`
      : tierStatus.kind === 'warning'
        ? `Tier break approaching — ${tierStatus.tier} talent thinning`
        : 'No urgent tier break detected';

  const approach: 'BPA' | 'Need' | 'Both' = roster.length < 3 ? 'BPA' : 'Both';

  return { strategy, roundFocus, tierBreak, approach };
}

export function positionTierGroups(
  pool: DraftablePlayer[],
  taken: Set<string>,
  position: string,
  tierBreaks: TierBreak[],
  limit = 5,
): { tier: number; players: { name: string; score: number }[] }[] {
  const avail = pool
    .filter((p) => !taken.has(p.playerId) && p.position.toUpperCase() === position.toUpperCase())
    .sort((a, b) => a.bobRank - b.bobRank)
    .slice(0, limit);

  const groups = new Map<number, { name: string; score: number }[]>();
  for (const p of avail) {
    const tier = tierForBobRank(p.bobRank, tierBreaks);
    const list = groups.get(tier) ?? [];
    list.push({ name: p.name, score: p.tfoScore });
    groups.set(tier, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 2)
    .map(([tier, players]) => ({ tier, players }));
}

export function trendingUp(
  pool: DraftablePlayer[],
  taken: Set<string>,
  limit = 3,
): { player: DraftablePlayer; delta: number }[] {
  return pool
    .filter((p) => !taken.has(p.playerId))
    .map((p) => ({ player: p, delta: p.marketRank - p.bobRank }))
    .filter((x) => x.delta > 3)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

export function trendingDown(
  pool: DraftablePlayer[],
  taken: Set<string>,
  limit = 3,
): { player: DraftablePlayer; delta: number }[] {
  return pool
    .filter((p) => !taken.has(p.playerId))
    .map((p) => ({ player: p, delta: p.bobRank - p.marketRank }))
    .filter((x) => x.delta > 3)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

export function scoutingVerdict(
  player: DraftablePlayer,
  currentOverall: number,
): 'STRONG PICK' | 'VALUE PICK' | 'REACH' | 'AVOID' {
  const gap = player.adp - currentOverall;
  if (gap > 12) return 'VALUE PICK';
  if (gap > 4) return 'STRONG PICK';
  if (gap < -8) return 'REACH';
  if (player.tfoScore < 45) return 'AVOID';
  return 'STRONG PICK';
}

export function teamOnClockName(config: DraftConfig, slot: number): string {
  const t = config.teamOrder.find((x) => x.slot === slot);
  return t?.name ?? `Team ${slot}`;
}

export function currentRound(currentOverall: number, config: DraftConfig): number {
  const teams = safeTeams(config);
  return Math.floor((Math.max(1, currentOverall) - 1) / teams) + 1;
}

export function userRosterSpots(config: DraftConfig, userPicks: DraftPickRecord[]): string {
  const total = config.rosterSlots.reduce((s, sl) => s + sl.count, 0);
  return `${userPicks.length}/${total}`;
}
