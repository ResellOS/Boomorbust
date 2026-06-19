import type { MarketVerdictDisplay } from '@/lib/verdict/fetchMarketVerdicts';
import type { MarketVerdict } from '@/lib/verdict/marketVerdict';
import type { ExposurePlayer } from './types';

export type PortfolioRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConcentrationRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type BenchmarkStatus = 'good' | 'warn' | 'bad';

export interface ExposureTopbarStats {
  totalAssetValue: number;
  leaguesConnected: number;
  championshipOdds: number;
  portfolioRisk: PortfolioRiskLevel;
  largestPosition: string;
  largestPositionPct: number;
  portfolioGrade: string;
  lastUpdatedMinutes: number;
}

export interface PositionBreakdownRow {
  position: string;
  pct: number;
  color: string;
  benchmarkPct: number;
  benchmarkStatus: BenchmarkStatus;
}

export interface PortfolioOverview {
  totalAssetValue: number;
  leaguesConnected: number;
  championshipOdds: number;
  portfolioRisk: PortfolioRiskLevel;
  portfolioGrade: string;
  largestPosition: string;
  largestPositionPct: number;
  positionBreakdown: PositionBreakdownRow[];
}

export interface PortfolioHeroOpportunity {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  bobRankLabel: string;
  marketRank: number | null;
  portfolioImpact: number;
  targetLeague: string;
  targetLeagueId: string;
  tfoScore: number;
  marketVerdict: MarketVerdictDisplay;
}

export interface PortfolioHeroRisk {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  leagueCount: number;
  portfolioPct: number;
  riskLevel: ConcentrationRiskLevel;
  tfoScore: number;
  marketVerdict: MarketVerdictDisplay;
}

export interface MissingEliteAsset {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  tfoScore: number;
  bobRankLabel: string;
  portfolioImpact: number;
}

export interface ConcentrationRow {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  leagueCount: number;
  leagueNames: string[];
  portfolioPct: number;
  riskLevel: ConcentrationRiskLevel;
  riskBadge: string;
  marketVerdict: MarketVerdictDisplay;
  tfoScore: number;
}

export interface VerdictExposureSummary {
  buyCount: number;
  buyImpact: number;
  sellCount: number;
  sellRisk: number;
}

export interface SimulatorPlayer {
  playerId: string;
  fullName: string;
  position: string;
  tfoScore: number;
  leagueCount: number;
}

export interface ExposurePageData {
  leagues: { id: string; name: string; status?: string | null }[];
  topbar: ExposureTopbarStats;
  overview: PortfolioOverview;
  biggestOpportunity: PortfolioHeroOpportunity | null;
  biggestRisk: PortfolioHeroRisk | null;
  missingElite: MissingEliteAsset[];
  concentrationRows: ConcentrationRow[];
  verdictSummary: VerdictExposureSummary;
  /** Multi-league holdings for bottom section */
  players: ExposurePlayer[];
  simulatorPool: SimulatorPlayer[];
  acquirePool: SimulatorPlayer[];
}

/** Static winning-dynasty portfolio benchmarks (research-based). */
export const WINNING_PORTFOLIO_BENCHMARKS: Record<string, number> = {
  WR: 35,
  RB: 28,
  QB: 18,
  TE: 19,
};

export const POSITION_BAR_COLORS: Record<string, string> = {
  QB: '#EF4444',
  RB: '#22D3EE',
  WR: '#3B82F6',
  TE: '#F97316',
};

export interface RosterSlot {
  playerId: string;
  leagueId: string;
  tfoScore: number;
  position: string;
}

export interface OwnedPlayerAggregate {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  tfoScore: number;
  leagueCount: number;
  leagueIds: string[];
  leagueNames: string[];
  portfolioPct: number;
  concentrationRisk: ConcentrationRiskLevel;
  marketVerdict: MarketVerdictDisplay;
  valueSignalUp: boolean;
}

function benchmarkStatus(actual: number, target: number): BenchmarkStatus {
  const diff = Math.abs(actual - target);
  if (diff <= 4) return 'good';
  if (diff <= 8) return 'warn';
  return 'bad';
}

