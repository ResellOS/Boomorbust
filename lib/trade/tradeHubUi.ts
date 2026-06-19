import { initialAssetsFromSuggestion } from '@/lib/trade/calculatorAssets';
import type { BobSuggestion, TradeOpportunity } from '@/lib/trade/types';
import type { CalculatorAsset } from '@/components/trade/TradeCalculator';

export function opportunityToSuggestion(opp: TradeOpportunity): BobSuggestion {
  return {
    id: opp.id,
    type: opp.type === 'sell_high' ? 'sell' : 'buy',
    headline: `${opp.actionVerb} ${opp.playerName}`,
    playerId: opp.playerId,
    playerName: opp.playerName,
    position: opp.position,
    team: opp.team,
    tfoScore: null,
    ktcRank: opp.marketRank,
    rankDelta: opp.valueGap,
    verdict: opp.marketVerdict,
    verdictColor: opp.type === 'sell_high' ? '#A78BFA' : '#36E7A1',
    leagueId: opp.leagueId,
    leagueName: opp.leagueName,
    managerName: opp.managerName,
    whyReasons: opp.whyReasons,
    edgeScore: opp.tfoDelta / 10,
  };
}

export function calculatorAssetsFromOpportunity(opp: TradeOpportunity): {
  give: CalculatorAsset[];
  get: CalculatorAsset[];
  leagueId: string;
} {
  const s = opportunityToSuggestion(opp);
  const { give, get } = initialAssetsFromSuggestion(s);

  if (opp.type !== 'sell_high' && opp.suggestedPrice) {
    give.push({
      key: `pick-${opp.suggestedPrice}`,
      label: opp.suggestedPrice,
      isPick: true,
      tfoScore: opp.suggestedPrice.includes('1st') ? 70 : opp.suggestedPrice.includes('2nd') ? 55 : 40,
      ktcValue: null,
    });
  }
  if (opp.suggestedAddOn) {
    give.push({
      key: `addon-${opp.playerId}`,
      label: opp.suggestedAddOn,
      isPick: false,
      tfoScore: 35,
      ktcValue: null,
    });
  }

  return { give, get, leagueId: opp.leagueId };
}

export function acceptanceColor(pct: number): string {
  if (pct >= 80) return '#36E7A1';
  if (pct >= 70) return '#22c55e';
  if (pct >= 60) return '#FBBF24';
  return '#64748B';
}

export function acceptanceGlow(pct: number): string | undefined {
  if (pct >= 80) return '0 0 12px rgba(54,231,161,0.45)';
  return undefined;
}

export function mutualBenefitColor(score: number): string {
  if (score >= 80) return '#36E7A1';
  if (score >= 60) return '#22c55e';
  return '#64748B';
}

export function valueGapColor(gap: number | null, type: TradeOpportunity['type']): string {
  if (gap == null) return '#6b7a99';
  if (type === 'sell_high') return '#A78BFA';
  if (gap >= 100) return '#36E7A1';
  if (gap >= 50) return '#22c55e';
  return '#6b7a99';
}

export function confidenceBadgeStyle(
  tier: TradeOpportunity['tradeConfidence'],
): { bg: string; text: string } {
  switch (tier) {
    case 'Elite':
      return { bg: 'rgba(54,231,161,0.22)', text: '#36E7A1' };
    case 'High':
      return { bg: 'rgba(34,197,94,0.18)', text: '#22c55e' };
    case 'Medium':
      return { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24' };
    default:
      return { bg: 'rgba(100,116,139,0.18)', text: '#64748B' };
  }
}

export function bobBadgeStyle(badge: string): { color: string; bg: string } {
  const u = badge.toUpperCase();
  if (u.includes('BUY')) return { color: '#36E7A1', bg: 'rgba(54,231,161,0.14)' };
  if (u.includes('SELL') || u.includes('OVERREACTION')) {
    return { color: '#A78BFA', bg: 'rgba(167,139,250,0.14)' };
  }
  if (u.includes('TARGET')) return { color: '#FBBF24', bg: 'rgba(251,191,36,0.14)' };
  return { color: '#60a5fa', bg: 'rgba(96,165,250,0.14)' };
}

export function typeBadgeStyle(type: TradeOpportunity['type']): { label: string; color: string; bg: string } {
  switch (type) {
    case 'buy_low':
      return { label: 'Buy Low', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
    case 'sell_high':
      return { label: 'Sell High', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' };
    case 'buy_window':
      return { label: 'Buy Window', color: '#36E7A1', bg: 'rgba(54,231,161,0.12)' };
    default:
      return { label: 'Neutral', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' };
  }
}
