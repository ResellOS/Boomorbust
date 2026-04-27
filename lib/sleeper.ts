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
