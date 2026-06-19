import type { LineupOpportunity } from './rotation';
import {
  isReviewTaskData,
  isTradeTaskData,
  urgencyFromScore,
  type DailyTask,
  type UrgencyLevel,
} from './dailyTasks';

export type MissionGlow = 'sell' | 'buy' | 'lineup';

export interface MissionMetric {
  label: string;
  value: string;
}

export interface MissionCardModel {
  id: string;
  taskId?: string;
  priority: number;
  urgency: UrgencyLevel;
  glow: MissionGlow;
  title: string;
  leagueName: string;
  targetManager?: string;
  playerId?: string;
  playerName?: string;
  position?: string;
  team?: string;
  marketRank?: number | null;
  bobRank?: number | null;
  rankDelta?: number | null;
  reasonLine: string;
  bullets: string[];
  metrics: MissionMetric[];
  ctaLabel: string;
  ctaHref: string;
}

function reasonBullets(reason: string): string[] {
  const parts = reason
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2);
  if (parts.length === 1) return [parts[0]!];
  return [];
}

function formatValueGain(task: DailyTask): string {
  if (task.impactScore > 0) return `+${task.impactScore.toFixed(1)}%`;
  const d = task.taskData;
  if (isTradeTaskData(d) && d.tfo_delta != null && Number.isFinite(d.tfo_delta)) {
    const sign = d.tfo_delta >= 0 ? '+' : '';
    return `${sign}${d.tfo_delta.toFixed(1)} TFO`;
  }
  return '—';
}

function suggestedReturn(rankDelta: number | null | undefined): string {
  const gap = rankDelta != null ? Math.abs(Math.round(rankDelta)) : 0;
  if (gap >= 200) return 'Future 2nd+';
  if (gap >= 100) return '2027 2nd';
  if (gap >= 50) return '2027 3rd';
  return '—';
}

function tradeMission(task: DailyTask, priority: number): MissionCardModel | null {
  if (!isTradeTaskData(task.taskData)) return null;
  const d = task.taskData;
  const accept = Math.round(d.acceptance_probability);
  const bullets = reasonBullets(d.reason);
  if (bullets.length === 0) {
    bullets.push(`Offer ${d.give_player_name} to acquire ${d.get_player_name}.`);
  }

  return {
    id: task.id,
    taskId: task.id,
    priority,
    urgency: urgencyFromScore(task.urgencyScore),
    glow: 'buy',
    title: `Send Offer for ${d.get_player_name}`,
    leagueName: d.league_name,
    targetManager: d.target_manager_name,
    playerId: d.get_player_id,
    playerName: d.get_player_name,
    reasonLine: bullets[0] ?? `Target ${d.get_player_name} in ${d.league_name}.`,
    bullets,
    metrics: [
      { label: 'Acceptance Odds', value: accept > 0 ? `${accept}%` : '—' },
      { label: 'Value Gain', value: formatValueGain(task) },
      { label: 'Champ Impact', value: task.impactScore > 0 ? `+${task.impactScore.toFixed(1)}%` : '—' },
    ].slice(0, 3),
    ctaLabel: 'View Trade Details',
    ctaHref: d.get_player_id ? `/trade?target=${d.get_player_id}` : '/trade',
  };
}

