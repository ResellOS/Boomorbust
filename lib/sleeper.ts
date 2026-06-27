const SLEEPER_BASE = 'https://api.sleeper.app/v1';

async function sleeperFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SLEEPER_BASE}${path}`);
    if (!res.ok) {
      console.error(`Sleeper API error: ${res.status} ${path}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`Sleeper fetch failed for ${path}:`, err);
    return null;
  }
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  scoring_settings: Record<string, number>;
  settings: Record<string, unknown>;
  status: string;
  sport: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  taxi: string[] | null;
  settings: Record<string, number>;
}

export async function fetchUserLeagues(
  userId: string,
  season: string
): Promise<SleeperLeague[] | null> {
  return sleeperFetch<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
}

export async function fetchLeagueRosters(
  leagueId: string
): Promise<SleeperRoster[] | null> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export async function fetchSleeperUserByUsername(
  username: string
): Promise<{ user_id: string; username: string; display_name: string } | null> {
  return sleeperFetch(`/user/${username}`);
}

export interface SleeperDraftPick {
  round: number;
  season: string;
  roster_id: number;
  owner_id: number;
  previous_owner_id: number;
}

export interface SleeperTransaction {
  transaction_id: string;
  type: 'trade' | 'free_agent' | 'waiver';
  status: string;
  created: number;
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: SleeperDraftPick[];
  roster_ids: number[];
  /** user_id of the proposer (used to split incoming vs outgoing). */
  creator?: string;
  consenter_ids?: number[];
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export async function fetchTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[] | null> {
  return sleeperFetch<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`);
}

/** Pending and proposed trades for a league. */
export async function fetchLeagueTrades(
  leagueId: string,
): Promise<SleeperTransaction[] | null> {
  return sleeperFetch<SleeperTransaction[]>(`/league/${leagueId}/trades`);
}

export interface TradedPick {
  season: string;
  round: number;
  roster_id: number;       // original team's pick
  owner_id: number;        // current owner
  previous_owner_id: number;
}

export async function fetchTradedPicks(leagueId: string): Promise<TradedPick[] | null> {
  return sleeperFetch<TradedPick[]>(`/league/${leagueId}/traded_picks`);
}

export async function fetchLeagueUsers(leagueId: string): Promise<SleeperUser[] | null> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`);
}

export interface SleeperLeagueFull extends SleeperLeague {
  roster_positions: string[];
  draft_id: string;
  /** Sleeper league id for the prior season (dynasty leagues roll over each year). */
  previous_league_id: string | null;
}

export async function fetchLeagueFull(leagueId: string): Promise<SleeperLeagueFull | null> {
  return sleeperFetch<SleeperLeagueFull>(`/league/${leagueId}`);
}

export interface SleeperDraftInfo {
  draft_id: string;
  league_id: string;
  season: string;
  status: 'complete' | 'in_progress' | 'pre_draft';
  type: string;
  settings: { rounds: number; [key: string]: unknown };
  metadata: Record<string, unknown>;
}

export async function fetchLeagueDrafts(leagueId: string): Promise<SleeperDraftInfo[] | null> {
  return sleeperFetch<SleeperDraftInfo[]>(`/league/${leagueId}/drafts`);
}

export interface SleeperDraftPickRaw {
  player_id: string;
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number;
  picked_by: string;
  metadata: { position?: string; [key: string]: unknown };
}

export async function fetchDraftPicks(draftId: string): Promise<SleeperDraftPickRaw[] | null> {
  return sleeperFetch<SleeperDraftPickRaw[]>(`/draft/${draftId}/picks`);
}

// ── State / week helpers ───────────────────────────────────────────────────

export interface SleeperState {
  week: number;
  display_week: number;
  season: string;
  season_type: 'pre' | 'regular' | 'post' | 'off';
  league_season: string;
  league_create_season: string;
}

export async function fetchNflState(): Promise<SleeperState | null> {
  return sleeperFetch<SleeperState>(`/state/nfl`);
}

// ── Matchups ───────────────────────────────────────────────────────────────

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  custom_points: number | null;
  starters: string[];
  starters_points: number[];
  players: string[];
  players_points: Record<string, number>;
}

export async function fetchLeagueMatchups(
  leagueId: string,
  week: number,
): Promise<SleeperMatchup[] | null> {
  return sleeperFetch<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);
}

// ── Trending players (waivers) ─────────────────────────────────────────────

export interface TrendingPlayer {
  player_id: string;
  count: number;
}

export async function fetchTrendingPlayers(
  type: 'add' | 'drop' = 'add',
  lookbackHours = 24,
  limit = 25,
): Promise<TrendingPlayer[] | null> {
  return sleeperFetch<TrendingPlayer[]>(
    `/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`,
  );
}

/** Sleeper may not expose GET /leagues/search — returns null when unavailable or non-OK. */
export async function tryGlobalLeagueSearch(query: string): Promise<SleeperLeague[] | null> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const res = await fetch(
      `${SLEEPER_BASE}/leagues/search?query=${encodeURIComponent(trimmed)}&sport=nfl`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const raw = normalizeGlobalSearchPayload(data);
    return raw.filter(isSleeperLeagueShape);
  } catch {
    return null;
  }
}

function normalizeGlobalSearchPayload(data: unknown): SleeperLeague[] {
  if (Array.isArray(data)) return data as SleeperLeague[];
  if (data && typeof data === 'object' && Array.isArray((data as { leagues?: unknown }).leagues)) {
    return (data as { leagues: SleeperLeague[] }).leagues;
  }
  return [];
}

function isSleeperLeagueShape(x: unknown): x is SleeperLeague {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.league_id === 'string' && typeof o.name === 'string';
}

export function formatLeagueScoringLabel(settings: Record<string, number> | undefined): string {
  if (!settings || typeof settings !== 'object') return 'Unknown';
  const rec = settings.rec ?? 0;
  if (rec >= 0.9) return 'PPR';
  if (rec >= 0.4 && rec <= 0.6) return 'Half PPR';
  if (rec <= 0.05) return 'Standard';
  if (rec > 0.05 && rec < 0.4) return `Custom (${rec} rec)`;
  return `Custom (${rec} rec)`;
}

export async function filterUserLeaguesByName(
  sleeperUserId: string,
  season: string,
  nameQuery: string,
): Promise<SleeperLeague[]> {
  const all = await fetchUserLeagues(sleeperUserId, season);
  if (!all?.length) return [];
  const q = nameQuery.trim().toLowerCase();
  if (!q) return all;
  return all.filter((l) => (l.name ?? '').toLowerCase().includes(q));
}
