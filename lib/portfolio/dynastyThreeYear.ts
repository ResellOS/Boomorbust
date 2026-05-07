import Fuse from 'fuse.js';
import {
  ageCurveMultiplier,
  calculateTFOScore,
  type RBUsageStyle,
  type TFOGrade,
  type TFOPosition,
  type TFOVerdict,
} from '@/lib/tfo/formula';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';

export type ThreeYearSortMode = 'score' | 'trajectory' | 'position';

export interface SleeperPlayerLite {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
}

export interface PortfolioThreeYearRow {
  id: string;
  name: string;
  position: TFOPosition;
  photoUrl: string;
  age: number;
  y2025: number;
  y2026: number;
  y2027: number;
  verdict: TFOVerdict;
  chartDashed: boolean;
}

export function abbrevGrade(g: TFOGrade): string {
  const m: Record<TFOGrade, string> = {
    ELITE: 'EL',
    HIGH_VALUE: 'HV',
    VIABLE: 'VI',
    SPECULATIVE: 'SP',
    AVOID: 'AV',
  };
  return m[g] ?? '—';
}

export function scoreBandColor(score: number): string {
  if (score >= 88) return '#36E7A1';
  if (score >= 75) return '#22D3EE';
  if (score >= 60) return '#FBBF24';
  return '#EF4444';
}

const LINE_COLORS: Record<TFOPosition, string> = {
  QB: '#FEBC2E',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

export function positionLineColor(pos: TFOPosition): string {
  return LINE_COLORS[pos];
}

export const CARD_POS_BADGE: Record<TFOPosition, string> = {
  QB: '#FEBC2E',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

export function shortInitialLast(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 8);
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

function toTfoPosition(raw: string): TFOPosition | null {
  const u = raw.toUpperCase();
  if (u === 'QB' || u === 'RB' || u === 'WR' || u === 'TE') return u;
  return null;
}

function curveAtAge(pos: TFOPosition, age: number, rb: RBUsageStyle): number {
  return ageCurveMultiplier(pos, age, rb);
}

export function buildPortfolioThreeYearRows(
  rosterIds: string[],
  playersById: Record<string, SleeperPlayerLite>,
  ktcByNameLower: Record<string, number>,
  dynastyRows: DynastyPlayer2026[],
): PortfolioThreeYearRow[] {
  const exact = new Map(dynastyRows.map((r) => [r.name.trim().toLowerCase(), r]));
  const fuse = new Fuse(dynastyRows, {
    keys: ['name'],
    threshold: 0.35,
    includeScore: true,
  });

  const rows: PortfolioThreeYearRow[] = [];

  for (const id of rosterIds) {
    const p = playersById[id];
    if (!p) continue;
    const pos = toTfoPosition(p.position);
    if (!pos) continue;

    const age = typeof p.age === 'number' && p.age > 0 ? p.age : 24;
    const ktc = ktcByNameLower[p.full_name.trim().toLowerCase()] ?? 0;

    let baseTfo: number;
    let verdict: TFOVerdict;
    let rbStyle: RBUsageStyle = 'POWER';

    let dynastyHit: DynastyPlayer2026 | undefined = exact.get(p.full_name.trim().toLowerCase());
    if (!dynastyHit) {
      const fs = fuse.search(p.full_name)[0];
      if (fs && typeof fs.score === 'number' && fs.score <= 0.38) {
        dynastyHit = fs.item;
      }
    }

    if (dynastyHit && dynastyHit.position === pos) {
      baseTfo = dynastyHit.tfoScore;
      verdict = dynastyHit.tfoVerdict;
      rbStyle = dynastyHit.tfoRbUsageStyle ?? 'POWER';
    } else {
      const tfo = calculateTFOScore({
        playerId: id,
        position: pos,
        age,
        team: (p.team ?? 'FA').toUpperCase(),
        ocScheme: schemeForTeam(p.team),
        opportunityScore: 70,
        olGrade: 70,
        wrCastGrade: 70,
        redZoneShare: 60,
        ktcValue: ktc > 0 ? ktc : 2200,
        ocYear: 2,
        rbUsageStyle: 'POWER',
        wrDeployment: 'SLOT',
        teamQbIsYoung: true,
      });
      baseTfo = tfo.tfoScore;
      verdict = tfo.verdict;
      rbStyle = 'POWER';
    }

    const y2025 = Math.max(0, Math.min(100, baseTfo));
    const m1 = curveAtAge(pos, age + 1, rbStyle);
    const m2 = curveAtAge(pos, age + 2, rbStyle);
    const y2026 = Math.max(0, Math.min(100, baseTfo * m1));
    const y2027 = Math.max(0, Math.min(100, baseTfo * m2));

    const chartDashed = verdict === 'BUST';

    rows.push({
      id,
      name: p.full_name,
      position: pos,
      photoUrl: `https://sleepercdn.com/content/nfl/players/${id}.jpg`,
      age,
      y2025,
      y2026,
      y2027,
      verdict,
      chartDashed,
    });
  }

  return rows;
}

export function sortThreeYearRows(rows: PortfolioThreeYearRow[], mode: ThreeYearSortMode): PortfolioThreeYearRow[] {
  const posOrder: Record<TFOPosition, number> = { QB: 0, RB: 1, WR: 2, TE: 3 };
  const copy = [...rows];
  if (mode === 'score') {
    copy.sort((a, b) => b.y2025 - a.y2025);
  } else if (mode === 'trajectory') {
    copy.sort((a, b) => b.y2027 - b.y2025 - (a.y2027 - a.y2025));
  } else {
    copy.sort((a, b) => {
      const dp = posOrder[a.position] - posOrder[b.position];
      if (dp !== 0) return dp;
      return b.y2025 - a.y2025;
    });
  }
  return copy;
}

export type TradeBadge = 'BUY' | 'HOLD' | 'SELL';

export function tradeBadgeFor(row: PortfolioThreeYearRow): TradeBadge {
  const { y2025, y2026, age, verdict } = row;
  const sell =
    y2026 < y2025 - 8 || (age > 28 && y2025 < 65) || verdict === 'BUST';
  if (sell) return 'SELL';
  const buy = y2026 > y2025 + 5 || (age < 25 && y2025 > 70) || verdict === 'BOOM';
  if (buy) return 'BUY';
  return 'HOLD';
}

export function portfolioThreeYearSummary(rows: PortfolioThreeYearRow[]) {
  if (!rows.length) {
    return {
      elite: 0,
      declining: 0,
      rising: 0,
      atRisk: 0,
      avgTfo: 0,
    };
  }
  let elite = 0;
  let declining = 0;
  let rising = 0;
  let atRisk = 0;
  let sum = 0;
  for (const r of rows) {
    if (r.y2025 >= 88) elite++;
    if (r.y2026 < r.y2025 - 5) declining++;
    if (r.y2026 > r.y2025 + 3) rising++;
    if (r.y2025 < 60 || r.verdict === 'BUST') atRisk++;
    sum += r.y2025;
  }
  return {
    elite,
    declining,
    rising,
    atRisk,
    avgTfo: Math.round(sum / rows.length),
  };
}
