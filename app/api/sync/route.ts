import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchUserLeagues, fetchLeagueFull, fetchLeagueRosters, type SleeperLeague, type SleeperLeagueFull } from '@/lib/sleeper';
import { mergeSleeperRosterSettings } from '@/lib/sleeper/leagueCardLogo';

export async function POST(req: Request) {
  // Auth check via cookie-based client (anon key)
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin client for all DB writes — bypasses RLS, prevents silent roster insert failures
  const db = createAdminClient();

  const body = await req.json().catch(() => ({})) as { league_ids?: unknown };
  const leagueIds: string[] = Array.isArray(body.league_ids)
    ? (body.league_ids as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.sleeper_user_id) {
    return NextResponse.json(
      { error: 'No Sleeper user ID found. Update your profile first.' },
      { status: 400 }
    );
  }

  const season = '2025';

  let leagues: SleeperLeague[] | null;
  if (leagueIds.length > 0) {
    const results = await Promise.all(leagueIds.map((id) => fetchLeagueFull(id)));
    leagues = results.filter((l): l is SleeperLeagueFull => l !== null);
  } else {
    leagues = await fetchUserLeagues(profile.sleeper_user_id, season);
  }

  if (!leagues) {
    return NextResponse.json({ error: 'Failed to fetch leagues from Sleeper' }, { status: 502 });
  }

  const userId = user.id;

  console.log(`[sync] user ${userId}: fetched ${leagues.length} leagues from Sleeper`);
  let leaguesSynced = 0;
  let rostersSynced = 0;
  const syncErrors: string[] = [];

  async function logError(source: string, message: string, metadata: Record<string, unknown>) {
    try {
      await db.from('error_logs').insert({ source, message, user_id: userId, metadata });
    } catch { /* non-fatal */ }
  }

  for (const league of leagues) {
    const { error: leagueError } = await db.from('leagues').upsert(
      {
        id: league.league_id,
        user_id: userId,
        name: league.name,
        season: league.season,
        total_rosters: league.total_rosters,
        scoring_settings: league.scoring_settings,
        settings: league.settings,
        status: league.status,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (leagueError) {
      const msg = `league ${league.league_id} (${league.name}): ${leagueError.message}`;
      console.error(`[sync] ${msg}`);
      syncErrors.push(msg);
      await logError('sync/leagues', msg, { league_id: league.league_id, code: leagueError.code });
      continue;
    }

    leaguesSynced++;

    // Fetch rosters and log count before any write
    const rosters = await fetchLeagueRosters(league.league_id);
    console.log(`[sync] league ${league.league_id} (${league.name}): ${rosters?.length ?? 'null'} rosters from Sleeper`);

    if (!rosters?.length) continue;

    for (const roster of rosters) {
      const { error: rosterError } = await db.from('rosters').upsert(
        {
          roster_id: roster.roster_id,
          league_id: league.league_id,
          owner_id: roster.owner_id,
          players: roster.players ?? [],
          starters: roster.starters ?? [],
          settings: mergeSleeperRosterSettings(roster as unknown as Record<string, unknown>),
        },
        { onConflict: 'roster_id,league_id' },
      );

      if (rosterError) {
        const msg = `roster ${roster.roster_id} in league ${league.league_id}: ${rosterError.message}`;
        console.error(`[sync] ${msg}`);
        syncErrors.push(msg);
        await logError('sync/rosters', msg, {
          roster_id: roster.roster_id,
          league_id: league.league_id,
          code: rosterError.code,
        });
      } else {
        rostersSynced++;
      }
    }
  }

  console.log(`[sync] done — leagues: ${leaguesSynced}, rosters: ${rostersSynced}, errors: ${syncErrors.length}`);

  return NextResponse.json({
    success: true,
    leagues_synced: leaguesSynced,
    rosters_synced: rostersSynced,
    errors: syncErrors.length > 0 ? syncErrors : undefined,
  });
}
