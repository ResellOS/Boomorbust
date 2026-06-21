import { isTradeTaskData, type DailyTask } from './dailyTasks';
import { LEAGUE_STATUS, type DashboardIncomingTrade, type LeagueBundle, type TradeTargetItem } from './rotation';

export interface LeagueIntelSpotlight {
  managerName: string;
  leagueName: string;
  archetype: string;
  signals: string[];
  tradeSuccessRate: string | null;
  bestApproach: string;
}

const ARCHETYPE_BY_STATUS: Record<string, string> = {
  CHAMPIONSHIP: 'Win-Now',
  CONTENDER: 'Contender',
  TRANSITION: 'Retooler',
  REBUILD: 'Rebuilder',
  ORPHAN: 'Inactive',
};

function signalsFromReason(reason: string): string[] {
  const parts = reason
    .split(/[,;.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 80);
  return parts.slice(0, 3);
}

function bestApproachForStatus(status: string): string {
  if (status === 'REBUILD' || status === 'ORPHAN') return 'Lead with picks';
  if (status === 'CHAMPIONSHIP' || status === 'CONTENDER') return 'Package win-now pieces';
  return 'Balance picks and proven starters';
}

export function computeLeagueIntel(
  currentLeague: LeagueBundle | null,
  leagues: LeagueBundle[],
  dailyTasks: DailyTask[],
  incomingTrades: DashboardIncomingTrade[],
  tradeTargets: TradeTargetItem[],
): LeagueIntelSpotlight | null {
  const leagueId = currentLeague?.id;

  const tradeTask = dailyTasks.find((t) => {
    if (!isTradeTaskData(t.taskData)) return false;
    if (!leagueId) return true;
    return t.taskData.league_id === leagueId || t.taskData.league_name === currentLeague?.name;
  });

  if (tradeTask && isTradeTaskData(tradeTask.taskData)) {
    const d = tradeTask.taskData;
    const league = leagues.find((l) => l.id === d.league_id || l.name === d.league_name);
    const status = league?.status ?? 'TRANSITION';
    const signals = signalsFromReason(d.reason);
    if (signals.length === 0 && d.reason) signals.push(d.reason.slice(0, 72));

    return {
      managerName: d.target_manager_name || 'League manager',
      leagueName: d.league_name,
      archetype: ARCHETYPE_BY_STATUS[status] ?? 'Manager',
      signals: signals.length > 0 ? signals : ['Trade window may be open'],
      tradeSuccessRate: null,
      bestApproach: bestApproachForStatus(status),
    };
  }

  const incoming = leagueId
    ? incomingTrades.find((t) => t.leagueId === leagueId)
    : incomingTrades[0];

  if (incoming) {
    const league = leagues.find((l) => l.id === incoming.leagueId);
    const status = league?.status ?? 'TRANSITION';
    return {
      managerName: incoming.managerName || 'League manager',
      leagueName: incoming.leagueName,
      archetype: ARCHETYPE_BY_STATUS[status] ?? 'Manager',
      signals: [`Active offer involving ${incoming.playerName}`],
      tradeSuccessRate: null,
      bestApproach: bestApproachForStatus(status),
    };
  }

  const target = leagueId
    ? tradeTargets.find((t) => t.leagueId === leagueId)
    : tradeTargets[0];

  if (target) {
    const league = leagues.find((l) => l.id === target.leagueId);
    const status = league?.status ?? 'TRANSITION';
    return {
      managerName: 'Best trade partner',
      leagueName: target.leagueName,
      archetype: ARCHETYPE_BY_STATUS[status] ?? 'Manager',
      signals: [target.reason || `Target ${target.playerName} via trade`],
      tradeSuccessRate: null,
      bestApproach: bestApproachForStatus(status),
    };
  }

  if (currentLeague) {
    const meta = LEAGUE_STATUS[currentLeague.status];
    return {
      managerName: 'League scan',
      leagueName: currentLeague.name,
      archetype: ARCHETYPE_BY_STATUS[currentLeague.status] ?? meta.label,
      signals: [currentLeague.breakdown.actionSummary || 'Sync complete — intel populates with trades'],
      tradeSuccessRate: null,
      bestApproach: bestApproachForStatus(currentLeague.status),
    };
  }

  if (leagues.length === 0) return null;

  const bestLeague = [...leagues].sort((a, b) => b.teamTfo - a.teamTfo)[0]!;
  return {
    managerName: 'Portfolio view',
    leagueName: `${leagues.length} leagues`,
    archetype: 'Multi-league',
    signals: ['Review trade targets across your portfolio'],
    tradeSuccessRate: null,
    bestApproach: 'Prioritize highest-impact league moves first',
  };
}
