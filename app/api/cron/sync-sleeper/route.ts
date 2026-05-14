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
  let skipped = 0;
  let totalRostersSynced = 0;
  let totalRosterErrors = 0;
  const redis = getRedis();

  async function logError(source: string, message: string, userId: string, metadata: Record<string, unknown>) {
    try {
      await db.from('error_logs').insert({ source, message, user_id: userId, metadata });
    } catch { /* non-fatal */ }
  }

  for (const user of users) {
    const { data: profile } = await db
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .single();

    if (!profile?.sleeper_user_id) continue;

    // Skip users with no activity since last sync (offseason optimization)
    const lastSyncKey = `sync:last:${user.id}`;
    const activityKey = `sync:activity:${user.id}`;
    if (redis) {
      try {
        const [lastSync, hasActivity] = await Promise.all([
          redis.get<string>(lastSyncKey),
          redis.get<string>(activityKey),
        ]);
        if (lastSync && !hasActivity) {
          const hoursSince = (Date.now() - new Date(lastSync).getTime()) / 3600000;
          if (hoursSince < 48) {
            skipped++;
            continue;
          }
        }
      } catch { /* fall through and sync */ }
    }

    try {
      const leagues = await fetchUserLeagues(profile.sleeper_user_id, '2025');
      if (!leagues?.length) continue;

      for (const league of leagues) {
        const { error: leagueError } = await db.from('leagues').upsert({
          id: league.league_id,
          user_id: user.id,
          name: league.name,
          season: league.season,
          total_rosters: league.total_rosters,
          scoring_settings: league.scoring_settings,
          settings: league.settings,
          status: league.status,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (leagueError) {
          console.error(`[sync-sleeper] league ${league.league_id} upsert failed:`, leagueError.message);
          await logError('cron/sync-sleeper/leagues', leagueError.message, user.id, {
            league_id: league.league_id,
            code: leagueError.code,
          });
          continue;
        }

        const rosters = await fetchLeagueRosters(league.league_id);
        console.log(`[sync-sleeper] user ${user.id} league ${league.league_id}: ${rosters?.length ?? 'null'} rosters`);

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
            console.error(`[sync-sleeper] roster ${roster.roster_id} upsert failed:`, rosterError.message);
            totalRosterErrors++;
            await logError('cron/sync-sleeper/rosters', rosterError.message, user.id, {
              roster_id: roster.roster_id,
              league_id: league.league_id,
              code: rosterError.code,
            });
          } else {
            totalRostersSynced++;
          }
        }
      }

      if (redis) {
        try {
          await redis.set(`sync:last:${user.id}`, new Date().toISOString(), { ex: 604800 });
          await redis.del(`sync:activity:${user.id}`);
        } catch { /* non-fatal */ }
      }

      synced++;
    } catch (err) {
      console.error(`[sync-sleeper] failed for user ${user.id}:`, err);
      await logError('cron/sync-sleeper', String(err), user.id, {});
    }
  }

  if (redis) {
    try {
      await redis.set('metrics:pipeline:sleeper', new Date().toISOString(), { ex: 172800 });
    } catch {}
  }

  return NextResponse.json({
    synced,
    skipped,
    total: users.length,
    rosters_synced: totalRostersSynced,
    roster_errors: totalRosterErrors,
  });
}
