import { initialAssetsFromSuggestion } from '@/lib/trade/calculatorAssets';
import type { BobSuggestion, ManagerTradeCard, TradeOpportunity } from '@/lib/trade/types';
import type { CalculatorAsset } from '@/components/trade/TradeCalculator';

export interface TradeValueTotals {
  giveTfo: number;
  getTfo: number;
  delta: number;
  diffPct: number;
}

export function whyThisMattersBullets(opp: TradeOpportunity): string[] {
  const bullets: string[] = [];
  if (opp.championshipImpact > 0) {
    bullets.push(`Increases championship odds by +${opp.championshipImpact.toFixed(1)}%`);
  }
  if (opp.valueGap != null && opp.valueGap >= 50) {
    bullets.push(`Exploits market inefficiency of ${Math.round(opp.valueGap)} rank spots`);
  }
  if (opp.managerName && opp.managerName !== 'Manager') {
    bullets.push(`${opp.managerName} is a likely trade partner for this move`);
  }
  if (opp.portfolioImpactNote) bullets.push(opp.portfolioImpactNote);
  for (const r of opp.whyReasons.slice(0, 3)) {
    if (!bullets.includes(r)) bullets.push(r);
  }
  for (const c of opp.reasonChips.slice(0, 2)) {
    if (!bullets.some((b) => b.includes(c.slice(0, 20)))) bullets.push(c);
  }
  if (opp.type === 'buy_window') bullets.push('Player is entering acquisition window');
  return bullets.slice(0, 5);
}

export function interpretTradePackage(
  totals: TradeValueTotals | null,
  opp: TradeOpportunity | null,
): { label: string; detail: string; color: string } {
  if (!totals || (totals.giveTfo === 0 && totals.getTfo === 0)) {
    if (opp) {
      if (opp.type === 'buy_low' || opp.type === 'buy_window') {
        return {
          label: 'Market Inefficiency',
          detail: 'BOB sees value the market is sleeping on — worth pursuing.',
          color: '#36E7A1',
        };
      }
      return {
        label: 'Strategic Move',
        detail: opp.portfolioImpactNote || 'Aligns with roster construction goals.',
        color: '#36E7A1',
      };
    }
    return { label: 'Build Package', detail: 'Select a trade to analyze the offer.', color: '#6b7a99' };
  }

  const { diffPct, delta } = totals;
  const accept = opp?.acceptanceProbability ?? 0;

  if (diffPct > 10) {
    return {
      label: 'Strong Value',
      detail: `You gain +${delta.toFixed(1)} TFO — market would call this a win.`,
      color: '#36E7A1',
    };
  }
  if (Math.abs(diffPct) <= 10) {
    return {
      label: 'Fair Deal',
      detail: 'Fair value exchange — high chance both sides feel good about it.',
      color: '#FBBF24',
    };
  }
  if (accept >= 65 && opp && opp.championshipImpact >= 2) {
    return {
      label: 'Strategic Overpay',
      detail: `Strategic overpay to close a roster need — +${opp.championshipImpact.toFixed(1)}% title equity, ${accept}% likely to land.`,
      color: '#A78BFA',
    };
  }
  if (diffPct < -25 && accept < 55) {
    return {
      label: 'Bad Deal',
      detail: 'Raw value loss with low acceptance odds — rework the package before sending.',
      color: '#EF4444',
    };
  }
  return {
    label: 'Strategic Overpay',
    detail: 'You give up raw value — only pursue if the roster fit is critical.',
    color: '#FBBF24',
  };
}

export function confidenceScore(level: TradeOpportunity['tradeConfidence']): number {
  switch (level) {
    case 'Elite':
      return 99;
    case 'High':
      return 85;
    case 'Medium':
      return 65;
    default:
      return 40;
  }
}

export function whyItWorks(
  opp: TradeOpportunity | null,
  interpretation: { label: string; detail: string },
): string {
  if (!opp) return 'Select a trade to see why this package works.';
  if (interpretation.label === 'Strategic Overpay') {
    return opp.portfolioImpactNote || interpretation.detail;
  }
  const reason = opp.whyReasons[0] ?? opp.reasonChips[0];
  if (reason) return reason;
  return interpretation.detail;
}

export function recommendedOpeningOffer(m: ManagerTradeCard): string {
  const pick = m.pickHoarderScore >= 60 ? '2027 1st' : '2027 2nd';
  const need = m.profile.needs?.[0] ?? 'depth';
  const surplus = m.profile.surplus?.[0];
  if (surplus) return `${pick} + ${surplus} depth`;
  return `${pick} + ${need} help`;
}

export function managerBestAsset(m: ManagerTradeCard): string {
  const assets = m.profile.top_assets ?? [];
  return assets[0]?.name ?? '—';
}

export function managerTendencies(m: ManagerTradeCard): string[] {
  const chips: string[] = [];
  if (m.profile.prefers_youth) chips.push('Overpays for youth');
  if (m.pickHoarderScore >= 60) chips.push('Loves rookie picks');
  if (m.profile.trade_frequency === 'active') chips.push('High trade volume');
  if (m.profile.trade_frequency === 'inactive') chips.push('Rarely engages');
  chips.push(m.negotiationStyle);
  return chips.slice(0, 3);
}

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
