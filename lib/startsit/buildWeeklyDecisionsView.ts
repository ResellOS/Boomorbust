import type {
  HighConfidenceAlerts,
  LeagueMatchupView,
  LineupDecision,
  LineupSlotView,
  PortfolioMatchupSummary,
  StartSitRecommendation,
  WeeklyCompletion,
  WeeklyDecisionCard,
  WeeklyDecisionKind,
} from './types';
import { estimateProjection } from './utils';

function impactFromConfidence(conf: number): 'High' | 'Medium' | 'Low' {
  if (conf >= 71) return 'High';
  if (conf >= 62) return 'Medium';
  return 'Low';
}

function lineupDecisionToCard(d: LineupDecision, isPreview: boolean): WeeklyDecisionCard {
  const kind: WeeklyDecisionKind = d.variant === 'start' ? 'START' : 'BENCH';
  const focus = kind === 'START' ? d.startPlayer : d.sitPlayer;
  return {
    id: d.id,
    kind,
    playerId: focus.playerId,
    playerName: focus.fullName,
    position: focus.position,
    team: focus.team,
    opponent: focus.opponent,
    leagueId: d.leagueId,
    leagueName: d.leagueName,
    projectedPoints: focus.projectedPoints,
    impact: impactFromConfidence(d.confidence),
    confidence: d.confidence,
    whyBullets: d.whyBullets,
    whyOneLine: d.whyOneLine,
    isPreview,
    relatedPlayerId: kind === 'START' ? d.sitPlayer.playerId : d.startPlayer.playerId,
    relatedPlayerName: kind === 'START' ? d.sitPlayer.fullName : d.startPlayer.fullName,
  };
}

export function buildDecisionQueue(
  decisions: LineupDecision[],
  alerts: HighConfidenceAlerts,
  weatherImpact: string,
  isPreview: boolean,
): WeeklyDecisionCard[] {
  const cards = decisions.map((d) => lineupDecisionToCard(d, isPreview));

  if (alerts.sleeperPick && !cards.some((c) => c.playerId === alerts.sleeperPick!.playerId)) {
    const r = alerts.sleeperPick;
    cards.push({
      id: `add-${r.playerId}`,
      kind: 'ADD',
      playerId: r.playerId,
      playerName: r.fullName,
      position: r.position,
      team: r.team,
      opponent: r.opponent,
      leagueId: r.leagueIds[0] ?? '',
      leagueName: r.leagueIds.length > 1 ? `${r.leagueIds.length} leagues` : 'Waiver Wire',
      projectedPoints: r.projectedPoints,
      impact: impactFromConfidence(r.confidence),
      confidence: r.confidence,
      whyBullets: r.whyBullets,
      whyOneLine: r.reasoning || `Add ${r.fullName} — breakout ceiling`,
      isPreview,
    });
  }

  if (weatherImpact && weatherImpact !== 'Low') {
    cards.push({
      id: 'weather-alert',
      kind: 'WEATHER',
      playerId: '',
      playerName: 'Weather Alert',
      position: '—',
      team: '—',
      opponent: weatherImpact,
      leagueId: '',
      leagueName: 'Portfolio',
      projectedPoints: null,
      impact: 'Low',
      confidence: 45,
      whyBullets: [`Weather impact: ${weatherImpact}`],
      whyOneLine: `Monitor ${weatherImpact} game conditions`,
      isPreview,
    });
  }

  return cards.sort((a, b) => b.confidence - a.confidence);
}

function recPts(r: StartSitRecommendation): number {
  return r.projectedPoints ?? estimateProjection(r.tfoScore, r.position);
}

function leagueProjectedLineup(
  leagueId: string,
  rosterByLeague: Record<string, string[]>,
  recById: Map<string, StartSitRecommendation>,
): number {
  const pids = rosterByLeague[leagueId] ?? [];
  let total = 0;
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const slots = pos === 'RB' || pos === 'WR' ? 2 : 1;
    const group = pids
      .map((id) => recById.get(id))
      .filter((r): r is StartSitRecommendation => !!r && r.position === pos)
      .sort((a, b) => b.startScore - a.startScore);
    for (let i = 0; i < slots && i < group.length; i++) {
      total += recPts(group[i]!);
    }
  }
  return Math.round(total * 10) / 10;
}

