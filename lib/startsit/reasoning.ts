import type { PlayerSubScores } from '@/lib/players/types';
import { getDefensiveRank, pointsAllowedLabel } from './matchupRankings';

const LOW_METRIC = 45;
const LEAGUE_AVG = 50;

const LOW_LABELS: Partial<Record<keyof PlayerSubScores, string>> = {
  opportunity: 'Opportunity share falling',
  situation: 'Situation trending down',
  ageCurve: 'Snap count risk — usage declining',
  upside: 'Ceiling capped this week',
};

type TfoRow = {
  iq?: number | null;
  ffig?: number | null;
  sit_score?: number | null;
};

function finite(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** True only when efficiency comes from real engine columns — not sit_score fallback. */
export function hasRealEfficiencyData(row: TfoRow): boolean {
  return finite(row.iq) || finite(row.ffig);
}

export interface StartSitWhyInput {
  variant: 'start' | 'sit';
  opsScore?: number | null;
  sitScore?: number | null;
  sfsScore?: number | null;
  rankDelta?: number | null;
  opponent: string;
  position: string;
  hasRealSubScores: boolean;
  subScores: PlayerSubScores;
  efficiencyRow?: TfoRow;
}

/** 1–2 plain-English bullets with ↑/↓ prefixes for START/SIT lists. */
export function buildStartSitWhyBullets(input: StartSitWhyInput): string[] {
  const bullets: string[] = [];
  const prefix = input.variant === 'start' ? '↑' : '↓';
  const opp = input.opponent.replace('@', '');
  const defRank = getDefensiveRank(opp, input.position);
  const toughMatchup = defRank <= 8;

  if (input.variant === 'start') {
    const oppHigh =
      (finite(input.opsScore) && input.opsScore >= 62) ||
      (input.hasRealSubScores && input.subScores.opportunity >= 62);
    if (oppHigh) bullets.push(`${prefix} High opportunity projection`);

    const sitHigh =
      (finite(input.sitScore) && input.sitScore >= 62) ||
      (finite(input.sfsScore) && input.sfsScore >= 62) ||
      (input.hasRealSubScores && input.subScores.situation >= 62);
    if (sitHigh) bullets.push(`${prefix} Favorable situation score`);

    if (finite(input.rankDelta) && input.rankDelta >= 5) {
      bullets.push(`${prefix} BOB rates higher than consensus`);
    }
  } else {
    if (finite(input.sitScore) && input.sitScore < LOW_METRIC) {
      bullets.push(`${prefix} Situation declining`);
    } else if (input.hasRealSubScores && input.subScores.situation < LOW_METRIC) {
      bullets.push(`${prefix} Situation declining`);
    }

    if (finite(input.opsScore) && input.opsScore < LOW_METRIC) {
      bullets.push(`${prefix} Opportunity share falling`);
    } else if (input.hasRealSubScores && input.subScores.opportunity < LOW_METRIC) {
      bullets.push(`${prefix} Opportunity share falling`);
    }

    if (toughMatchup) {
      bullets.push(`${prefix} Tough matchup`);
    }

    if (finite(input.rankDelta) && input.rankDelta <= -5) {
      bullets.push(`${prefix} BOB rates below market consensus`);
    }
  }

  if (bullets.length === 0) {
    bullets.push(`${prefix} BOB Dynasty Rating supports this call`);
  }

  return bullets.slice(0, 2);
}

export function generateStartSitReasoning(
  subScores: PlayerSubScores,
  opponent: string,
  position: string,
  team: string,
  startScore: number,
  options?: { hasRealSubScores?: boolean; efficiencyRow?: TfoRow },
): string {
  const entries: { key: keyof PlayerSubScores; label: string }[] = [
    { key: 'opportunity', label: 'target share' },
    { key: 'situation', label: 'game script' },
    { key: 'ageCurve', label: 'usage trend' },
    { key: 'iq', label: 'efficiency' },
    { key: 'upside', label: 'ceiling' },
  ];

  const ranked = entries
    .map((e) => ({ ...e, value: subScores[e.key] }))
    .sort((a, b) => b.value - a.value);

  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const pos = position.toUpperCase();
  const opp = opponent.replace('@', '');

  if (top && top.value > 85) {
    const pts = pointsAllowedLabel(opp, pos);
    return `${team} faces ${opp} allowing ${pts}+ pts to ${pos}s this season`;
  }

  if (options?.hasRealSubScores && low && low.value > 0 && low.value < LOW_METRIC) {
    if (low.key === 'iq') {
      const effRow = options.efficiencyRow;
      if (
        hasRealEfficiencyData(effRow ?? {}) &&
        subScores.iq < LEAGUE_AVG
      ) {
        return 'Route efficiency flagging below league average';
      }
    } else if (LOW_LABELS[low.key]) {
      return LOW_LABELS[low.key]!;
    }
  }

  if (startScore >= 75) {
    return `Elite ${pos} profile with ${top?.label ?? 'volume'} driving weekly floor`;
  }

  if (startScore < 50) {
    const rank = pointsAllowedLabel(opp, pos);
    return `${opp} limiting ${pos} production — ${rank} pts allowed trend`;
  }

  return `Matchup-neutral week — lean on ${top?.label ?? 'usage'} for edge`;
}
