/** Shared UI types derived from the /api/dashboard/trade-hub response shape. */

export type TREVerdict = 'WIN' | 'EVEN' | 'LOSS';
export type TradeHistoryOutcome = 'WIN' | 'LOSS' | 'TBD';
export type TabId = 'offers' | 'counter' | 'suggestions' | 'history';

export interface TradeHubAsset {
  player_id:  string;
  name:       string;
  position:   string;
  team:       string;
  tfo_score:  number | null;
  tfo_grade:  string | null;
  bvi_score:  number | null;
  ktc_value:  number | null;
  bvi_delta:  number | null;
}

export interface TradeHubOffer {
  id:                   string;
  league_id:            string;
  league_name:          string;
  opponent_sleeper_id:  string | null;
  opponent_name:        string | null;
  opponent_dmp_title:   string | null;
  give:                 TradeHubAsset[];
  receive:              TradeHubAsset[];
  tre_verdict:          TREVerdict | null;
  tre_reasoning:        string | null;
  created_at:           string;
  week:                 number;
}

export interface ProactiveTradeItem {
  id:                  string;
  league_id:           string;
  league_name:         string;
  target_player:       TradeHubAsset | null;
  target_player_name:  string;
  target_position:     string;
  gap_filled:          string;
  reasoning:           string;
  created_at:          string;
}

export interface TradeHistoryItem {
  id:           string;
  league_id:    string;
  league_name:  string;
  opponent_name: string | null;
  gave:         TradeHubAsset[];
  received:     TradeHubAsset[];
  tre_verdict:  TREVerdict | null;
  outcome:      TradeHistoryOutcome;
  created_at:   string;
  week:         number;
}

export interface TradeHubLeague {
  id:   string;
  name: string;
}

export interface TradeHubData {
  incomingOffers:   TradeHubOffer[];
  proactiveTrades:  ProactiveTradeItem[];
  tradeHistory:     TradeHistoryItem[];
  bviUndervalued:   unknown[];
  bviOvervalued:    unknown[];
  leagues:          TradeHubLeague[];
  activeLeagueId:   string | null;
}

/** `/api/trades/stats` — header stats bar + footer status strip. */
export interface TradeHubStatsPayload {
  incomingOffers: number;
  leagues: number;
  treSuggestions: number;
  avgTreEdge: number | null;
  acceptWinRatePct: number | null;
  /** Bottom status bar — TRE engine */
  treEngineStatus: string;
  treLastRunLabel: string;
  /** Bottom status bar — smart counter */
  smartCounterAccuracyPct: number;
  smartCounterAccuracyTier: string;
  /** Bottom status bar — suggestions */
  suggestionSuccessRatePct: number;
  suggestionSuccessTier: string;
  /** Bottom status bar — volume */
  tradeVolumeThisMonth: number;
}

/** `/api/trades/incoming` — incoming offers panel. */
export type IncomingReceiveItem =
  | {
      kind: 'player';
      name: string;
      position: string;
      team: string;
      playerId?: string | null;
    }
  | { kind: 'pick'; label: string };

export interface IncomingOfferApi {
  id: string;
  leagueLetter: string;
  leagueIconBg: string;
  leagueName: string;
  timeAgo: string;
  isNew: boolean;
  proposerTeam: string;
  proposerHandle: string;
  proposerReceives: IncomingReceiveItem[];
  recipientTeam: string;
  recipientHandle: string;
  recipientReceives: IncomingReceiveItem[];
  treEdge: string;
}

export interface IncomingOffersResponse {
  offers: IncomingOfferApi[];
  totalCount: number;
}

/** `/api/trades/counter` — smart counter panel (3 responses). */
export type SmartCounterTierKey = 'aggressive' | 'balanced' | 'conservative';

export interface SmartCounterCardDto {
  tier: SmartCounterTierKey;
  label: string;
  title: string;
  description: string;
  modification: string;
  treScoreDisplay: string;
}

export interface SmartCounterApiResponse {
  offerId: string;
  responses: SmartCounterCardDto[];
}

/** `/api/trades/suggestions` — TRE suggested trades panel. */
export interface TreSuggestionRowDto {
  id: string;
  playerId: string;
  playerDisplayName: string;
  headline: string;
  targetName: string;
  treEdge: string;
}

export interface TreSuggestionsApiResponse {
  suggestions: TreSuggestionRowDto[];
}

/** `/api/trades/history` — trade history table panel. */
export type TradeHistoryVerdict = 'SMASH' | 'FAIR' | 'MISS';

export interface TradeHistoryRowDto {
  id: string;
  timeLabel: string;
  givenPlayerId: string;
  givenName: string;
  /** Aging / risk flag (e.g. veteran TE). */
  givenWarning?: boolean;
  /** Primary player for avatar on received side; optional when text-only. */
  receivedPlayerId?: string | null;
  receivedDisplay: string;
  verdict: TradeHistoryVerdict;
  scoreDisplay: string;
}

export interface TradeHistoryApiResponse {
  trades: TradeHistoryRowDto[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function timeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function isNewOffer(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 3_600_000;
}

export const LEAGUE_COLORS = [
  '#36E7A1', '#22D3EE', '#FBBF24', '#A78BFA',
  '#F472B6', '#60A5FA', '#FB923C', '#34D399',
];

export function leagueColor(index: number): string {
  return LEAGUE_COLORS[index % LEAGUE_COLORS.length] ?? '#36E7A1';
}

export function photoUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}
