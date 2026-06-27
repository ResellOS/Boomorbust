import type { DailyTask } from './dailyTasks';
import { isTradeTaskData } from './dailyTasks';
import { buildMissionCards, type MissionCardModel } from './missionTasks';
import { tradeDetailHref, tradeStageHref } from './dashboardRoutes';
import type { LineupOpportunity, TradeTargetItem } from './rotation';

export interface HeroTarget {
  id: string;
  title: string;
  leagueName: string;
  playerId?: string;
  playerName?: string;
  position?: string;
  team?: string;
  why: string;
  portfolioImpact: string;
  acceptanceChance: string;
  tradeWindow: string;
  confidence: string;
  offerLabel: string;
  suggestedOffer: string;
  ctaHref: string;
  stageHref: string;
  detailHref: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  isSell: boolean;
}

function confidenceLabel(task: DailyTask | null, urgency: 'HIGH' | 'MED' | 'LOW'): string {
  if (task && task.confidenceScore >= 70) return 'Strong';
  if (task && task.confidenceScore >= 45) return 'Medium';
  if (task && task.confidenceScore > 0) return 'Low';
  if (urgency === 'HIGH') return 'Strong';
  if (urgency === 'MED') return 'Medium';
  return 'Low';
}

function formatPortfolioImpact(task: DailyTask | null, card: MissionCardModel): string {
  if (task?.impactScore && task.impactScore > 0) return `+${task.impactScore.toFixed(1)}`;
  const valueMetric = card.metrics.find((m) => m.label.includes('Value') || m.label.includes('Gain'));
  if (valueMetric && valueMetric.value !== '—') return valueMetric.value;
  if (card.urgency === 'HIGH') return 'Impact: High';
  if (card.urgency === 'MED') return 'Impact: Medium';
  return 'Impact: Low';
}

function missionToHero(card: MissionCardModel, task: DailyTask | null): HeroTarget {
  const acceptMetric = card.metrics.find((m) => m.label.includes('Acceptance'));
  const urgency = card.urgency;
  const isSell = card.glow === 'sell';

  let suggestedOffer = '—';
  const offerLabel = isSell ? 'Suggested Return' : 'Suggested Offer';
  if (task && isTradeTaskData(task.taskData)) {
    suggestedOffer = task.taskData.give_player_name;
  } else if (isSell) {
    suggestedOffer = card.metrics.find((m) => m.label.includes('Return'))?.value ?? '—';
  }

  const actionVerb =
    isSell && card.playerName
      ? `SELL ${card.playerName.toUpperCase()}`
      : card.glow === 'lineup'
        ? card.title.toUpperCase()
        : card.title.replace(/^Send Offer for /i, 'ACQUIRE ').toUpperCase();

  const leagueId =
    task && isTradeTaskData(task.taskData) ? task.taskData.league_id : undefined;
  const stageHref = card.playerId
    ? tradeStageHref(card.playerId, leagueId)
    : card.ctaHref;
  const detailHref = card.playerId && (card.glow === 'buy' || card.glow === 'sell')
    ? tradeDetailHref(card.playerId, leagueId)
    : card.ctaHref;

  return {
    id: card.id,
    title: actionVerb,
    leagueName: card.leagueName,
    playerId: card.playerId,
    playerName: card.playerName,
    position: card.position,
    team: card.team,
    why: card.reasonLine,
    portfolioImpact: formatPortfolioImpact(task, card),
    acceptanceChance: acceptMetric?.value ?? '—',
    tradeWindow: card.glow === 'lineup' ? 'This Week' : 'Open',
    confidence: confidenceLabel(task, urgency),
    offerLabel,
    suggestedOffer,
    ctaHref: stageHref,
    stageHref,
    detailHref,
    impactLevel: urgency === 'HIGH' ? 'HIGH' : urgency === 'MED' ? 'MEDIUM' : 'LOW',
    isSell,
  };
}

function tradeTargetToHero(t: TradeTargetItem, idx: number): HeroTarget {
  return {
    id: `target-${t.playerId}-${idx}`,
    title: `ACQUIRE ${t.playerName.toUpperCase()}`,
    leagueName: t.leagueName,
    playerId: t.playerId,
    playerName: t.playerName,
    position: t.position,
    team: t.team,
    why: t.reason || `Trade target surfaced in ${t.leagueName}.`,
    portfolioImpact: 'Impact: Medium',
    acceptanceChance: '—',
    tradeWindow: 'Open',
    confidence: 'Medium',
    offerLabel: 'Suggested Offer',
    suggestedOffer: t.acquireCost || '—',
    ctaHref: tradeStageHref(t.playerId),
    stageHref: tradeStageHref(t.playerId),
    detailHref: tradeDetailHref(t.playerId),
    impactLevel: idx === 0 ? 'HIGH' : 'MEDIUM',
    isSell: false,
  };
}

function lineupToHero(o: LineupOpportunity): HeroTarget {
  return {
    id: `lineup-hero-${o.benchPlayerId}`,
    title: `START ${o.benchName.toUpperCase()}`,
    leagueName: o.leagueName,
    playerId: o.benchPlayerId,
    playerName: o.benchName,
    position: o.position,
    why: `Projected +${o.gap.toFixed(1)} pts over ${o.starterName} at ${o.position}.`,
    portfolioImpact: `+${o.gap.toFixed(1)} pts`,
    acceptanceChance: '—',
    tradeWindow: 'This Week',
    confidence: o.gap >= 5 ? 'Strong' : 'Medium',
    offerLabel: 'Lineup Move',
    suggestedOffer: `Bench ${o.starterName}`,
    ctaHref: '/startsit',
    stageHref: '/startsit',
    detailHref: '/startsit',
    impactLevel: o.gap >= 5 ? 'HIGH' : 'MEDIUM',
    isSell: false,
  };
}

export function buildHeroTargets(
  tasks: DailyTask[],
  tradeTargets: TradeTargetItem[],
  lineupOpportunity: LineupOpportunity | null,
): HeroTarget[] {
  const sortedTasks = [...tasks].sort((a, b) => b.taskScore - a.taskScore);
  const missions = buildMissionCards(tasks, null, 5);
  const taskById = new Map(sortedTasks.map((t) => [t.id, t]));

  const heroes: HeroTarget[] = [];

  for (const card of missions) {
    if (card.glow === 'lineup') continue;
    const task = card.taskId ? taskById.get(card.taskId) ?? null : null;
    heroes.push(missionToHero(card, task));
  }

  for (const [i, t] of Array.from(tradeTargets.slice(0, 3).entries())) {
    if (heroes.some((h) => h.playerId === t.playerId)) continue;
    heroes.push(tradeTargetToHero(t, i));
  }

  if (lineupOpportunity && !heroes.some((h) => h.playerId === lineupOpportunity.benchPlayerId)) {
    heroes.push(lineupToHero(lineupOpportunity));
  }

  return heroes.slice(0, 5);
}

export function impactBadgeStyle(level: HeroTarget['impactLevel']): { bg: string; text: string; label: string } {
  if (level === 'HIGH') return { bg: 'rgba(167,139,250,0.2)', text: '#A78BFA', label: 'HIGH IMPACT' };
  if (level === 'MEDIUM') return { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24', label: 'MEDIUM IMPACT' };
  return { bg: 'rgba(100,116,139,0.18)', text: '#64748B', label: 'LOW IMPACT' };
}