export function computePortfolioGrade(avgTfo: number, poolAvgTfo: number): string {
  if (poolAvgTfo <= 0) {
    if (avgTfo >= 72) return 'A';
    if (avgTfo >= 65) return 'B+';
    if (avgTfo >= 58) return 'B';
    return 'C+';
  }
  const ratio = avgTfo / poolAvgTfo;
  if (ratio >= 1.12) return 'A';
  if (ratio >= 1.05) return 'A-';
  if (ratio >= 0.98) return 'B+';
  if (ratio >= 0.9) return 'B';
  return 'C+';
}

export function concentrationRisk(
  portfolioPct: number,
  leagueCount: number,
): ConcentrationRiskLevel {
  if (portfolioPct > 20 || leagueCount >= 5) return 'HIGH';
  if (portfolioPct >= 15 || leagueCount >= 4) return 'MEDIUM';
  return 'LOW';
}

export function concentrationBadge(level: ConcentrationRiskLevel): string {
  if (level === 'HIGH') return 'HIGH CONCENTRATION';
  if (level === 'MEDIUM') return 'MODERATE';
  return 'DIVERSIFIED';
}

export function portfolioRiskLevel(
  aggregates: OwnedPlayerAggregate[],
): PortfolioRiskLevel {
  let worst: ConcentrationRiskLevel = 'LOW';
  for (const p of aggregates) {
    if (p.concentrationRisk === 'HIGH') return 'HIGH';
    if (p.concentrationRisk === 'MEDIUM') worst = 'MEDIUM';
  }
  return worst;
}

export function computeChampionshipOdds(
  leagues: { status?: string | null }[],
): number {
  if (leagues.length === 0) return 0;
  let sum = 0;
  for (const l of leagues) {
    const s = (l.status ?? '').toLowerCase();
    if (s.includes('contend')) sum += 24;
    else if (s.includes('rebuild')) sum += 9;
    else sum += 16;
  }
  return Math.round((sum / leagues.length) * 10) / 10;
}

export function buildPositionBreakdown(
  slots: RosterSlot[],
): PositionBreakdownRow[] {
  const totalTfo = slots.reduce((s, x) => s + x.tfoScore, 0);
  const positions = ['WR', 'RB', 'QB', 'TE'] as const;
  return positions.map((position) => {
    const posTfo = slots
      .filter((x) => x.position.toUpperCase() === position)
      .reduce((s, x) => s + x.tfoScore, 0);
    const pct = totalTfo > 0 ? Math.round((posTfo / totalTfo) * 1000) / 10 : 0;
    const benchmarkPct = WINNING_PORTFOLIO_BENCHMARKS[position] ?? 25;
    return {
      position,
      pct,
      color: POSITION_BAR_COLORS[position] ?? '#64748B',
      benchmarkPct,
      benchmarkStatus: benchmarkStatus(pct, benchmarkPct),
    };
  });
}

export function largestPosition(
  breakdown: PositionBreakdownRow[],
): { position: string; pct: number } {
  const top = breakdown.reduce(
    (best, row) => (row.pct > best.pct ? row : best),
    breakdown[0] ?? { position: 'WR', pct: 0, color: '', benchmarkPct: 0, benchmarkStatus: 'good' as BenchmarkStatus },
  );
  return { position: top.position, pct: top.pct };
}

export function bobPositionRankLabel(
  playerId: string,
  position: string,
  rankByPosition: Map<string, Map<string, number>>,
): string {
  const pos = position.toUpperCase();
  const rank = rankByPosition.get(pos)?.get(playerId);
  return rank != null ? `${pos}${rank}` : `${pos}—`;
}

export function buildPositionRanks(
  pool: Array<{ playerId: string; position: string; tfoScore: number }>,
): Map<string, Map<string, number>> {
  const byPos = new Map<string, Array<{ id: string; score: number }>>();
  for (const p of pool) {
    const pos = p.position.toUpperCase();
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push({ id: p.playerId, score: p.tfoScore });
  }
  const out = new Map<string, Map<string, number>>();
  for (const [pos, list] of Array.from(byPos.entries())) {
    list.sort((a, b) => b.score - a.score);
    const rankMap = new Map<string, number>();
    list.forEach((item, i) => rankMap.set(item.id, i + 1));
    out.set(pos, rankMap);
  }
  return out;
}

