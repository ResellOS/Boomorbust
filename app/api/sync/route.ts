import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUserLeagues, fetchLeagueRosters } from '@/lib/sleeper';

export async function POST() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
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
  const leagues = await fetchUserLeagues(profile.sleeper_user_id, season);

  if (!leagues) {
    return NextResponse.json({ error: 'Failed to fetch leagues from Sleeper' }, { status: 502 });
  }

  let leaguesSynced = 0;

  for (const league of leagues) {
    const { error: leagueError } = await supabase.from('leagues').upsert({
      id: league.league_id,
      user_id: user.id,
      name: league.name,
      season: league.season,
      total_rosters: league.total_rosters,
      scoring_settings: league.scoring_settings,
      settings: league.settings,
      status: league.status,
      synced_at: new Date().toISOString(),
    });

    if (leagueError) {
      console.error(`Failed to upsert league ${league.league_id}:`, leagueError);
      continue;
    }

    leaguesSynced++;

    const rosters = await fetchLeagueRosters(league.league_id);
    if (!rosters) continue;

    for (const roster of rosters) {
      const { error: rosterError } = await supabase.from('rosters').upsert(
        {
          roster_id: roster.roster_id,
          league_id: league.league_id,
          owner_id: roster.owner_id,
          players: roster.players ?? [],
          starters: roster.starters ?? [],
          settings: roster.settings,
        },
        { onConflict: 'roster_id,league_id' }
      );

      if (rosterError) {
        console.error(`Failed to upsert roster ${roster.roster_id}:`, rosterError);
      }
    }
  }

  return NextResponse.json({ success: true, leagues_synced: leaguesSynced });
}
