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
  CHAMPIONSHIP: { key: 'CHAMPIONSHIP', label: 'Win-Now', color: '#36E7A1' },
  CONTENDER: { key: 'CONTENDER', label: 'Contender', color: '#60a5fa' },
  TRANSITION: { key: 'TRANSITION', label: 'Transition', color: '#FBBF24' },
  REBUILD: { key: 'REBUILD', label: 'Rebuild', color: '#A78BFA' },
  ORPHAN: { key: 'ORPHAN', label: 'Unmanaged', color: '#6b7a99' },
};

/** User-facing contention label for headers; null hides internal ORPHAN bucket. */
export function publicLeagueStatusLabel(status: LeagueStatusKey): string | null {
  if (status === 'ORPHAN') return null;
  return LEAGUE_STATUS[status].label.toUpperCase();
}

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
  rankDelta: number | null;
  ktcRank: number | null;
  noMarketData: boolean;
}

/** Trajectory signal from player_value_signals. */
export interface PlayerValueSignal {
  direction60d: 'up' | 'down' | 'neutral' | null;
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
  /** 60-day value trajectory; null when no signal row. */
  valueSignal: PlayerValueSignal | null;
}

export interface SignalCounts {
  boom: number;
  hold: number;
  bust: number;
  total: number;
}

export type PositionKey = 'QB' | 'RB' | 'WR' | 'TE';
export type GradeLabel = 'Strong' | 'Average' | 'Weak';

export interface PositionGrade {
  position: PositionKey;
  grade: GradeLabel;
  avgTfo: number;
  required: number;
  have: number;
}

/** Roster Breakdown widget data: contention status + per-position grades + action. */
export interface RosterBreakdown {
  status: LeagueStatusKey;
  positionGrades: PositionGrade[];
  actionSummary: string;
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
  breakdown: RosterBreakdown;
}

export interface PortfolioBundle {
  players: RotationPlayer[];
  teamTfo: number;
  signalCounts: SignalCounts;
  playersRostered: number;
  breakdown: RosterBreakdown;
}

/** Biggest bench-outscores-starter projection gap across the user's rosters. */
export interface LineupOpportunity {
  leagueId: string;
  leagueName: string;
  position: string;
  benchPlayerId: string;
  benchName: string;
  benchProj: number;
  starterPlayerId: string;
  starterName: string;
  starterProj: number;
  gap: number;
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

/** Top sell-high action across owned rosters (SELL/BUST, most negative rank_delta). */
export interface FrontOfficePriority {
  playerId: string;
  playerName: string;
  verdict: 'SELL' | 'BUST';
  /** Negative when market overvalues vs BOB engine. */
  rankDelta: number;
  /** abs(rankDelta) rounded — display as "32 spots". */
  spotGap: number;
}

export interface DashboardRotationData {
  leagues: LeagueBundle[];
  portfolio: PortfolioBundle;
  tradeTargets: TradeTargetItem[];
  overvalued: OvervaluedItem[];
  /** Highest-priority sell action on the user's roster; null when none flagged. */
  frontOfficePriority: FrontOfficePriority | null;
  incomingTrades: DashboardIncomingTrade[];
  newsItems: DashboardNewsItem[];
  /** Players rostered by ANY team in each league (league-scoped news). */
  leagueRosteredIds: Record<string, string[]>;
  /** Biggest start/sit upgrade across the user's rosters; null when no data. */
  lineupOpportunity: LineupOpportunity | null;
  nflSeason: NflSeasonInfo;
  scoringContext: 'dynasty' | 'redraft';
}

// Empire rating shares the dashboard's existing curve: clamp(teamTfo + 8, 40..99).
export function empireRatingFromTfo(teamTfo: number): number {
  // Guard non-finite input (empty roster / unscored team) so the rating never
  // propagates NaN to the topbar, gauge, or delta.
  if (!Number.isFinite(teamTfo)) return 40;
  return Math.round(Math.min(99, Math.max(40, teamTfo + 8)) * 10) / 10;
}

const DEFAULT_REQUIRED: Record<PositionKey, number> = { QB: 1, RB: 2, WR: 2, TE: 1 };

// Derive starter requirements per position from Sleeper roster_positions; falls
// back to a standard lineup when unavailable. SUPER_FLEX counts toward QB depth.
function requiredFromPositions(rosterPositions: string[] | null): Record<PositionKey, number> {
  if (!rosterPositions || rosterPositions.length === 0) return { ...DEFAULT_REQUIRED };
  const count = (tok: string) => rosterPositions.filter((p) => p === tok).length;
  return {
    QB: Math.max(1, count('QB') + count('SUPER_FLEX')),
    RB: Math.max(1, count('RB')),
    WR: Math.max(1, count('WR')),
    TE: Math.max(1, count('TE')),
  };
}

function gradeFor(avgTfo: number, have: number, required: number): GradeLabel {
  if (have < required) return 'Weak'; // not enough bodies to fill the slots
  if (avgTfo >= 68) return 'Strong';
  if (avgTfo >= 58) return 'Average';
  return 'Weak';
}

/**
 * Roster Breakdown: per-position grade (top-N starters' avg TFO vs the league's
 * positional requirements) + a short action summary, given the league's
 * contention status. Pure — safe on client or server.
 */
export function computeRosterBreakdown(
  players: RotationPlayer[],
  rosterPositions: string[] | null,
  status: LeagueStatusKey,
): RosterBreakdown {
  const required = requiredFromPositions(rosterPositions);
  const positions: PositionKey[] = ['QB', 'RB', 'WR', 'TE'];

  const positionGrades: PositionGrade[] = positions.map((pos) => {
    const atPos = players
      .filter((p) => p.position === pos && p.tfoScore > 0)
      .sort((a, b) => b.tfoScore - a.tfoScore);
    const req = required[pos];
    const topN = atPos.slice(0, Math.max(1, req));
    const avgTfo =
      topN.length > 0
        ? Math.round((topN.reduce((s, p) => s + p.tfoScore, 0) / topN.length) * 10) / 10
        : 0;
    return { position: pos, grade: gradeFor(avgTfo, atPos.length, req), avgTfo, required: req, have: atPos.length };
  });

  const strong = positionGrades.filter((g) => g.grade === 'Strong').map((g) => g.position);
  const weak = positionGrades.filter((g) => g.grade === 'Weak').map((g) => g.position);
  const label = LEAGUE_STATUS[status].label;

  let actionSummary: string;
  if (players.length === 0) {
    actionSummary = 'No rostered players synced for this league yet.';
  } else {
    const parts = [`${label} roster.`];
    if (strong.length) parts.push(`Strong at ${strong.join('/')}.`);
    if (weak.length) {
      const verb = status === 'REBUILD' || status === 'ORPHAN' ? 'Build up' : 'Upgrade';
      parts.push(`${verb} ${weak.join('/')}.`);
    } else {
      parts.push('Balanced — hold and contend.');
    }
    actionSummary = parts.join(' ');
  }

  return { status, positionGrades, actionSummary };
}
