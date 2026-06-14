// Pure types + league-status derivation for League Rotation Mode.
// Safe to import from both client components and server fetchers.

export type LeagueStatusKey =
  | 'CHAMPIONSHIP'
  | 'CONTENDER'
  | 'TRANSITION'
  | 'REBUILD'
  | 'ORPHAN';

export interface LeagueStatusMeta {
  key: LeagueStatusKey;
  label: string;
  color: string;
}

export const LEAGUE_STATUS: Record<LeagueStatusKey, LeagueStatusMeta> = {
  CHAMPIONSHIP: { key: 'CHAMPIONSHIP', label: 'Championship', color: '#36E7A1' },
  CONTENDER: { key: 'CONTENDER', label: 'Contender', color: '#60a5fa' },
  TRANSITION: { key: 'TRANSITION', label: 'Transition', color: '#FBBF24' },
  REBUILD: { key: 'REBUILD', label: 'Rebuild', color: '#A78BFA' },
  ORPHAN: { key: 'ORPHAN', label: 'Orphan', color: '#6b7a99' },
};

/** winPct is 0–1 (e.g. 0.65 = 65%). During offseason, status derives from teamTfo only. */
export function deriveLeagueStatus(
  winPct: number,
  teamTfo: number,
  isOffseason: boolean,
): LeagueStatusKey {
  if (isOffseason || winPct === 0) {
    if (teamTfo >= 75) return 'CHAMPIONSHIP';
    if (teamTfo >= 68) return 'CONTENDER';
    if (teamTfo >= 60) return 'TRANSITION';
    if (teamTfo >= 50) return 'REBUILD';
    return 'ORPHAN';
  }

  if (winPct > 0.65) return 'CHAMPIONSHIP';
  if (winPct > 0.5) return 'CONTENDER';
  if (winPct >= 0.4) return 'TRANSITION';
  if (winPct > 0) return 'REBUILD';
  return 'ORPHAN';
}

export type VerdictClass = 'boom' | 'hold' | 'bust';

/** Real engine component scores (0–100) for the radar; null when unscored. */
export interface PlayerComponents {
  ops: number;
  sfs: number;
  yoysi: number;
  sit: number;
  projectedPpg: number;
}

/** Market verdict (engine TFO rank vs KTC market rank); null when unscored. */
export interface PlayerMarketVerdict {
  verdict: 'BOOM' | 'BUY' | 'HOLD' | 'SELL' | 'BUST';
  color: string;
  rankDelta: number | null; // null when no_market_data
  noMarketData: boolean;
}

export interface RotationPlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
  verdictClass: VerdictClass;
  /** Real engine component scores for the radar; null when not scored. */
  components: PlayerComponents | null;
  /** Market buy/sell verdict vs KTC; null when player isn't in the scored pool. */
  marketVerdict: PlayerMarketVerdict | null;
}

export interface SignalCounts {
  boom: number;
  hold: number;
  bust: number;
  total: number;
}

export interface LeagueBundle {
  id: string;
  name: string;
  status: LeagueStatusKey;
  winRate: number;
  record: string; // e.g. "7-3" or "7-3-1"
  standingRank: number;
  totalTeams: number;
  teamTfo: number;
  players: RotationPlayer[];
  signalCounts: SignalCounts;
}

export interface PortfolioBundle {
  players: RotationPlayer[];
  teamTfo: number;
  signalCounts: SignalCounts;
  playersRostered: number;
}

export interface TradeTargetItem {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  leagueName: string;
  leagueId: string;
  tfoScore: number;
  reason: string;
  acquireCost: string;
}

export interface DashboardNewsItem {
  id: string;
  playerId?: string;
  playerHighlight: string;
  highlightColor: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: number;
}

export interface DashboardIncomingTrade {
  id: string;
  playerId: string;
  playerName: string;
  leagueId: string;
  leagueName: string;
  managerName: string;
  askingFor: string;
  dynastyEdge: number;
  status: 'NEW' | 'PENDING' | 'COUNTERED';
  tfoScore?: number;
}

export interface NflSeasonInfo {
  week: number;
  seasonType: 'pre' | 'regular' | 'post' | 'off';
  inSeason: boolean;
}

export interface OvervaluedItem {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  delta: number;
}

export interface DashboardRotationData {
  leagues: LeagueBundle[];
  portfolio: PortfolioBundle;
  tradeTargets: TradeTargetItem[];
  overvalued: OvervaluedItem[];
  incomingTrades: DashboardIncomingTrade[];
  newsItems: DashboardNewsItem[];
  nflSeason: NflSeasonInfo;
  scoringContext: 'dynasty' | 'redraft';
}

// Empire rating shares the dashboard's existing curve: clamp(teamTfo + 8, 40..99).
export function empireRatingFromTfo(teamTfo: number): number {
  return Math.round(Math.min(99, Math.max(40, teamTfo + 8)) * 10) / 10;
}