function reviewMission(task: DailyTask, priority: number): MissionCardModel | null {
  if (!isReviewTaskData(task.taskData)) return null;
  const d = task.taskData;
  const verdict = (d.verdict ?? '').toUpperCase();
  const isSell = verdict === 'BUST' || verdict === 'SELL';
  const gap = d.rank_delta != null ? Math.abs(Math.round(d.rank_delta)) : null;
  const bullets = reasonBullets(d.reason);
  if (bullets.length === 0 && gap != null) {
    bullets.push(`BOB rates him ${gap} spots below market.`);
  }

  const delta = d.rank_delta != null ? Math.round(d.rank_delta) : null;

  return {
    id: task.id,
    taskId: task.id,
    priority,
    urgency: urgencyFromScore(task.urgencyScore),
    glow: isSell ? 'sell' : 'buy',
    title: isSell ? `Sell ${d.player_name}` : `Review ${d.player_name}`,
    leagueName: d.league_name,
    playerId: d.player_id,
    playerName: d.player_name,
    position: d.position,
    rankDelta: delta,
    reasonLine: bullets[0] ?? (gap != null ? `BOB rates him ${gap} spots below market.` : 'Review market mispricing.'),
    bullets,
    metrics: [
      { label: 'Suggested Return', value: suggestedReturn(d.rank_delta) },
      { label: 'Rank Delta', value: delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '—' },
      { label: 'Value Gain', value: formatValueGain(task) },
    ],
    ctaLabel: isSell ? 'Send Offer' : 'View Trade',
    ctaHref: d.player_id ? `/trade?target=${d.player_id}` : '/trade',
  };
}

function lineupMission(o: LineupOpportunity, priority: number): MissionCardModel {
  return {
    id: `lineup-${o.benchPlayerId}`,
    priority,
    urgency: o.gap >= 5 ? 'HIGH' : 'MED',
    glow: 'lineup',
    title: `Start ${o.benchName}`,
    leagueName: o.leagueName,
    playerId: o.benchPlayerId,
    playerName: o.benchName,
    position: o.position,
    reasonLine: `Projected +${o.gap.toFixed(1)} pts over ${o.starterName} at ${o.position}.`,
    bullets: [
      `Projected +${o.gap.toFixed(1)} pts over ${o.starterName} at ${o.position}.`,
      'Lineup edge available this week.',
    ],
    metrics: [
      { label: 'Proj. Advantage', value: `+${o.gap.toFixed(1)} pts` },
      { label: 'Confidence', value: o.gap >= 5 ? 'High' : 'Medium' },
      { label: 'Projection Edge', value: `+${Math.round(o.gap * 2.2)}%` },
    ],
    ctaLabel: 'View Start/Sit',
    ctaHref: '/startsit',
  };
}

export function buildMissionCards(
  tasks: DailyTask[],
  lineupOpportunity: LineupOpportunity | null,
  max = 3,
): MissionCardModel[] {
  const cards: MissionCardModel[] = [];
  const sorted = [...tasks].sort((a, b) => b.taskScore - a.taskScore);

  for (const [i, task] of Array.from(sorted.entries())) {
    if (cards.length >= max) break;
    const card =
      task.taskType === 'TRADE' ? tradeMission(task, i + 1) : reviewMission(task, i + 1);
    if (card) cards.push({ ...card, priority: cards.length + 1 });
  }

  if (cards.length < max && lineupOpportunity) {
    cards.push(lineupMission(lineupOpportunity, cards.length + 1));
  }

  return cards.slice(0, max);
}

export const MISSION_GLOW_STYLES: Record<
  MissionGlow,
  { border: string; shadow: string; cta: string; accent: string }
> = {
  sell: {
    border: 'rgba(239,68,68,0.5)',
    shadow: '0 0 24px rgba(167,139,250,0.15), 0 0 12px rgba(239,68,68,0.12)',
    cta: 'bg-[#EF4444] hover:brightness-110 text-white',
    accent: '#EF4444',
  },
  buy: {
    border: 'rgba(167,139,250,0.5)',
    shadow: '0 0 24px rgba(54,231,161,0.12), 0 0 12px rgba(167,139,250,0.15)',
    cta: 'bg-bust hover:brightness-110 text-white',
    accent: '#A78BFA',
  },
  lineup: {
    border: 'rgba(251,191,36,0.5)',
    shadow: '0 0 20px rgba(251,191,36,0.12)',
    cta: 'bg-[#FBBF24] hover:brightness-110 text-[#0a0d14]',
    accent: '#FBBF24',
  },
};
