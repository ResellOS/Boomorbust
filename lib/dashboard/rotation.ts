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

export interface DeriveStatusArgs {
  winRate: number; // 0..100 (only meaningful when gamesPlayed > 0)
  teamTfo: number; // avg dynasty TFO of the roster
  standingRank: number; // 1-based; 0 = unknown
  totalTeams: number;
  gamesPlayed: number;
  rosterSize: number;
}

// Order: an empty roster is an orphan; otherwise championship → rebuild
// (low win% or weak roster TFO) → contender → transition.
export function deriveLeagueStatus(a: DeriveStatusArgs): LeagueStatusKey {
  if (a.rosterSize === 0) return 'ORPHAN';

  const hasRecord = a.gamesPlayed > 0;
  const playoff =
    a.standingRank > 0 && a.standingRank <= Math.ceil(a.totalTeams / 2);

  if (hasRecord && a.winRate > 65 && a.standingRank > 0 && a.standingRank <= 3) {
    return 'CHAMPIONSHIP';
  }
  if (a.teamTfo < 60 || (hasRecord && a.winRate < 40)) return 'REBUILD';
  if ((hasRecord && a.winRate > 50) || playoff) return 'CONTENDER';
  if (hasRecord && a.winRate >= 40 && a.winRate <= 50) return 'TRANSITION';

  // Offseason / no record yet — derive from team TFO only.
  if (a.teamTfo > 75) return 'CHAMPIONSHIP';
  if (a.teamTfo > 68) return 'CONTENDER';
  if (a.teamTfo > 60) return 'TRANSITION';
  if (a.teamTfo > 50) return 'REBUILD';
  return 'ORPHAN';
}

export type VerdictClass = 'boom' | 'hold' | 'bust';

export interface RotationPlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
  verdictClass: VerdictClass;
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
