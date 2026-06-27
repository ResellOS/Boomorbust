import type { ManagerProfileData } from '@/lib/managers/analyzer';
import type {
  BobSuggestion,
  ManagerTradeCard,
  MarketTemperatureRow,
  TradeOpportunity,
} from './types';

function bobRankFromMarket(ktcRank: number | null, rankDelta: number | null): number | null {
  if (ktcRank == null || rankDelta == null) return null;
  return Math.round(ktcRank - rankDelta);
}

function typeBadge(s: BobSuggestion): TradeOpportunity['type'] {
  if (s.type === 'sell') return 'sell_high';
  if (s.verdict === 'BOOM') return 'buy_window';
  if (s.verdict === 'BUY') return 'buy_low';
  return 'neutral';
}

function actionVerb(s: BobSuggestion): string {
  if (s.type === 'sell') return 'Move';
  if (s.verdict === 'BOOM') return 'Acquire';
  if (s.verdict === 'BUY') return 'Buy Low';
  return 'Add';
}

function suggestedPrice(gap: number | null, type: BobSuggestion['type']): string {
  const g = gap != null ? Math.abs(Math.round(gap)) : 0;
  if (type === 'sell') {
    if (g >= 200) return '2027 2nd Round Pick';
    if (g >= 100) return '2027 3rd Round Pick';
    return 'Future pick or depth';
  }
  if (g >= 150) return '2027 1st Round Pick';
  if (g >= 80) return '2027 2nd Round Pick';
  if (g >= 40) return '2027 3rd Round Pick';
  return 'RB depth piece (any)';
}

function acceptanceFromManager(
  mgr: ManagerProfileData | null,
  suggestion: BobSuggestion,
): number {
  let base = 52;
  if (mgr) {
    if (mgr.trade_frequency === 'active') base = 72;
    else if (mgr.trade_frequency === 'moderate') base = 58;
    else base = 38;

    if (mgr.archetype === 'wheeler_dealer') base += 12;
    if (mgr.archetype === 'hoarder') base -= 18;
    if (mgr.archetype === 'contender' && suggestion.type === 'buy') base += 5;

    const pos = suggestion.position?.toUpperCase();
    if (pos && (mgr.needs ?? []).includes(pos)) base += 10;
    if (pos && (mgr.surplus ?? []).includes(pos)) base += 8;
  }
  const gapBoost = Math.min(15, Math.abs(suggestion.rankDelta ?? 0) / 20);
  return Math.min(95, Math.max(25, Math.round(base + gapBoost)));
}

function mutualBenefit(s: BobSuggestion): number {
  const gap = Math.abs(s.rankDelta ?? s.edgeScore * 10);
  const tfo = s.tfoScore ?? 50;
  return Math.min(99, Math.round(gap * 0.35 + tfo * 0.45));
}

function champImpact(tfoDelta: number): number {
  return Math.round((tfoDelta / 10) * 10) / 10;
}

function youthPreference(mgr: ManagerProfileData): number {
  if (mgr.prefers_youth) return 88;
  if (mgr.avg_buy_age != null && mgr.avg_buy_age <= 24) return 75;
  if (mgr.avg_buy_age != null && mgr.avg_buy_age >= 28) return 35;
  return 55;
}

function pickHoarderScore(mgr: ManagerProfileData): number {
  const total = mgr.adds_picks + mgr.sells_picks;
  if (total === 0) return 50;
  const ratio = mgr.adds_picks / total;
  return Math.min(100, Math.round(ratio * 100));
}

function negotiationStyle(mgr: ManagerProfileData): string {
  const map: Record<string, string> = {
    wheeler_dealer: 'Flexible',
    hoarder: 'Stubborn',
    rebuilder: 'Patient',
    contender: 'Aggressive',
    balanced: 'Logical',
  };
  return map[mgr.archetype] ?? 'Balanced';
}

function overpayTendency(mgr: ManagerProfileData): string {
  if (mgr.archetype === 'contender') return 'High on win-now pieces';
  if (mgr.archetype === 'rebuilder') return 'High on youth/picks';
  if (mgr.archetype === 'hoarder') return 'Low — needs clear win';
  return 'Moderate';
}

function tradeFrequencyScore(mgr: ManagerProfileData): number {
  if (mgr.trade_frequency === 'active') return 92;
  if (mgr.trade_frequency === 'moderate') return 68;
  return 35;
}

export function displayArchetypeLabel(mgr: ManagerProfileData): string {
  const map: Record<string, string> = {
    rebuilder: 'THE REBUILDER',
    hoarder: 'THE HOARDER',
    wheeler_dealer: 'THE NEGOTIATOR',
    contender: 'THE WIN-NOW',
    balanced: 'THE COLLECTOR',
  };
  return map[mgr.archetype] ?? mgr.archetype_label?.toUpperCase() ?? 'MANAGER';
}