export function buildLeagueMatchup(
  leagueId: string,
  leagueName: string,
  week: number,
  rosterByLeague: Record<string, string[]>,
  recById: Map<string, StartSitRecommendation>,
): LeagueMatchupView {
  const yourProjected = leagueProjectedLineup(leagueId, rosterByLeague, recById);
  const breakdown = ['QB', 'RB', 'WR', 'TE'].map((slot) => {
    const pids = rosterByLeague[leagueId] ?? [];
    const group = pids
      .map((id) => recById.get(id))
      .filter((r): r is StartSitRecommendation => !!r && r.position === slot)
      .sort((a, b) => b.startScore - a.startScore);
    const you = group[0] ? recPts(group[0]) : 0;
    return { slot, you: Math.round(you * 10) / 10, opp: null };
  });

  return {
    leagueId,
    leagueName,
    week,
    yourTeamName: 'Your Team',
    opponentTeamName: null,
    yourProjected,
    opponentProjected: null,
    yourWinPct: null,
    opponentWinPct: null,
    projectedMargin: null,
    impliedTotal: yourProjected > 0 ? Math.round(yourProjected * 0.42 * 10) / 10 : null,
    positionBreakdown: breakdown,
    syncing: true,
  };
}

export function buildPortfolioSummary(
  rosterByLeague: Record<string, string[]>,
  lineupOptimizer: import('./types').LineupOptimizer,
  decisions: LineupDecision[],
  recById: Map<string, StartSitRecommendation>,
  leagueCount: number,
): PortfolioMatchupSummary {
  const leagueIds = Object.keys(rosterByLeague);
  let totalPts = 0;
  for (const lid of leagueIds) {
    totalPts += leagueProjectedLineup(lid, rosterByLeague, recById);
  }

  const sortedChanges = [...lineupOptimizer.leagueChanges].sort(
    (a, b) => b.potentialGain - a.potentialGain,
  );
  const closest = sortedChanges[sortedChanges.length - 1];
  const biggest = sortedChanges[0];

  return {
    totalProjectedPoints: Math.round(totalPts * 10) / 10,
    projectedWins: null,
    projectedLosses: null,
    closestMatchup: closest?.leagueName ?? null,
    biggestEdge: biggest ? `${biggest.leagueName} (+${biggest.potentialGain.toFixed(1)} pts)` : null,
    highestRiskMatchup: decisions.find((d) => d.confidence < 62)?.leagueName ?? null,
    leagueCount: Math.max(leagueCount, leagueIds.length),
  };
}

export function buildLineupSlots(
  leagueId: string,
  rosterByLeague: Record<string, string[]>,
  recById: Map<string, StartSitRecommendation>,
  decisions: LineupDecision[],
): { starters: LineupSlotView[]; bench: LineupSlotView[] } {
  const pids = rosterByLeague[leagueId] ?? [];
  const recs = pids
    .map((id) => recById.get(id))
    .filter((r): r is StartSitRecommendation => !!r && r.tfoScore > 0);

  const used = new Set<string>();
  const starters: LineupSlotView[] = [];

  const pickBest = (pos: string, flex = false) => {
    const pool = recs
      .filter((r) => !used.has(r.playerId))
      .filter((r) => (flex ? ['RB', 'WR', 'TE'].includes(r.position) : r.position === pos))
      .sort((a, b) => b.startScore - a.startScore);
    const r = pool[0];
    if (!r) {
      return {
        slot: flex ? 'FLEX' : pos,
        playerId: null,
        playerName: 'Empty',
        position: flex ? 'FLEX' : pos,
        team: '—',
        opponent: '—',
        projectedPoints: null,
        confidence: 0,
        recommendation: 'neutral' as const,
      };
    }
    used.add(r.playerId);
    const dec = decisions.find(
      (d) => d.leagueId === leagueId && (d.startPlayer.playerId === r.playerId || d.sitPlayer.playerId === r.playerId),
    );
    return {
      slot: flex ? 'FLEX' : pos,
      playerId: r.playerId,
      playerName: r.fullName,
      position: r.position,
      team: r.team,
      opponent: r.opponent,
      projectedPoints: r.projectedPoints,
      confidence: r.confidence,
      recommendation: (dec?.variant === 'sit' && dec.sitPlayer.playerId === r.playerId
        ? 'sit'
        : 'start') as LineupSlotView['recommendation'],
    };
  };

  starters.push(pickBest('QB'));
  starters.push(pickBest('RB'));
  starters.push(pickBest('RB'));
  starters.push(pickBest('WR'));
  starters.push(pickBest('WR'));
  starters.push(pickBest('TE'));
  starters.push(pickBest('', true));
  starters.push({
    slot: 'DST',
    playerId: null,
    playerName: 'DST',
    position: 'DST',
    team: '—',
    opponent: '—',
    projectedPoints: null,
    confidence: 0,
    recommendation: 'neutral',
  });
  starters.push({
    slot: 'K',
    playerId: null,
    playerName: 'K',
    position: 'K',
    team: '—',
    opponent: '—',
    projectedPoints: null,
    confidence: 0,
    recommendation: 'neutral',
  });

  const bench = recs
    .filter((r) => !used.has(r.playerId))
    .sort((a, b) => b.startScore - a.startScore)
    .slice(0, 6)
    .map((r) => ({
      slot: 'BN',
      playerId: r.playerId,
      playerName: r.fullName,
      position: r.position,
      team: r.team,
      opponent: r.opponent,
      projectedPoints: r.projectedPoints,
      confidence: r.confidence,
      recommendation: r.startScore >= 50 ? ('flex' as const) : ('sit' as const),
    }));

  return { starters, bench };
}

