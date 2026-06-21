import { LEAGUE_STATUS, type LeagueBundle, type PortfolioBundle, type PositionKey, type RotationPlayer } from './rotation';

export interface DynastyGpsData {
  portfolioStatus: string;
  portfolioStatusColor: string;
  strengthLabel: string;
  strengthValue: string;
  strengthNumeric: number;
  window: string;
  playoffOdds: string | null;
  biggestRisk: string;
  biggestOpportunity: string;
  recommendedFocus: string;
  isLeagueContext: boolean;
}

const POS_LABEL: Record<PositionKey, string> = {
  QB: 'QB',
  RB: 'RB Age',
  WR: 'WR',
  TE: 'TE',
};

function avgTfoByPosition(players: RotationPlayer[]): Map<PositionKey, number> {
  const buckets = new Map<PositionKey, number[]>();
  for (const p of players) {
    const pos = p.position.toUpperCase() as PositionKey;
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    if (p.tfoScore <= 0) continue;
    if (!buckets.has(pos)) buckets.set(pos, []);
    buckets.get(pos)!.push(p.tfoScore);
  }
  const out = new Map<PositionKey, number>();
  for (const [pos, scores] of Array.from(buckets.entries())) {
    out.set(pos, scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }
  return out;
}

function modeStatus(leagues: LeagueBundle[]): { label: string; color: string } {
  if (leagues.length === 0) {
    return { label: LEAGUE_STATUS.ORPHAN.label, color: LEAGUE_STATUS.ORPHAN.color };
  }
  const counts = new Map<string, number>();
  for (const l of leagues) {
    counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
  }
  let bestKey = leagues[0]!.status;
  let bestCount = 0;
  for (const [k, c] of Array.from(counts.entries())) {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k as typeof bestKey;
    }
  }
  const meta = LEAGUE_STATUS[bestKey];
  return { label: meta.label.toUpperCase(), color: meta.color };
}

function biggestRiskLabel(players: RotationPlayer[]): string {
  const avgs = avgTfoByPosition(players);
  if (avgs.size === 0) return 'Roster depth';
  let worst: PositionKey = 'RB';
  let worstScore = Infinity;
  for (const [pos, avg] of Array.from(avgs.entries())) {
    if (avg < worstScore) {
      worstScore = avg;
      worst = pos;
    }
  }
  return worst === 'RB' ? 'RB Age' : POS_LABEL[worst];
}

function biggestOpportunityLabel(players: RotationPlayer[]): string {
  const buyByPos = new Map<PositionKey, number>();
  for (const p of players) {
    const v = p.marketVerdict?.verdict;
    if (v !== 'BOOM' && v !== 'BUY') continue;
    const pos = p.position.toUpperCase() as PositionKey;
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    buyByPos.set(pos, (buyByPos.get(pos) ?? 0) + 1);
  }
  if (buyByPos.size === 0) return 'Acquire WR';
  let best: PositionKey = 'WR';
  let bestCount = -1;
  for (const [pos, c] of Array.from(buyByPos.entries())) {
    if (c > bestCount) {
      bestCount = c;
      best = pos;
    }
  }
  return `Acquire ${POS_LABEL[best]}`;
}

function recommendedFocus(risk: string, opportunity: string, status: string): string {
  if (status.includes('REBUILD')) {
    return `Rebuild ${opportunity.replace('Acquire ', '')} depth before Week 1.`;
  }
  if (risk.includes('RB')) {
    return 'Monitor RB age curve — prioritize youth via trade or draft capital.';
  }
  return `${opportunity} is your clearest path to strengthen the portfolio this week.`;
}

export function computeDynastyGps(
  portfolio: PortfolioBundle,
  leagues: LeagueBundle[],
  currentLeague: LeagueBundle | null,
  empireRating: number,
): DynastyGpsData {
  const isLeague = currentLeague != null;
  const players = isLeague ? currentLeague.players : portfolio.players;
  const breakdown = isLeague ? currentLeague!.breakdown : portfolio.breakdown;
  const statusMeta = isLeague
    ? LEAGUE_STATUS[currentLeague!.status]
    : modeStatus(leagues);

  const risk = biggestRiskLabel(players);
  const opportunity = biggestOpportunityLabel(players);

  const year = new Date().getFullYear();
  const window = `${year}–${year + 2}`;

  const statusKey = isLeague
    ? currentLeague!.status
    : leagues.length > 0
      ? [...leagues].sort((a, b) => {
          const order = ['CHAMPIONSHIP', 'CONTENDER', 'TRANSITION', 'REBUILD', 'ORPHAN'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        })[0]!.status
      : 'ORPHAN';
  const isRebuild = statusKey === 'REBUILD' || statusKey === 'ORPHAN';
  const isWinNow = statusKey === 'CHAMPIONSHIP' || statusKey === 'CONTENDER';

  let playoffOdds: string | null = null;
  const withRecord = isLeague
    ? currentLeague!.winRate > 0
      ? [currentLeague!]
      : []
    : leagues.filter((l) => l.winRate > 0);
  if (withRecord.length > 0 && !isRebuild) {
    const avgWin = withRecord.reduce((s, l) => s + l.winRate, 0) / withRecord.length;
    let pct = Math.round(avgWin * 100 + (isWinNow ? 12 : 6));
    pct = Math.min(isWinNow ? 85 : 65, Math.max(8, pct));
    playoffOdds = `${pct}%`;
  } else if (withRecord.length > 0 && isRebuild) {
    const avgWin = withRecord.reduce((s, l) => s + l.winRate, 0) / withRecord.length;
    const pct = Math.min(45, Math.max(5, Math.round(avgWin * 60)));
    playoffOdds = `${pct}%`;
  }

  const useChampionshipLabel = isWinNow && withRecord.length > 0;
  const strengthLabel = useChampionshipLabel ? 'Championship Odds' : 'Portfolio Strength';
  const strengthNumeric = useChampionshipLabel && playoffOdds
    ? parseInt(playoffOdds, 10)
    : empireRating;
  const strengthValue = useChampionshipLabel && playoffOdds ? playoffOdds : empireRating.toFixed(1);

  return {
    portfolioStatus: isLeague ? LEAGUE_STATUS[currentLeague!.status].label.toUpperCase() : statusMeta.label,
    portfolioStatusColor: statusMeta.color,
    strengthLabel,
    strengthValue,
    strengthNumeric,
    window,
    playoffOdds,
    biggestRisk: risk,
    biggestOpportunity: opportunity,
    recommendedFocus: breakdown.actionSummary || recommendedFocus(risk, opportunity, statusMeta.label),
    isLeagueContext: isLeague,
  };
}
