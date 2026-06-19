import type { DraftablePlayer, DraftPickRecord, TierBreak } from './types';
import { tierForBobRank } from './tiers';

export type DraftDynamicAlert =
  | {
      kind: 'position_run';
      position: string;
      count: number;
      window: number;
    }
  | {
      kind: 'value';
      player: DraftablePlayer;
      currentPick: number;
      adp: number;
      margin: number;
    };

export interface TierBreakStatus {
  kind: 'none' | 'warning' | 'last';
  picksUntil: number;
  tier: number;
}

export interface PlayerPoolBadge {
  type: 'value' | 'bob' | 'last_tier';
  label: string;
}

/** Live draft grade from ADP efficiency — updates after each user pick. */
export function liveDraftGrade(userPicks: DraftPickRecord[]): string {
  if (userPicks.length === 0) return '--';

  const avg =
    userPicks.reduce((s, p) => {
      const valueScore = p.player.tfoScore - p.player.adp * 0.5;
      return s + valueScore;
    }, 0) / userPicks.length;

  if (avg > 15) return 'A';
  if (avg >= 10) return 'B+';
  if (avg >= 5) return 'B';
  if (avg >= 0) return 'C+';
  return 'C';
}

export function draftGradeColor(grade: string): string {
  if (grade === 'A' || grade === 'B+') return '#36E7A1';
  if (grade === 'B' || grade === 'C+') return '#FBBF24';
  if (grade === '--') return '#64748B';
  return '#EF4444';
}

/** Proxy championship odds until Championship Engine ships. */
export function estimatedChampionshipImpact(tfoScore: number): {
  before: number;
  after: number;
  delta: number;
} {
  const before = Math.min(35, Math.max(8, Math.round(tfoScore * 0.2)));
  const delta = Math.max(1, Math.round(tfoScore / 15));
  return { before, after: Math.min(45, before + delta), delta };
}

export function pickLabel(overall: number, teams: number): string {
  if (!Number.isFinite(overall) || overall <= 0 || !Number.isFinite(teams) || teams <= 0) {
    return '—';
  }
  const round = Math.floor((overall - 1) / teams) + 1;
  const pickInRound = ((overall - 1) % teams) + 1;
  return `${round}.${String(pickInRound).padStart(2, '0')}`;
}

export function bobReasoning(p: DraftablePlayer): string {
  if (p.age != null && p.age <= 24) {
    return 'Best available dynasty value. Elite age curve with 5+ peak years.';
  }
  if (p.age != null && p.age >= 29) {
    return 'Win-now production with stable weekly floor — surround with upside.';
  }
  return 'Best available dynasty value on the board right now.';
}

export function dynastyRankByPosition(
  player: DraftablePlayer,
  pool: DraftablePlayer[],
): string {
  const pos = player.position.toUpperCase();
  const samePos = pool
    .filter((p) => p.position.toUpperCase() === pos)
    .sort((a, b) => b.tfoScore - a.tfoScore);
  const idx = samePos.findIndex((p) => p.playerId === player.playerId);
  const rank = idx >= 0 ? idx + 1 : 0;
  return rank > 0 ? `${pos}${rank}` : `${pos}—`;
}

export function peakYearsRemaining(age: number | null): number {
  if (age == null) return 4;
  if (age <= 23) return 7;
  if (age <= 25) return 6;
  if (age <= 27) return 5;
  if (age <= 29) return 3;
  return 2;
}

export function projectedPpg(player: DraftablePlayer): number {
  if (player.proj != null && player.proj > 0) {
    return Math.round((player.proj / 17) * 10) / 10;
  }
  return Math.round(player.tfoScore * 0.28 * 10) / 10;
}

export function tierBreakStatus(
  pool: DraftablePlayer[],
  taken: Set<string>,
  tierBreaks: TierBreak[],
): TierBreakStatus {
  const available = pool
    .filter((p) => !taken.has(p.playerId))
    .sort((a, b) => a.bobRank - b.bobRank);

  if (available.length === 0) {
    return { kind: 'none', picksUntil: 0, tier: 1 };
  }

  const top = available[0]!;
  const topTier = tierForBobRank(top.bobRank, tierBreaks);
  const inTier = available.filter((p) => tierForBobRank(p.bobRank, tierBreaks) === topTier);
  const picksUntil = inTier.length - 1;

  if (inTier.length === 1) {
    return { kind: 'last', picksUntil: 0, tier: topTier };
  }
  if (picksUntil <= 3 && picksUntil > 0) {
    return { kind: 'warning', picksUntil, tier: topTier };
  }
  return { kind: 'none', picksUntil, tier: topTier };
}

