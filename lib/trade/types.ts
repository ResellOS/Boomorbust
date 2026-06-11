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
  targetPlayerId?: string;
  targetName?: string;
  edgeScore: number;
}

export interface TradeHistoryRow {
  id: string;
  timeAgo: string;
  gaveName: string;
  receivedDisplay: string;
  verdict: TradeVerdictBadge;
  edgeScore: number;
}

export interface TradePageStats {
  openOffers: number;
  acceptedThisWeek: number;
  bobWinRate: number;
  smartCounterUses: number;
  leaguesActive: number;
}

export interface TradePageFooter {
  engineStatus: string;
  smartCounterAccuracy: number;
  suggestionSuccessRate: number;
  tradeVolumeThisMonth: number;
}

export interface TradePageData {
  stats: TradePageStats;
  leagues: TradeLeague[];
  topOffer: TradeOffer | null;
  incomingOffers: TradeOffer[];
  outgoingOffers: TradeOffer[];
  completedOffers: TradeOffer[];
  suggestions: BobSuggestion[];
  history: TradeHistoryRow[];
  footer: TradePageFooter;
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
