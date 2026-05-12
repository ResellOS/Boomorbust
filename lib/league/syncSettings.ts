/**
 * League settings sync — fetches Sleeper league data and upserts
 * into league_settings, including contention window and roster needs.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getLeagueScoringContext } from '@/lib/scoring/context';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeagueSettingsRow {
  league_id: string;
  owner_id: string;
  league_name: string | null;
  scoring_type: string;
  ppr: number;
  tep: number;
  superflex: boolean;
  roster_size: number;
  team_count: number;
  contention_window_start: number | null;
  contention_window_end: number | null;
  roster_needs: string[];
  updated_at: string;
}

interface SleeperRoster {
  owner_id: string;
  players: string[] | null;
  settings?: { wins?: number; losses?: number };
}

// ─── Contention window detector ───────────────────────────────────────────────
// Evaluates avg KTC of a roster to determine if team is in a win-now window.

async function detectContentionWindow(
  playerIds: string[],
): Promise<{ start: number | null; end: number | null }> {
  if (!playerIds.length) return { start: null, end: null };

  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear();

  const { data: players } = await supabase
    .from('bbv_values')
    .select('player_id, age, position, ktc_value')
    .in('player_id', playerIds);

  if (!players || players.length === 0) return { start: null, end: null };

  const rows = players as Array<{ age: number; position: string; ktc_value: number }>;

  // Weighted avg KTC for skill positions only
  const skillPlayers = rows.filter(p => ['QB', 'RB', 'WR', 'TE'].includes(p.position));
  if (!skillPlayers.length) return { start: null, end: null };

  const avgKtc = skillPlayers.reduce((s, p) => s + p.ktc_value, 0) / skillPlayers.length;
  const avgAge = skillPlayers.reduce((s, p) => s + p.age, 0) / skillPlayers.length;

  // High KTC + older core = win-now window
  if (avgKtc >= 5000 && avgAge >= 27) {
    return { start: currentYear, end: currentYear + 2 };
  }
  // Young, high KTC = ascending team
  if (avgKtc >= 5000 && avgAge < 27) {
    return { start: currentYear + 1, end: currentYear + 4 };
  }
  // Low KTC = rebuild
  if (avgKtc < 3000) {
    return { start: currentYear + 2, end: currentYear + 5 };
  }

  return { start: currentYear, end: currentYear + 3 };
}

// ─── Roster needs detector ────────────────────────────────────────────────────

async function detectRosterNeeds(
  playerIds: string[],
  starterSlots: Record<string, number>,
): Promise<string[]> {
  if (!playerIds.length) return [];

  const supabase = createAdminClient();
  const { data: players } = await supabase
    .from('bbv_values')
    .select('position, ktc_value')
    .in('player_id', playerIds);

  if (!players) return [];

  const rows = players as Array<{ position: string; ktc_value: number }>;
  const byPos: Record<string, number[]> = { QB: [], RB: [], WR: [], TE: [] };

  for (const p of rows) {
    const pos = p.position?.toUpperCase();
    if (byPos[pos]) byPos[pos].push(p.ktc_value);
  }

  const needs: string[] = [];
  const targets: Record<string, number> = {
    QB: starterSlots['QB'] ?? 1,
    RB: (starterSlots['RB'] ?? 2) + 1,
    WR: (starterSlots['WR'] ?? 2) + 1,
    TE: starterSlots['TE'] ?? 1,
  };

  for (const [pos, target] of Object.entries(targets)) {
    const starters = byPos[pos]?.sort((a, b) => b - a).slice(0, target) ?? [];
    if (starters.length < target) needs.push(pos);
    else if (starters[starters.length - 1] < 3000) needs.push(pos);
  }

  return needs;
}

// ─── syncLeagueSettings ───────────────────────────────────────────────────────

export async function syncLeagueSettings(
  leagueId: string,
  ownerId: string,
): Promise<LeagueSettingsRow | null> {
  const supabase = createAdminClient();

  // Get scoring context (fetches from Sleeper, persists to league_settings)
  const ctx = await getLeagueScoringContext(leagueId);

  // Fetch roster for this owner
  let playerIds: string[] = [];
  try {
    const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
    if (res.ok) {
      const rosters = (await res.json()) as SleeperRoster[];
      const ownerRoster = rosters.find(r => r.owner_id === ownerId);
      playerIds = ownerRoster?.players ?? [];
    }
  } catch {
    // Fallback to DB roster
    const { data: rosterRow } = await supabase
      .from('rosters')
      .select('players')
      .eq('league_id', leagueId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    playerIds = (rosterRow as { players?: string[] | null } | null)?.players ?? [];
  }

  const [contentionWindow, rosterNeeds] = await Promise.all([
    detectContentionWindow(playerIds),
    detectRosterNeeds(playerIds, ctx.starter_slots),
  ]);

  // Fetch league name from Sleeper
  let leagueName: string | null = null;
  try {
    const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
    if (res.ok) {
      const data = (await res.json()) as { name?: string };
      leagueName = data.name ?? null;
    }
  } catch {
    // Non-fatal
  }

  const now = new Date().toISOString();
  const row: LeagueSettingsRow = {
    league_id: leagueId,
    owner_id: ownerId,
    league_name: leagueName,
    scoring_type: ctx.scoring_type,
    ppr: ctx.ppr,
    tep: ctx.tep,
    superflex: ctx.superflex,
    roster_size: ctx.roster_size,
    team_count: ctx.team_count,
    contention_window_start: contentionWindow.start,
    contention_window_end: contentionWindow.end,
    roster_needs: rosterNeeds,
    updated_at: now,
  };

  await supabase.from('league_settings').upsert(row, { onConflict: 'league_id,owner_id' });

  return row;
}

// ─── syncAllLeagues ───────────────────────────────────────────────────────────

export async function syncAllLeagues(
  ownerId: string,
  sleeperUserId: string,
): Promise<LeagueSettingsRow[]> {
  let leagueIds: string[] = [];

  try {
    const season = new Date().getFullYear();
    const res = await fetch(
      `https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${season}`,
    );
    if (res.ok) {
      const leagues = (await res.json()) as Array<{ league_id: string }>;
      leagueIds = leagues.map(l => l.league_id);
    }
  } catch {
    // Can't fetch leagues without a valid sleeper user ID
  }

  const results: LeagueSettingsRow[] = [];
  for (const leagueId of leagueIds) {
    try {
      const row = await syncLeagueSettings(leagueId, ownerId);
      if (row) results.push(row);
    } catch {
      // Skip individual failures
    }
  }
  return results;
}
