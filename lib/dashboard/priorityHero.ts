import type { DailyTask } from './dailyTasks';
import { isTradeTaskData } from './dailyTasks';
import { buildMissionCards, type MissionCardModel } from './missionTasks';
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
  championshipImpact: string;
  acceptanceChance: string;
  tradeWindow: string;
  confidence: string;
  suggestedOffer: string;
  ctaHref: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

function confidenceLabel(task: DailyTask | null, urgency: 'HIGH' | 'MED' | 'LOW'): string {
  if (task && task.confidenceScore > 0) {
    if (task.confidenceScore >= 70) return 'High';
    if (task.confidenceScore >= 45) return 'Medium';
    return 'Low';
  }
  if (urgency === 'HIGH') return 'High';
  if (urgency === 'MED') return 'Medium';
  return 'Low';
}

function missionToHero(card: MissionCardModel, task: DailyTask | null): HeroTarget {
  const impactMetric = card.metrics.find((m) => m.label.includes('Champ') || m.label.includes('Impact'));
  const acceptMetric = card.metrics.find((m) => m.label.includes('Acceptance'));
  const urgency = card.urgency;

  let suggestedOffer = '—';
  if (task && isTradeTaskData(task.taskData)) {
    suggestedOffer = task.taskData.give_player_name;
  } else if (card.glow === 'sell') {
    suggestedOffer = card.metrics.find((m) => m.label.includes('Return'))?.value ?? '—';
  }

  const actionVerb =
    card.glow === 'sell' && card.playerName
      ? `Sell ${card.playerName}`
      : card.glow === 'lineup'
        ? card.title
        : card.title.replace(/^Send Offer for /, 'Acquire ');

  return {
    id: card.id,
    title: actionVerb,
    leagueName: card.leagueName,
    playerId: card.playerId,
    playerName: card.playerName,
    position: card.position,
    why: card.reasonLine,
    championshipImpact: impactMetric?.value ?? '—',
    acceptanceChance: acceptMetric?.value ?? '—',
    tradeWindow: card.glow === 'lineup' ? 'This Week' : 'Open',
    confidence: confidenceLabel(task, urgency),
    suggestedOffer,
    ctaHref: card.ctaHref,
    impactLevel: urgency === 'HIGH' ? 'HIGH' : urgency === 'MED' ? 'MEDIUM' : 'LOW',
  };
}

function tradeTargetToHero(t: TradeTargetItem, idx: number): HeroTarget {
  return {
    id: `target-${t.playerId}-${idx}`,
    title: `Acquire ${t.playerName}`,
    leagueName: t.leagueName,
    playerId: t.playerId,
    playerName: t.playerName,
    position: t.position,
    team: t.team,
    why: t.reason || `Trade target in ${t.leagueName}.`,
    championshipImpact: '—',
    acceptanceChance: '—',
    tradeWindow: 'Open',
    confidence: 'Medium',
    suggestedOffer: t.acquireCost || '—',
    ctaHref: `/trade?target=${t.playerId}`,
    impactLevel: idx === 0 ? 'HIGH' : 'MEDIUM',
  };
}

function lineupToHero(o: LineupOpportunity): HeroTarget {
  return {
    id: `lineup-hero-${o.benchPlayerId}`,
    title: `Start ${o.benchName}`,
    leagueName: o.leagueName,
    playerId: o.benchPlayerId,
    playerName: o.benchName,
    position: o.position,
    why: `Projected +${o.gap.toFixed(1)} pts over ${o.starterName} at ${o.position}.`,
    championshipImpact: '—',
    acceptanceChance: '—',
    tradeWindow: 'This Week',
    confidence: o.gap >= 5 ? 'High' : 'Medium',
    suggestedOffer: '—',
    ctaHref: '/startsit',
    impactLevel: o.gap >= 5 ? 'HIGH' : 'MEDIUM',
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

  if (heroes.length === 0 && lineupOpportunity) {
    heroes.push(lineupToHero(lineupOpportunity));
  }

  return heroes.slice(0, 5);
}

export function impactBadgeStyle(level: HeroTarget['impactLevel']): { bg: string; text: string; label: string } {
  if (level === 'HIGH') return { bg: 'rgba(167,139,250,0.2)', text: '#A78BFA', label: 'HIGH IMPACT' };
  if (level === 'MEDIUM') return { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24', label: 'MEDIUM IMPACT' };
  return { bg: 'rgba(100,116,139,0.18)', text: '#64748B', label: 'LOW IMPACT' };
}
