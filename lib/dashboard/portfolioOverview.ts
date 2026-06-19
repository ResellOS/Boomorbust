import type { LeagueBundle, PortfolioBundle, PositionKey } from './rotation';

export interface DashboardPortfolioOverview {
  totalPlayers: number;
  avgTeamRank: string;
  youngCoreScore: string;
  youngCoreLabel: string;
  futurePicks: string;
  injuryRisk: string;
  injuryRiskStatus: 'good' | 'warn' | 'bad';
  positionDepth: { position: PositionKey; pct: number; color: string }[];
}

const POS_COLORS: Record<PositionKey, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

function youngCoreFromPortfolio(portfolio: PortfolioBundle): { score: number; label: string } {
  const strong = portfolio.breakdown.positionGrades.filter((g) => g.grade === 'Strong').length;
  const total = portfolio.breakdown.positionGrades.length || 4;
  const tfoFactor = Math.min(100, Math.max(0, portfolio.teamTfo));
  const score = Math.round((strong / total) * 40 + tfoFactor * 0.6);
  let label = 'Average';
  if (score >= 75) label = 'Good';
  else if (score >= 55) label = 'Fair';
  else label = 'Needs Work';
  return { score, label };
}

function injuryRiskFromSignals(portfolio: PortfolioBundle): { label: string; status: 'good' | 'warn' | 'bad' } {
  const { bust, total } = portfolio.signalCounts;
  if (total === 0) return { label: '—', status: 'warn' };
  const bustPct = bust / total;
  if (bustPct >= 0.35) return { label: 'Elevated', status: 'bad' };
  if (bustPct >= 0.2) return { label: 'Moderate', status: 'warn' };
  return { label: 'Low', status: 'good' };
}

export function computeDashboardPortfolioOverview(
  portfolio: PortfolioBundle,
  leagues: LeagueBundle[],
): DashboardPortfolioOverview {
  const counts = new Map<PositionKey, number>();
  for (const p of portfolio.players) {
    const pos = p.position.toUpperCase() as PositionKey;
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }
  const totalPos = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;

  const ranked = leagues.filter((l) => l.standingRank > 0 && l.totalTeams > 0);
  let avgTeamRank = '—';
  if (ranked.length > 0) {
    const avg = ranked.reduce((s, l) => s + l.standingRank, 0) / ranked.length;
    const topPct = avg / (ranked[0]!.totalTeams || 12);
    const tier = topPct <= 0.35 ? 'Top 25%' : topPct <= 0.5 ? 'Top Half' : 'Mid Pack';
    avgTeamRank = `${avg.toFixed(1)} / ${tier}`;
  }

  const young = youngCoreFromPortfolio(portfolio);
  const injury = injuryRiskFromSignals(portfolio);

  return {
    totalPlayers: portfolio.playersRostered,
    avgTeamRank,
    youngCoreScore: `${young.score}`,
    youngCoreLabel: young.label,
    futurePicks: 'Not tracked yet',
    injuryRisk: injury.label,
    injuryRiskStatus: injury.status,
    positionDepth: (['QB', 'RB', 'WR', 'TE'] as PositionKey[]).map((pos) => ({
      position: pos,
      pct: Math.round(((counts.get(pos) ?? 0) / totalPos) * 100),
      color: POS_COLORS[pos],
    })),
  };
}