/** Real-time board reactions from the last N picks. */
export function computeDraftDynamics(
  picks: DraftPickRecord[],
  pool: DraftablePlayer[],
  taken: Set<string>,
  currentOverall: number,
  window = 10,
): DraftDynamicAlert[] {
  const alerts: DraftDynamicAlert[] = [];
  const recent = picks.slice(-window);

  const posCounts: Record<string, number> = {};
  for (const p of recent) {
    const pos = p.player.position.toUpperCase();
    posCounts[pos] = (posCounts[pos] ?? 0) + 1;
  }

  for (const [pos, count] of Object.entries(posCounts)) {
    if (count >= 4) {
      alerts.push({ kind: 'position_run', position: pos, count, window });
    }
  }

  let bestValue: DraftDynamicAlert | null = null;
  for (const p of pool) {
    if (taken.has(p.playerId)) continue;
    const margin = p.adp - currentOverall;
    if (margin > 5) {
      if (!bestValue || margin > (bestValue as Extract<DraftDynamicAlert, { kind: 'value' }>).margin) {
        bestValue = {
          kind: 'value',
          player: p,
          currentPick: currentOverall,
          adp: p.adp,
          margin: Math.round(margin),
        };
      }
    }
  }
  if (bestValue) alerts.push(bestValue);

  return alerts.slice(0, 2);
}

export function playerPoolBadges(
  player: DraftablePlayer,
  currentOverall: number,
  bobTopId: string | null,
  tierBreaks: TierBreak[],
  pool: DraftablePlayer[],
  taken: Set<string>,
): PlayerPoolBadge[] {
  const badges: PlayerPoolBadge[] = [];

  if (bobTopId && player.playerId === bobTopId) {
    badges.push({ type: 'bob', label: 'BOB ★' });
  }

  const valueMargin = player.adp - currentOverall;
  if (valueMargin > 7) {
    badges.push({
      type: 'value',
      label: `VALUE +${Math.round(valueMargin)}`,
    });
  }

  const tier = tierForBobRank(player.bobRank, tierBreaks);
  const availableInTier = pool
    .filter((p) => !taken.has(p.playerId) && tierForBobRank(p.bobRank, tierBreaks) === tier)
    .sort((a, b) => a.bobRank - b.bobRank);
  const lastInTier = availableInTier[availableInTier.length - 1];
  if (lastInTier?.playerId === player.playerId && availableInTier.length <= 2) {
    badges.push({ type: 'last_tier', label: 'LAST IN TIER' });
  }

  return badges;
}

export function alternativesByTfo(
  pool: DraftablePlayer[],
  taken: Set<string>,
  excludeId: string,
  limit = 3,
): DraftablePlayer[] {
  return pool
    .filter((p) => !taken.has(p.playerId) && p.playerId !== excludeId)
    .sort((a, b) => b.tfoScore - a.tfoScore)
    .slice(0, limit);
}

export function draftGradeAnalysis(
  userPicks: DraftPickRecord[],
  superflex: boolean,
): { grade: string; label: string; strengths: string[]; weaknesses: string[] } {
  const grade = liveDraftGrade(userPicks);
  const positions = userPicks.map((p) => p.player.position);
  const hasQb = positions.includes('QB');
  const rbCount = positions.filter((p) => p === 'RB').length;
  const wrCount = positions.filter((p) => p === 'WR').length;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hasQb) strengths.push('Elite QB opportunity');
  else weaknesses.push('No QB yet');
  if (rbCount >= 2) strengths.push('RB depth building');
  else if (rbCount === 0) weaknesses.push('No RB yet');
  else strengths.push('Keep building at RB');
  if (wrCount >= 2) strengths.push('WR corps taking shape');
  else if (wrCount === 0) weaknesses.push('Depth at WR uncertain');
  if (superflex && positions.filter((p) => p === 'QB').length >= 2) {
    strengths.push('Superflex QB stack started');
  }

  if (strengths.length === 0) strengths.push('Balanced start — stay patient');
  if (weaknesses.length === 0) weaknesses.push('Monitor positional balance');

  const label =
    grade === 'A' || grade === 'B+' ? 'Good Start' : grade === 'B' || grade === 'C+' ? 'Solid' : 'Building';

  return { grade, label, strengths: strengths.slice(0, 2), weaknesses: weaknesses.slice(0, 2) };
}

export function buildFitScore(player: DraftablePlayer, need: string): number {
  if (player.position === need) return 94;
  if (need === 'FLEX' && ['RB', 'WR', 'TE'].includes(player.position)) return 82;
  return 72;
}

export function whyPickReasons(
  player: DraftablePlayer,
  tierStatus: TierBreakStatus,
  isBobTop: boolean,
): string[] {
  const reasons: string[] = [];
  if (isBobTop) reasons.push('Best player available');
  if (tierStatus.kind === 'last') reasons.push('Huge tier drop after him');
  else if (tierStatus.kind === 'warning') reasons.push('Low chance available next round');
  reasons.push('Fits current roster build');
  return reasons.slice(0, 4);
}