export function weakestLeagueForPosition(
  position: string,
  rosterByLeague: Map<string, string[]>,
  tfoByPlayer: Map<string, number>,
  positionByPlayer: Map<string, string>,
  leagueNames: Map<string, string>,
): { leagueId: string; leagueName: string } {
  const pos = position.toUpperCase();
  let worstId = '';
  let worstScore = Infinity;

  for (const [leagueId, pids] of Array.from(rosterByLeague.entries())) {
    const posTfo = pids
      .filter((pid) => (positionByPlayer.get(pid) ?? '').toUpperCase() === pos)
      .reduce((s, pid) => s + (tfoByPlayer.get(pid) ?? 0), 0);
    if (posTfo < worstScore) {
      worstScore = posTfo;
      worstId = leagueId;
    }
  }

  if (!worstId && rosterByLeague.size > 0) {
    worstId = Array.from(rosterByLeague.keys())[0]!;
  }

  return {
    leagueId: worstId,
    leagueName: leagueNames.get(worstId) ?? 'Your League',
  };
}

export function estimatedPortfolioImpact(tfoScore: number): number {
  return Math.round((tfoScore / 12) * 10) / 10;
}

export function isBuyVerdict(v: MarketVerdict): boolean {
  return v === 'BOOM' || v === 'BUY';
}

export function isSellVerdict(v: MarketVerdict): boolean {
  return v === 'SELL' || v === 'BUST';
}

export function buildVerdictSummary(
  aggregates: OwnedPlayerAggregate[],
): VerdictExposureSummary {
  let buyCount = 0;
  let buyImpact = 0;
  let sellCount = 0;
  let sellRisk = 0;
  for (const p of aggregates) {
    const v = p.marketVerdict.verdict;
    if (isBuyVerdict(v)) {
      buyCount += p.leagueCount;
      buyImpact += p.portfolioPct;
    }
    if (isSellVerdict(v)) {
      sellCount += p.leagueCount;
      sellRisk += p.portfolioPct;
    }
  }
  return {
    buyCount,
    buyImpact: Math.round(buyImpact * 10) / 10,
    sellCount,
    sellRisk: Math.round(sellRisk * 10) / 10,
  };
}

export function pickBiggestOpportunity(
  candidates: Array<{
    playerId: string;
    fullName: string;
    position: string;
    team: string;
    tfoScore: number;
    marketVerdict: MarketVerdictDisplay;
    valueSignalUp: boolean;
  }>,
  rankByPosition: Map<string, Map<string, number>>,
  rosterByLeague: Map<string, string[]>,
  tfoByPlayer: Map<string, number>,
  positionByPlayer: Map<string, string>,
  leagueNames: Map<string, string>,
): PortfolioHeroOpportunity | null {
  const sorted = [...candidates]
    .filter((c) => c.tfoScore > 0)
    .sort((a, b) => {
      if (a.valueSignalUp !== b.valueSignalUp) return a.valueSignalUp ? -1 : 1;
      return b.tfoScore - a.tfoScore;
    });
  const top = sorted[0];
  if (!top) return null;
  const target = weakestLeagueForPosition(
    top.position,
    rosterByLeague,
    tfoByPlayer,
    positionByPlayer,
    leagueNames,
  );
  return {
    playerId: top.playerId,
    fullName: top.fullName,
    position: top.position,
    team: top.team,
    bobRankLabel: bobPositionRankLabel(top.playerId, top.position, rankByPosition),
    marketRank: top.marketVerdict.ktcRank,
    portfolioImpact: estimatedPortfolioImpact(top.tfoScore),
    targetLeague: target.leagueName,
    targetLeagueId: target.leagueId,
    tfoScore: top.tfoScore,
    marketVerdict: top.marketVerdict,
  };
}

export function pickBiggestRisk(
  aggregates: OwnedPlayerAggregate[],
): PortfolioHeroRisk | null {
  if (aggregates.length === 0) return null;
  const scored = aggregates.map((p) => {
    const sellPenalty = isSellVerdict(p.marketVerdict.verdict) ? 1.35 : 1;
    const score = p.portfolioPct * sellPenalty + p.leagueCount * 2.5;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]!.p;
  return {
    playerId: top.playerId,
    fullName: top.fullName,
    position: top.position,
    team: top.team,
    leagueCount: top.leagueCount,
    portfolioPct: top.portfolioPct,
    riskLevel: top.concentrationRisk,
    tfoScore: top.tfoScore,
    marketVerdict: top.marketVerdict,
  };
}
