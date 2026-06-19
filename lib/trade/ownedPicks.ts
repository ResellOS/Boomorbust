import {
  fetchLeagueRosters,
  fetchLeagueUsers,
  fetchTradedPicks,
  type SleeperRoster,
  type TradedPick,
} from '@/lib/sleeper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OwnedPick } from './types';

export const pickRoundOrdinal = (r: number): string =>
  r === 1 ? '1st' : r === 2 ? '2nd' : r === 3 ? '3rd' : `${r}th`;

export function defaultTargetSeasons(): string[] {
  const baseYear = new Date().getFullYear();
  return [String(baseYear + 1), String(baseYear + 2)];
}

/** Pure builder — same logic as Trade Calculator "You Give" pick dropdown. */
export function buildOwnedPicksFromTradedData(
  leagueId: string,
  myRosterId: number,
  rosters: SleeperRoster[] | null,
  tradedPicks: TradedPick[] | null,
  userDisplay: Map<string, string>,
  targetSeasons: string[] = defaultTargetSeasons(),
): OwnedPick[] {
  const rosterTeam = new Map<number, string>();
  for (const r of rosters ?? []) {
    rosterTeam.set(r.roster_id, userDisplay.get(r.owner_id ?? '') ?? `Team ${r.roster_id}`);
  }

  const tradedMap = new Map<string, number>();
  for (const tp of tradedPicks ?? []) {
    tradedMap.set(`${tp.season}-${tp.round}-${tp.roster_id}`, tp.owner_id);
  }

  const picks: OwnedPick[] = [];

  for (const season of targetSeasons) {
    for (let round = 1; round <= 4; round++) {
      const cur: number = tradedMap.get(`${season}-${round}-${myRosterId}`) ?? myRosterId;
      if (cur === myRosterId) {
        picks.push({
          label: `${season} ${pickRoundOrdinal(round)} (own)`,
          season,
          round,
          leagueId,
        });
      }
    }
  }

  for (const tp of tradedPicks ?? []) {
    if (tp.owner_id !== myRosterId || tp.roster_id === myRosterId) continue;
    if (!targetSeasons.includes(tp.season)) continue;
    const team = rosterTeam.get(tp.roster_id) ?? `Team ${tp.roster_id}`;
    picks.push({
      label: `${tp.season} ${pickRoundOrdinal(tp.round)} (via ${team})`,
      season: tp.season,
      round: tp.round,
      leagueId,
    });
  }

  picks.sort((a, b) => a.season.localeCompare(b.season) || a.round - b.round);
  return picks;
}

export async function fetchOwnedPicksForLeague(
  leagueId: string,
  myRosterId: number,
  targetSeasons: string[] = defaultTargetSeasons(),
): Promise<OwnedPick[]> {
  const [users, rosters, tradedPicks] = await Promise.all([
    fetchLeagueUsers(leagueId).catch(() => []),
    fetchLeagueRosters(leagueId).catch(() => null),
    fetchTradedPicks(leagueId).catch(() => null),
  ]);

  const userDisplay = new Map<string, string>();
  for (const u of users ?? []) {
    userDisplay.set(u.user_id, u.display_name ?? u.username ?? 'Team');
  }

  return buildOwnedPicksFromTradedData(
    leagueId,
    myRosterId,
    rosters,
    tradedPicks,
    userDisplay,
    targetSeasons,
  );
}

export async function fetchRosterByLeagueForUser(
  supabase: SupabaseClient,
  sleeperUserId: string,
): Promise<Map<string, { roster_id: number }>> {
  const rosterByLeague = new Map<string, { roster_id: number }>();
  const { data, error } = await supabase
    .from('rosters')
    .select('league_id, roster_id, owner_id')
    .eq('owner_id', sleeperUserId);

  if (error) throw error;

  for (const row of data ?? []) {
    rosterByLeague.set(row.league_id as string, {
      roster_id: row.roster_id as number,
    });
  }

  return rosterByLeague;
}

export async function fetchOwnedPicksByLeague(
  leagues: { id: string }[],
  rosterByLeague: Map<string, { roster_id: number }>,
  targetSeasons: string[] = defaultTargetSeasons(),
): Promise<Record<string, OwnedPick[]>> {
  const ownedPicksByLeague: Record<string, OwnedPick[]> = {};

  for (const lg of leagues.slice(0, 15)) {
    const myRosterId = rosterByLeague.get(lg.id)?.roster_id;
    if (myRosterId == null) continue;
    ownedPicksByLeague[lg.id] = await fetchOwnedPicksForLeague(lg.id, myRosterId, targetSeasons);
  }

  return ownedPicksByLeague;
}

/** Round color tokens for Draft Capital display. */
export function pickRoundColor(round: number): string {
  if (round === 1) return '#36E7A1';
  if (round === 2) return '#60a5fa';
  if (round === 3) return '#FBBF24';
  return '#6b7a99';
}

export function pickOwnershipSuffix(label: string): string {
  if (label.includes('(own)')) return '(own)';
  const via = label.match(/\(via (.+)\)$/);
  return via ? `(via ${via[1]})` : '';
}

export function pickDisplayTitle(season: string, round: number): string {
  return `${season} ${pickRoundOrdinal(round)} Round`;
}

export interface DraftCapitalStats {
  total: number;
  first: number;
  second: number;
  third: number;
  fourthPlus: number;
}

export function computeDraftCapitalStats(picks: OwnedPick[]): DraftCapitalStats {
  return picks.reduce<DraftCapitalStats>(
    (acc, p) => {
      acc.total += 1;
      if (p.round === 1) acc.first += 1;
      else if (p.round === 2) acc.second += 1;
      else if (p.round === 3) acc.third += 1;
      else acc.fourthPlus += 1;
      return acc;
    },
    { total: 0, first: 0, second: 0, third: 0, fourthPlus: 0 },
  );
}

export interface LeagueDraftCapitalGroup {
  leagueId: string;
  leagueName: string;
  seasons: {
    season: string;
    rounds: {
      round: number;
      picks: OwnedPick[];
    }[];
  }[];
}

export function groupDraftCapitalByLeague(
  leagues: { id: string; name: string }[],
  ownedPicksByLeague: Record<string, OwnedPick[]>,
): LeagueDraftCapitalGroup[] {
  return leagues
    .map((lg) => {
      const picks = ownedPicksByLeague[lg.id] ?? [];
      if (picks.length === 0) return null;

      const seasonMap = new Map<string, Map<number, OwnedPick[]>>();
      for (const pick of picks) {
        if (!seasonMap.has(pick.season)) seasonMap.set(pick.season, new Map());
        const roundMap = seasonMap.get(pick.season)!;
        if (!roundMap.has(pick.round)) roundMap.set(pick.round, []);
        roundMap.get(pick.round)!.push(pick);
      }

      const seasons = Array.from(seasonMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([season, roundMap]) => ({
          season,
          rounds: Array.from(roundMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundPicks]) => ({ round, picks: roundPicks })),
        }));

      return { leagueId: lg.id, leagueName: lg.name, seasons };
    })
    .filter((g): g is LeagueDraftCapitalGroup => g != null);
}
