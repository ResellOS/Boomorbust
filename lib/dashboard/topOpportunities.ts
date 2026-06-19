import { isReviewTaskData, isTradeTaskData, type DailyTask } from './dailyTasks';
import type { TradeTargetItem } from './rotation';

export interface TopOpportunityRow {
  id: string;
  label: string;
  impact: string;
  playerId?: string;
}

function impactLabel(score: number): string {
  if (score <= 0) return '—';
  return `+${score.toFixed(1)}%`;
}

export function computeTopOpportunities(
  tasks: DailyTask[],
  tradeTargets: TradeTargetItem[],
): TopOpportunityRow[] {
  const rows: TopOpportunityRow[] = [];

  for (const task of [...tasks].sort((a, b) => b.impactScore - a.impactScore)) {
    if (rows.length >= 3) break;
    if (task.impactScore <= 0 && task.taskScore <= 0) continue;

    const impact = task.impactScore > 0 ? task.impactScore : task.taskScore * 0.1;
    if (isTradeTaskData(task.taskData)) {
      rows.push({
        id: task.id,
        label: task.taskData.get_player_name,
        impact: impactLabel(impact),
        playerId: task.taskData.get_player_id,
      });
    } else if (isReviewTaskData(task.taskData)) {
      rows.push({
        id: task.id,
        label: task.taskData.player_name,
        impact: impactLabel(impact),
        playerId: task.taskData.player_id,
      });
    }
  }

  for (const t of tradeTargets) {
    if (rows.length >= 3) break;
    if (rows.some((r) => r.playerId === t.playerId)) continue;
    rows.push({
      id: `target-${t.playerId}`,
      label: t.playerName,
      impact: t.tfoScore > 0 ? `BOB ${t.tfoScore.toFixed(0)}` : '—',
      playerId: t.playerId,
    });
  }

  return rows.slice(0, 3);
}
