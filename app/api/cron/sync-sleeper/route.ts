import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchUserLeagues, fetchLeagueRosters } from '@/lib/sleeper';
import { mergeSleeperRosterSettings } from '@/lib/sleeper/leagueCardLogo';
import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: { users } } = await db.auth.admin.listUsers();
  if (!users?.length) return NextResponse.json({ synced: 0 });

  let synced = 0;
  for (const user of users) {
    const { data: profile } = await db
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .single();

    if (!profile?.sleeper_user_id) continue;

    try {
      const leagues = await fetchUserLeagues(profile.sleeper_user_id, '2025');
      if (!leagues?.length) continue;
      for (const league of leagues) {
        await db.from('leagues').upsert({
          id: league.league_id,
          user_id: user.id,
          name: league.name,
          season: league.season,
          total_rosters: league.total_rosters,
          scoring_settings: league.scoring_settings,
          settings: league.settings,
          status: league.status,
        }, { onConflict: 'id' });

        const rosters = await fetchLeagueRosters(league.league_id);
        if (!rosters?.length) continue;
        for (const roster of rosters) {
          await db.from('rosters').upsert({
            roster_id: roster.roster_id,
            league_id: league.league_id,
            owner_id: roster.owner_id,
            players: roster.players ?? [],
            starters: roster.starters ?? [],
            settings: mergeSleeperRosterSettings(roster as unknown as Record<string, unknown>),
          }, { onConflict: 'roster_id,league_id' });
        }
      }
      synced++;
    } catch (err) {
      console.error(`sync-sleeper failed for user ${user.id}:`, err);
    }
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set('metrics:pipeline:sleeper', new Date().toISOString(), { ex: 172800 });
    } catch {}
  }

  return NextResponse.json({ synced });
}
