import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchNflState,
  fetchLeagueMatchups,
  type SleeperMatchup,
} from '@/lib/sleeper';

export interface EmpireTickerResult {
  week: number;
  season: string;
  winning: number;
  total: number;
}

/**
 * Lightweight empire matchup summary for the nav ticker (no player DB / KTC).
 */
export async function getEmpireTicker(
  supabase: SupabaseClient,
  userId: string,
): Promise<EmpireTickerResult | null> {
  const [{ data: profile }, { data: leagueRows }] = await Promise.all([
    supabase.from('profiles').select('sleeper_user_id').eq('id', userId).maybeSingle(),
    supabase
      .from('leagues')
      .select('id, name, season')
      .eq('user_id', userId)
      .order('season', { ascending: false }),
  ]);

  const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
  const leagues = leagueRows ?? [];
  if (!leagues.length || !ownerSid) return null;

  const state = await fetchNflState();
  const liveSeason = state?.season ?? leagues[0]!.season;
  const liveWeek = Math.max(1, Math.min(18, state?.week ?? state?.display_week ?? 18));

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('league_id, roster_id, owner_id')
    .in(
      'league_id',
      leagues.map((l) => l.id),
    );

  const userRosterByLeague: Record<string, number> = {};
  for (const row of rosterRows ?? []) {
    if (String(row.owner_id) !== ownerSid) continue;
    userRosterByLeague[row.league_id] = row.roster_id as number;
  }

  let winning = 0;
  let total = 0;

  await Promise.all(
    leagues.map(async (lg) => {
      const rid = userRosterByLeague[lg.id];
      if (rid === undefined) return;
      const matchups = (await fetchLeagueMatchups(lg.id, liveWeek)) ?? [];
      const mine = matchups.find((m: SleeperMatchup) => m.roster_id === rid);
      if (!mine) return;
      const opp = matchups.find(
        (m: SleeperMatchup) =>
          m.matchup_id === mine.matchup_id && m.roster_id !== mine.roster_id,
      );
      if (!opp) return;
      total++;
      if ((mine.points ?? 0) > (opp.points ?? 0)) winning++;
    }),
  );

  return {
    week: liveWeek,
    season: liveSeason != null ? String(liveSeason) : '',
    winning,
    total,
  };
}
