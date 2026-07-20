import type { TradeOpportunity } from '@/lib/trade/types';

const STORAGE_KEY = 'bob_command_queue';

export interface StagedTradeItem {
  id: string;
  playerId: string;
  playerName: string;
  leagueId: string;
  leagueName: string;
  managerName: string;
  giveSummary: string;
  getSummary: string;
  acceptanceProbability: number;
  championshipImpact: number;
  mutualBenefitScore: number;
  stagedAt: string;
}

function readRaw(): StagedTradeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StagedTradeItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: StagedTradeItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
  window.dispatchEvent(new CustomEvent('bob:command-queue-updated'));
}

export function readStagedTrades(): StagedTradeItem[] {
  return readRaw();
}

export function pushStagedTrade(opp: TradeOpportunity): StagedTradeItem {
  // givePlayerName already IS the full package for buys; suggestedPrice is the
  // same string — don't concatenate them or the price double-counts.
  const giveParts = [opp.givePlayerName, opp.suggestedAddOn].filter(Boolean);
  const item: StagedTradeItem = {
    id: `staged-${opp.id}-${Date.now()}`,
    playerId: opp.playerId,
    playerName: opp.playerName,
    leagueId: opp.leagueId,
    leagueName: opp.leagueName,
    managerName: opp.managerName,
    giveSummary: giveParts.join(' + ') || 'Package TBD',
    getSummary: opp.getPlayerName,
    acceptanceProbability: opp.acceptanceProbability,
    championshipImpact: opp.championshipImpact,
    mutualBenefitScore: opp.mutualBenefitScore,
    stagedAt: new Date().toISOString(),
  };

  const existing = readRaw().filter((x) => x.playerId !== opp.playerId || x.leagueId !== opp.leagueId);
  write([item, ...existing]);
  return item;
}

export function clearStagedTrade(id: string): void {
  write(readRaw().filter((x) => x.id !== id));
}

export function stagedTradeMissionCards(limit = 3): import('@/lib/dashboard/missionTasks').MissionCardModel[] {
  return readStagedTrades().slice(0, limit).map((s, i) => ({
    id: s.id,
    priority: i + 1,
    urgency: s.acceptanceProbability >= 70 ? 'HIGH' : 'MED',
    glow: 'buy' as const,
    title: `Staged Offer: ${s.getSummary}`,
    leagueName: s.leagueName,
    targetManager: s.managerName,
    playerId: s.playerId,
    playerName: s.playerName,
    reasonLine: `${s.giveSummary} → ${s.getSummary}`,
    bullets: [
      `${s.acceptanceProbability}% acceptance · +${s.championshipImpact.toFixed(1)}% championship impact`,
    ],
    metrics: [
      { label: 'Accept', value: `${s.acceptanceProbability}%` },
      { label: 'Fairness', value: `${s.mutualBenefitScore}/100` },
      { label: 'Impact', value: `+${s.championshipImpact.toFixed(1)}%` },
    ],
    ctaLabel: 'Review Offer',
    ctaHref: `/trade?target=${encodeURIComponent(s.playerId)}&league=${encodeURIComponent(s.leagueId)}`,
  }));
}
