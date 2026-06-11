import { deriveRadarVals, getVerdict } from '@/lib/verdict';
import type { HubPlayer, PlayerSubScores, TrendDirection, VerdictLabel } from './types';

export function safeScore(score: number | null | undefined): number {
  return typeof score === 'number' && Number.isFinite(score) ? score : 0;
}

export function normalizeVerdict(
  raw: string | null | undefined,
  tfoScore: number,
): VerdictLabel {
  const v = (raw ?? '').toUpperCase().replace(/_/g, ' ').trim();
  if (v === 'STRONG BOOM') return 'STRONG BOOM';
  if (v === 'BOOM' || v === 'LEAN BOOM') return 'BOOM';
  if (v === 'HOLD' || v === 'NEUTRAL') return 'HOLD';
  if (v === 'STRONG BUST') return 'STRONG BUST';
  if (v === 'BUST' || v === 'LEAN BUST') return 'BUST';

  const derived = getVerdict(tfoScore);
  return derived.label as VerdictLabel;
}

export function getDynastyTier(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Solid';
  if (score >= 60) return 'Average';
  return 'Weak';
}

export function calcTrend(current: number, previous: number | null): TrendDirection {
  if (previous === null || previous <= 0) return 'flat';
  const delta = current - previous;
  if (delta > 0.5) return 'up';
  if (delta < -0.5) return 'down';
  return 'flat';
}

type TfoRow = {
  opportunity?: number | null;
  situation?: number | null;
  age_curve?: number | null;
  iq?: number | null;
  upside?: number | null;
  ops?: number | null;
  sfs?: number | null;
  ffig?: number | null;
  sit?: number | null;
};

export function resolveSubScores(
  row: TfoRow,
  playerId: string,
  tfoScore: number,
): PlayerSubScores {
  const pick = (...vals: (number | null | undefined)[]) => {
    for (const v of vals) {
      if (typeof v === 'number' && Number.isFinite(v)) return Math.min(100, Math.max(0, v));
    }
    return null;
  };

  const opportunity = pick(row.opportunity, row.ops);
  const situation = pick(row.situation, row.sfs);
  const ageCurve = pick(row.age_curve);
  const iq = pick(row.iq, row.ffig);
  const upside = pick(row.upside, row.sit);

  if (
    opportunity !== null &&
    situation !== null &&
    ageCurve !== null &&
    iq !== null &&
    upside !== null
  ) {
    return { opportunity, situation, ageCurve, iq, upside };
  }

  const radar = deriveRadarVals(playerId, tfoScore);
  return {
    opportunity: opportunity ?? Math.round(radar[0] * 100),
    situation: situation ?? Math.round(radar[1] * 100),
    ageCurve: ageCurve ?? Math.round(radar[2] * 100),
    iq: iq ?? Math.round(radar[3] * 100),
    upside: upside ?? Math.round(radar[4] * 100),
  };
}

export function isBoomVerdict(verdict: VerdictLabel): boolean {
  return verdict === 'STRONG BOOM' || verdict === 'BOOM';
}

export function isBustVerdict(verdict: VerdictLabel): boolean {
  return verdict === 'STRONG BUST' || verdict === 'BUST';
}

export function isHoldVerdict(verdict: VerdictLabel): boolean {
  return verdict === 'HOLD';
}

export function findSimilarPlayers(
  all: HubPlayer[],
  selected: HubPlayer,
  limit = 3,
): HubPlayer[] {
  const min = selected.tfoScore - 10;
  const max = selected.tfoScore + 10;
  return all
    .filter(
      (p) =>
        p.playerId !== selected.playerId &&
        p.position === selected.position &&
        p.tfoScore >= min &&
        p.tfoScore <= max,
    )
    .sort((a, b) => Math.abs(a.tfoScore - selected.tfoScore) - Math.abs(b.tfoScore - selected.tfoScore))
    .slice(0, limit);
}

export const VERDICT_BADGE_CLASS: Record<VerdictLabel, string> = {
  'STRONG BOOM': 'bg-boom/10 border border-boom/[0.28] text-boom',
  BOOM: 'bg-boom/[0.07] border border-boom/20 text-boom',
  HOLD: 'bg-hold/[0.08] border border-hold/[0.22] text-hold',
  BUST: 'bg-bust/[0.08] border border-bust/[0.22] text-bust',
  'STRONG BUST': 'bg-bust/[0.12] border border-bust/30 text-bust',
};

export function ratingColorClass(score: number): string {
  if (score >= 70) return 'text-boom';
  if (score >= 60) return 'text-hold';
  return 'text-bust';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

export function minutesAgo(iso: string | null): number {
  if (!iso) return 8;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(diff / 60000));
}