export function tradeConfidenceTier(
  acceptance: number,
  mutual: number,
): TradeOpportunity['tradeConfidence'] {
  if (acceptance >= 80 && mutual >= 75) return 'Elite';
  if (acceptance >= 70) return 'High';
  if (acceptance >= 55) return 'Medium';
  return 'Low';
}

export function bobOpportunityBadge(s: BobSuggestion): string {
  if (s.verdict === 'BUST') return 'MARKET OVERREACTION';
  if (s.verdict === 'SELL') return 'SELL WINDOW';
  if (s.verdict === 'BOOM') return 'TARGET NOW';
  if (s.verdict === 'BUY') return 'BUY WINDOW';
  return 'UNDERVALUED';
}

export function blockOpportunityBadge(verdictLabel: string, verdict?: string): string {
  if (verdict === 'BUST') return 'MARKET OVERREACTION';
  if (verdictLabel.toLowerCase().includes('sell')) return 'SELL WINDOW';
  return 'TARGET NOW';
}

function portfolioImpactScore(acceptance: number, mutual: number, champ: number): number {
  return Math.min(
    100,
    Math.round(acceptance * 0.35 + mutual * 0.4 + Math.min(25, champ * 4) * 0.25),
  );
}

function portfolioImpactNote(
  mgr: ManagerProfileData | null,
  s: BobSuggestion,
): string {
  const pos = s.position?.toUpperCase();
  if (mgr && pos) {
    if ((mgr.needs ?? []).includes(pos)) {
      return `Fills ${pos} need — moves roster toward balanced contender.`;
    }
    if ((mgr.surplus ?? []).includes(pos) && s.type === 'sell') {
      return `Monetizes ${pos} surplus before the market corrects.`;
    }
  }
  if (s.type === 'buy') return 'Closes a market inefficiency vs consensus rankings.';
  if (s.type === 'sell') return 'Captures value before consensus catches up.';
  return 'Improves roster construction vs league median.';
}

export function buildReasonChips(mgr: ManagerProfileData | null, s: BobSuggestion): string[] {
  const chips: string[] = [];
  if (mgr) {
    if (mgr.trade_frequency === 'active') chips.push('Trades frequently');
    if (mgr.prefers_youth) chips.push('Values youth');
    const pos = s.position?.toUpperCase();
    if (pos && (mgr.needs ?? []).includes(pos)) chips.push(`Needs ${pos} help`);
    if (pos && (mgr.surplus ?? []).includes(pos)) chips.push(`${pos} surplus`);
    if (mgr.trade_frequency === 'active') chips.push('Responds quickly');
  }
  for (const r of s.whyReasons ?? []) {
    const short = r.length > 48 ? `${r.slice(0, 45).trim()}…` : r;
    if (!chips.includes(short)) chips.push(short);
  }
  if (s.rankDelta != null && Math.abs(s.rankDelta) >= 50) {
    chips.push(`Market off by ${Math.abs(Math.round(s.rankDelta))} spots`);
  }
  return chips.slice(0, 6);
}

export function computeMarketTemperature(suggestions: BobSuggestion[]): MarketTemperatureRow[] {
  const positions = ['QB', 'RB', 'WR', 'TE'] as const;
  const counts = new Map<string, { buy: number; sell: number }>();
  for (const p of positions) counts.set(p, { buy: 0, sell: 0 });

  for (const s of suggestions) {
    const pos = s.position?.toUpperCase();
    if (!pos || !counts.has(pos)) continue;
    const c = counts.get(pos)!;
    if (s.type === 'buy') c.buy += 1;
    else c.sell += 1;
  }

  return positions.map((pos) => {
    const { buy, sell } = counts.get(pos)!;
    const total = buy + sell;
    if (total === 0) {
      return { position: pos, status: 'NEUTRAL', icon: '⚡' };
    }
    if (buy >= sell + 2) {
      return { position: pos, status: 'BUY WINDOW', icon: '❄️' };
    }
    if (sell > buy) {
      return { position: pos, status: 'RISING', icon: '📈' };
    }
    if (total >= 4) {
      return { position: pos, status: 'HOT', icon: '🔥' };
    }
    return { position: pos, status: 'NEUTRAL', icon: '⚡' };
  });
}

