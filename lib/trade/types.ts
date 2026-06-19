export type TradeVerdictBadge = 'BOOM' | 'FAIR' | 'MISS';

export interface TradePlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
}

export interface TradePick {
  label: string;
  round: number;
  season: string;
}

export interface TradeOffer {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueType: 'dynasty' | 'redraft' | 'other';
  createdAt: string;
  timeAgo: string;
  isNew: boolean;
  managerHandle: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'completed';
  /** Players you would give up */
  givePlayers: TradePlayer[];
  givePicks: TradePick[];
  /** Players/picks you would receive */
  receivePlayers: TradePlayer[];
  receivePicks: TradePick[];
  offerValue: number;
  verdict: TradeVerdictBadge;
  offeredPlayerIds: string[];
  yourPlayerIds: string[];
}

export interface TradeLeague {
  id: string;
  name: string;
  status?: string | null;
  tag: 'Contender' | 'Rebuild';
  dotColor: string;
}

export interface BobSuggestion {
  id: string;
  type: 'buy' | 'sell';
  headline: string;
  playerId: string;
  playerName: string;
  position?: string;
  team?: string;
  tfoScore?: number | null;
  ktcValue?: number | null;
  ktcRank?: number | null;
  targetPlayerId?: string;
  targetName?: string;
  /** Scaled rank_delta (engine vs market) — the "+11.7" style number. */
  edgeScore: number;
  /** Market verdict driving this suggestion. */
  verdict: 'BOOM' | 'BUY' | 'HOLD' | 'SELL' | 'BUST';
  verdictColor: string;
  leagueId: string;
  leagueName: string;
  /** For buy-low: the manager who rosters the player (trade target). */
  managerName?: string;
  targetRosterId?: number;
  /** Raw engine vs market rank delta (negative = market overvalues). */
  rankDelta?: number | null;
  /** Plain-English bullets shown under each suggestion row. */
  whyReasons?: string[];
}

export interface TradeOpportunity {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  leagueId: string;
  leagueName: string;
  managerName: string;
  type: 'buy_low' | 'sell_high' | 'buy_window' | 'neutral';
  bobRank: number | null;
  marketRank: number | null;
  valueGap: number | null;
  suggestedPrice: string;
  givePlayerName: string;
  getPlayerName: string;
  suggestedAddOn?: string;
  acceptanceProbability: number;
  mutualBenefitScore: number;
  championshipImpact: number;
  tfoDelta: number;
  whyReasons: string[];
  reasonChips: string[];
  opportunityScore: number;
  actionVerb: string;
  portfolioImpactScore: number;
  portfolioImpactNote: string;
  tradeConfidence: 'Low' | 'Medium' | 'High' | 'Elite';
  bobOpportunityBadge: string;
  marketVerdict: BobSuggestion['verdict'];
}

export interface ManagerTradeCard {
  sleeperRosterId: number;
  leagueId: string;
  leagueName: string;
  displayName: string;
  avatar: string | null;
  tradeLikelihood: number;
  confidenceLabel: string;
  profile: import('@/lib/managers/analyzer').ManagerProfileData;
  youthPreference: number;
  pickHoarderScore: number;
  responseSpeed?: string;
  negotiationStyle: string;
  overpayTendency: string;
}

export interface BlockPlayer {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  ownerName: string;
  leagueName: string;
  leagueId: string;
  verdictLabel: string;
  bobOpportunityBadge: string;
}

export interface TradeHistoryRow {
  id: string;
  timeAgo: string;
  gaveName: string;
  receivedDisplay: string;
  verdict: TradeVerdictBadge;
  edgeScore: number;
  /** League this trade belongs to; undefined when unknown (shown in ALL only). */
  leagueId?: string;
}

export interface TradePageStats {
  openOffers: number;
  acceptedThisWeek: number;
  /** Mean tfo_score of rostered players (NOT a win rate). */
  avgRosterTfo: number;
  smartCounterUses: number;
  leaguesActive: number;
  /** Championship odds proxy across rostered players. */
  championshipOdds: number;
  /** Count of ranked trade opportunities. */
  tradeOpportunities: number;
}

export interface TradePageFooter {
  engineStatus: string;
  /** null until real outcome data exists (shown as "No data yet"). */
  smartCounterAccuracy: number | null;
  suggestionSuccessRate: number | null;
  tradeVolumeThisMonth: number;
}

/** A draft pick the current user owns in a given league (for the calculator). */
export interface OwnedPick {
  /** "2027 1st (own)" or "2027 2nd (via Team X)" */
  label: string;
  season: string;
  round: number;
  leagueId: string;
}

export interface MarketTemperatureRow {
  position: string;
  status: string;
  icon: string;
}

export interface TradePageData {
  stats: TradePageStats;
  leagues: TradeLeague[];
  topOffer: TradeOffer | null;
  incomingOffers: TradeOffer[];
  outgoingOffers: TradeOffer[];
  completedOffers: TradeOffer[];
  suggestions: BobSuggestion[];
  opportunities: TradeOpportunity[];
  managerCards: ManagerTradeCard[];
  blockPlayers: BlockPlayer[];
  marketTemperature: MarketTemperatureRow[];
  history: TradeHistoryRow[];
  footer: TradePageFooter;
  /** Picks the user currently owns, keyed by leagueId (give-side dropdown). */
  ownedPicksByLeague: Record<string, OwnedPick[]>;
  selectedOfferDefaults: {
    offeredPlayerIds: string[];
    yourPlayerIds: string[];
    leagueId: string;
  } | null;
}

export interface SmartCounterResponse {
  tier: 'aggressive' | 'balanced' | 'conservative';
  title: string;
  description: string;
  adjustment: string;
  adjustmentType: 'add' | 'remove' | 'neutral';
  edgeScore: number;
  copyText: string;
}
