import type { SleeperTransaction } from '@/lib/sleeper';
import type { LeagueIntelRow } from './types';

function tradeTendency(trades: number, weeks: number): string {
  const rate = weeks > 0 ? trades / weeks : 0;
  if (rate > 1.5) return 'Very Active';
  if (rate > 0.8) return 'Active';
  if (rate > 0.3) return 'Selective';
  if (rate > 0.1) return 'Passive';
  return 'Rare';
}

function aggressionLevel(tradeCount: number, adds: number): string {
  const score = tradeCount * 2 + adds;
  if (score > 25) return 'Very High';
  if (score > 12) return 'High';
  if (score > 5) return 'Medium';
  return 'Low';
}

function draftStyleFromTrades(trades: number, rookieAdds: number): string {
  if (rookieAdds > trades * 0.4) return 'Patient';
  if (trades > 15) return 'Aggressive';
  if (trades > 6) return 'Balanced';
  return 'Traditional';
}

function overpaysFor(posCounts: Record<string, number>): string {
  const sorted = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '—';
  const top = sorted[0][0];
  const second = sorted[1]?.[0];
  return second && sorted[1][1] > 0 ? `${top}s, ${second}s` : `${top}s`;
}

function liScore(
  tradeRate: number,
  aggression: string,
  tendency: string,
): number {
  let score = 50;
  if (tendency === 'Passive' || tendency === 'Rare') score += 15;
  if (tendency === 'Very Active') score -= 5;
  if (aggression === 'Low' || aggression === 'Very Low') score += 12;
  if (aggression === 'Very High') score -= 8;
  score += Math.min(10, tradeRate * 5);
  return Math.min(95, Math.max(20, Math.round(score)));
}

export function computeLeagueIntelFromTx(
  users: { user_id: string; display_name?: string }[],
  rosterOwnerMap: Map<number, string>,
  transactions: SleeperTransaction[],
  sleeperUserId: string,
  currentWeek: number,
): LeagueIntelRow[] {
  const weeks = Math.max(1, currentWeek);
  const ownerStats = new Map<
    string,
    { trades: number; adds: number; posCounts: Record<string, number> }
  >();

  for (const u of users) {
    ownerStats.set(u.user_id, { trades: 0, adds: 0, posCounts: {} });
  }

  for (const tx of transactions) {
    if (tx.type === 'trade') {
      const seen = new Set<string>();
      for (const rid of tx.roster_ids ?? []) {
        const owner = rosterOwnerMap.get(rid);
        if (owner && !seen.has(owner)) {
          seen.add(owner);
          const s = ownerStats.get(owner);
          if (s) s.trades += 1;
        }
      }
    }
  }

  return users.map((u) => {
    const stats = ownerStats.get(u.user_id) ?? { trades: 0, adds: 0, posCounts: {} };
    const handle = u.display_name
      ? `@${u.display_name.replace(/\s+/g, '')}`
      : `@Manager${u.user_id.slice(-4)}`;
    const tendency = tradeTendency(stats.trades, weeks);
    const aggression = aggressionLevel(stats.trades, stats.adds);
    return {
      managerId: u.user_id,
      handle,
      isYou: u.user_id === sleeperUserId,
      liScore: liScore(stats.trades / weeks, aggression, tendency),
      tradeTendency: tendency,
      draftStyle: draftStyleFromTrades(stats.trades, stats.adds),
      aggression,
      overpaysFor: overpaysFor(stats.posCounts),
    };
  });
}
