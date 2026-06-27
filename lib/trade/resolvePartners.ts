import type { ManagerProfileData } from '@/lib/managers/analyzer';
import type { ManagerTradeCard, TradeOpportunity } from '@/lib/trade/types';
import { managerBestAsset, managerTendencies, recommendedOpeningOffer } from '@/lib/trade/tradeHubUi';

export interface ResolvedPartnerCard {
  manager: ManagerTradeCard;
  behaviorSignal: string;
  bestApproach: string;
  isSkeleton: boolean;
}

function emptyProfile(overrides: Partial<ManagerProfileData> = {}): ManagerProfileData {
  return {
    archetype: 'balanced',
    archetype_label: 'Balanced Manager',
    archetype_desc: 'Trade patterns still syncing.',
    pitch_angle: 'Lead with a fair, value-based offer.',
    trade_count: 0,
    trade_frequency: 'moderate',
    buys_position: {},
    sells_position: {},
    adds_picks: 0,
    sells_picks: 0,
    avg_buy_age: null,
    avg_sell_age: null,
    prefers_youth: false,
    needs: [],
    surplus: [],
    position_scores: {},
    top_assets: [],
    ...overrides,
  };
}

function syntheticFromOpportunity(
  opp: TradeOpportunity,
  allForManager: TradeOpportunity[],
): ManagerTradeCard {
  const accept = Math.round(
    allForManager.reduce((s, o) => s + o.acceptanceProbability, 0) / allForManager.length,
  );
  const positions = Array.from(new Set(allForManager.map((o) => o.position)));
  const bestOpp = [...allForManager].sort((a, b) => b.opportunityScore - a.opportunityScore)[0]!;
  const assetName = bestOpp.getPlayerName === bestOpp.playerName
    ? bestOpp.playerName
    : bestOpp.givePlayerName || bestOpp.playerName;

  const needs = positions.length > 0 ? [positions[0]!] : ['Depth'];

  return {
    sleeperRosterId: 0,
    leagueId: opp.leagueId,
    leagueName: opp.leagueName,
    displayName: opp.managerName,
    avatar: null,
    tradeLikelihood: accept,
    confidenceLabel: accept >= 70 ? 'High' : accept >= 50 ? 'Medium' : 'Low',
    profile: emptyProfile({
      archetype_label: allForManager.length >= 2 ? 'Active Trader' : 'Balanced Manager',
      needs,
      surplus: positions.length > 1 ? [positions[1]!] : [],
      top_assets: [{ name: assetName, position: bestOpp.position, ktc: 0, age: null }],
      pitch_angle:
        opp.type === 'buy_low' || opp.type === 'buy_window'
          ? 'Lead with picks and youth — they respond to future value.'
          : 'Package win-now pieces with a clear roster fit.',
      trade_frequency: allForManager.length >= 3 ? 'active' : 'moderate',
    }),
    youthPreference: opp.type === 'buy_low' ? 65 : 40,
    pickHoarderScore: opp.suggestedPrice?.includes('1st') ? 60 : 35,
    responseSpeed: accept >= 70 ? '24–48h' : '48–72h',
    negotiationStyle: accept >= 65 ? 'Responds to fair value' : 'Selective trader',
    overpayTendency: opp.type === 'buy_window' ? 'May overpay for win-now' : 'Market-rate deals',
  };
}

function skeletonManager(index: number): ManagerTradeCard {
  return {
    sleeperRosterId: -index - 1,
    leagueId: '',
    leagueName: 'Syncing…',
    displayName: `Manager ${index + 1}`,
    avatar: null,
    tradeLikelihood: 0,
    confidenceLabel: '—',
    profile: emptyProfile({ archetype_label: 'Building profile' }),
    youthPreference: 0,
    pickHoarderScore: 0,
    negotiationStyle: '—',
    overpayTendency: '—',
  };
}

function partnerKey(m: { leagueId: string; displayName: string }): string {
  return `${m.leagueId}:${m.displayName}`;
}

export function resolveTradePartners(
  managers: ManagerTradeCard[],
  opportunities: TradeOpportunity[],
  min = 3,
): ResolvedPartnerCard[] {
  const result: ResolvedPartnerCard[] = [];
  const usedKeys = new Set<string>();

  for (const m of [...managers].sort((a, b) => b.tradeLikelihood - a.tradeLikelihood)) {
    const key = partnerKey(m);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    const tendencies = managerTendencies(m);
    result.push({
      manager: m,
      behaviorSignal: tendencies[0] ?? 'Engages when roster fit is clear',
      bestApproach: m.profile.pitch_angle?.split('.')[0]?.trim() ?? recommendedOpeningOffer(m),
      isSkeleton: false,
    });
    if (result.length >= 5) break;
  }

  if (result.length < min) {
    const byManager = new Map<string, TradeOpportunity[]>();
    for (const o of opportunities) {
      const key = partnerKey({ leagueId: o.leagueId, displayName: o.managerName });
      if (!byManager.has(key)) byManager.set(key, []);
      byManager.get(key)!.push(o);
    }

    const sortedGroups = Array.from(byManager.entries()).sort((a, b) => {
      const avgA = a[1].reduce((s: number, x: TradeOpportunity) => s + x.acceptanceProbability, 0) / a[1].length;
      const avgB = b[1].reduce((s: number, x: TradeOpportunity) => s + x.acceptanceProbability, 0) / b[1].length;
      return avgB - avgA;
    });

    for (const [key, opps] of sortedGroups) {
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const top = [...opps].sort((a, b) => b.acceptanceProbability - a.acceptanceProbability)[0]!;
      const m = syntheticFromOpportunity(top, opps);
      result.push({
        manager: m,
        behaviorSignal: top.reasonChips[0] ?? top.whyReasons[0] ?? 'Open to fair packages',
        bestApproach:
          top.type === 'buy_low' || top.type === 'buy_window'
            ? 'Lead with picks'
            : 'Lead with win-now surplus',
        isSkeleton: false,
      });
      if (result.length >= 5) break;
    }
  }

  let skeletonIdx = 0;
  while (result.length < min) {
    result.push({
      manager: skeletonManager(skeletonIdx),
      behaviorSignal: 'Building manager profile',
      bestApproach: 'Sync completes behavior analysis',
      isSkeleton: true,
    });
    skeletonIdx += 1;
  }

  return result.slice(0, 5);
}

export function findManagerForOpportunity(
  opp: TradeOpportunity,
  managers: ManagerTradeCard[],
  opportunities: TradeOpportunity[],
): ManagerTradeCard | null {
  const direct = managers.find(
    (m) => m.leagueId === opp.leagueId && m.displayName === opp.managerName,
  );
  if (direct) return direct;

  const resolved = resolveTradePartners(managers, opportunities, 1);
  return (
    resolved.find(
      (r) =>
        !r.isSkeleton &&
        r.manager.leagueId === opp.leagueId &&
        r.manager.displayName === opp.managerName,
    )?.manager ?? null
  );
}

export { managerBestAsset, recommendedOpeningOffer };
