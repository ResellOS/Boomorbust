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

/** `/api/trades/stats` response — header stats bar only. */
export interface TradeHubStatsPayload {
  incomingOffers: number;
  leagues: number;
  treSuggestions: number;
  avgTreEdge: number | null;
  acceptWinRatePct: number | null;
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