export function suggestionToOpportunity(
  s: BobSuggestion,
  mgr: ManagerProfileData | null,
  team = 'FA',
): TradeOpportunity {
  const gap = s.rankDelta != null ? Math.round(s.rankDelta) : null;
  const acceptance = acceptanceFromManager(mgr, s);
  const mutual = mutualBenefit(s);
  const tfoDelta = Math.abs(s.rankDelta ?? s.edgeScore * 10);
  const champ = champImpact(tfoDelta);
  const why = [...(s.whyReasons ?? [])];
  if (mgr) {
    if (s.position && (mgr.needs ?? []).includes(s.position.toUpperCase())) {
      why.unshift(`Manager has ${s.position} need — trade window open.`);
    }
    if (s.position && (mgr.surplus ?? []).includes(s.position.toUpperCase())) {
      why.unshift(`Manager overloaded at ${s.position}.`);
    }
  }
  if (gap != null && gap !== 0) {
    const dir = gap < 0 ? 'overvalues' : 'undervalues';
    why.push(`Market ${dir} ${s.playerName} by ${Math.abs(gap)} spots.`);
  }

  const giveName =
    s.type === 'sell' ? s.playerName : suggestedPrice(gap, s.type).split(' ').slice(0, 3).join(' ');
  const getName = s.type === 'sell' ? 'Future pick value' : s.playerName;

  return {
    id: s.id,
    playerId: s.playerId,
    playerName: s.playerName,
    position: s.position ?? '—',
    team,
    leagueId: s.leagueId,
    leagueName: s.leagueName,
    managerName: s.managerName?.replace('@', '') ?? 'Manager',
    type: typeBadge(s),
    bobRank: bobRankFromMarket(s.ktcRank ?? null, s.rankDelta ?? null),
    marketRank: s.ktcRank ?? null,
    valueGap: gap != null ? Math.abs(gap) : null,
    suggestedPrice: suggestedPrice(gap, s.type),
    givePlayerName: giveName,
    getPlayerName: getName,
    suggestedAddOn: s.type === 'buy' ? 'RB depth piece (any)' : undefined,
    acceptanceProbability: acceptance,
    mutualBenefitScore: mutual,
    championshipImpact: champ,
    tfoDelta,
    whyReasons: why.slice(0, 4),
    reasonChips: buildReasonChips(mgr, s),
    opportunityScore: Math.round((mutual * acceptance) / 100),
    actionVerb: actionVerb(s),
    portfolioImpactScore: portfolioImpactScore(acceptance, mutual, champ),
    portfolioImpactNote: portfolioImpactNote(mgr, s),
    tradeConfidence: tradeConfidenceTier(acceptance, mutual),
    bobOpportunityBadge: bobOpportunityBadge(s),
    marketVerdict: s.verdict,
  };
}

export function buildTradeOpportunities(
  suggestions: BobSuggestion[],
  managerByLeagueRoster: Map<string, ManagerProfileData>,
  rosterIdByLeagueManager: Map<string, number>,
  playerTeams: Map<string, string>,
): TradeOpportunity[] {
  return suggestions.map((s) => {
    const rosterKey = `${s.leagueId}:${s.managerName ?? ''}`;
    const rosterId = rosterIdByLeagueManager.get(rosterKey);
    const mgrKey = rosterId != null ? `${s.leagueId}:${rosterId}` : '';
    const mgr = mgrKey ? managerByLeagueRoster.get(mgrKey) ?? null : null;
    return suggestionToOpportunity(s, mgr, playerTeams.get(s.playerId) ?? 'FA');
  });
}

export function rankOpportunities(opps: TradeOpportunity[]): TradeOpportunity[] {
  return [...opps].sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function buildManagerCards(
  rows: {
    leagueId: string;
    leagueName: string;
    rosterId: number;
    displayName: string;
    avatar: string | null;
    data: ManagerProfileData;
  }[],
): ManagerTradeCard[] {
  return rows
    .map((r) => ({
      sleeperRosterId: r.rosterId,
      leagueId: r.leagueId,
      leagueName: r.leagueName,
      displayName: r.displayName,
      avatar: r.avatar,
      tradeLikelihood: tradeFrequencyScore(r.data),
      confidenceLabel:
        r.data.trade_frequency === 'active'
          ? 'Very High'
          : r.data.trade_frequency === 'moderate'
            ? 'Medium'
            : 'Low',
      profile: r.data,
      youthPreference: youthPreference(r.data),
      pickHoarderScore: pickHoarderScore(r.data),
      responseSpeed: r.data.trade_frequency === 'active' ? '4h avg' : undefined,
      negotiationStyle: negotiationStyle(r.data),
      overpayTendency: overpayTendency(r.data),
    }))
    .sort((a, b) => b.tradeLikelihood - a.tradeLikelihood)
    .slice(0, 5);
}

export function championshipOddsFromTfo(avgTfo: number): number {
  if (avgTfo <= 0) return 0;
  return Math.round(Math.min(95, avgTfo * 0.41) * 10) / 10;
}