export function buildWeeklyCompletion(
  leagueCount: number,
  decisions: WeeklyDecisionCard[],
  approvedIds: Set<string>,
  ignoredIds: Set<string>,
): WeeklyCompletion {
  const active = decisions.filter((d) => !ignoredIds.has(d.id));
  const complete = active.filter((d) => approvedIds.has(d.id)).length;
  const leaguesWithDecisions = new Set(active.map((d) => d.leagueId).filter(Boolean));
  const leaguesResolved = new Set(
    active.filter((d) => approvedIds.has(d.id)).map((d) => d.leagueId).filter(Boolean),
  );

  const decisionsTotal = active.length;
  const decisionsComplete = complete;
  const leaguesTotal = Math.max(leagueCount, leaguesWithDecisions.size);
  const leaguesComplete = leaguesResolved.size;

  const pct =
    decisionsTotal > 0
      ? Math.round((decisionsComplete / decisionsTotal) * 100)
      : leaguesTotal > 0
        ? Math.round((leaguesComplete / leaguesTotal) * 100)
        : 0;

  return { pct, leaguesComplete, leaguesTotal, decisionsComplete, decisionsTotal };
}

export function recMapFromList(recs: StartSitRecommendation[]): Map<string, StartSitRecommendation> {
  return new Map(recs.map((r) => [r.playerId, r]));
}

export function filterByLeague<T extends { leagueId: string }>(
  items: T[],
  leagueId: string,
): T[] {
  if (leagueId === 'all') return items;
  return items.filter((i) => i.leagueId === leagueId || i.leagueId === '');
}

export function boomCandidates(recs: StartSitRecommendation[], limit = 3): StartSitRecommendation[] {
  return [...recs]
    .filter((r) => r.startScore >= 65)
    .sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0))
    .slice(0, limit);
}

export function bustRisks(recs: StartSitRecommendation[], limit = 3): StartSitRecommendation[] {
  return [...recs]
    .filter((r) => r.startScore < 50 || r.obviousCall)
    .sort((a, b) => a.startScore - b.startScore)
    .slice(0, limit);
}

export function benchRegretRisks(
  decisions: LineupDecision[],
): { playerName: string; regretPct: number; threatens: string }[] {
  return decisions
    .filter((d) => d.edgePts > 0 && d.edgePts < 4)
    .slice(0, 3)
    .map((d) => ({
      playerName: d.sitPlayer.fullName,
      regretPct: Math.min(35, Math.round(12 + d.edgePts * 4)),
      threatens: d.startPlayer.fullName,
    }));
}

/** Placeholder cards when no real decisions exist (preseason). */
export function buildPreviewDecisionCards(
  leagues: { id: string; name: string }[],
): WeeklyDecisionCard[] {
  const league = leagues[0];
  return [
    {
      id: 'preview-start',
      kind: 'START',
      playerId: '',
      playerName: 'Sample Starter',
      position: 'WR',
      team: '—',
      opponent: 'Preview',
      leagueId: league?.id ?? '',
      leagueName: league?.name ?? 'Preview League',
      projectedPoints: null,
      impact: 'High',
      confidence: 0,
      whyBullets: ['Weekly decisions activate Week 1'],
      whyOneLine: 'Preview — lineup calls appear when season starts',
      isPreview: true,
    },
    {
      id: 'preview-bench',
      kind: 'BENCH',
      playerId: '',
      playerName: 'Sample Bench',
      position: 'WR',
      team: '—',
      opponent: 'Preview',
      leagueId: league?.id ?? '',
      leagueName: league?.name ?? 'Preview League',
      projectedPoints: null,
      impact: 'Medium',
      confidence: 0,
      whyBullets: ['Projections sync before kickoff'],
      whyOneLine: 'Preview — bench recommendations populate with live data',
      isPreview: true,
    },
  ];
}
