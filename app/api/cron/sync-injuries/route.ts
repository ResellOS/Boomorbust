import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { scanAllRosterInjuries } from '@/lib/injuries/broadcaster';
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
  if (!users?.length) return NextResponse.json({ alerts: 0 });

  let totalAlerts = 0;

  for (const user of users) {
    const { data: leagues } = await db
      .from('leagues')
      .select('id, name')
      .eq('user_id', user.id);

    if (!leagues?.length) continue;

    const rosterResults = await Promise.all(
      leagues.map(async (lg) => {
        const { data } = await db
          .from('rosters')
          .select('roster_id, players, starters')
          .eq('league_id', lg.id)
          .single();
        return {
          league_id: lg.id,
          league_name: lg.name,
          roster_id: data?.roster_id ?? 0,
          players: (data?.players ?? []) as string[],
          starters: (data?.starters ?? []) as string[],
        };
      })
    );

    const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players)));
    const [playerData, ktcValues] = await Promise.all([
      getPlayersByIds(allIds),
      getKTCValues(),
    ]);

    const ktcMap: Record<string, number> = {};
    for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

    const alerts = scanAllRosterInjuries(rosterResults, playerData, ktcMap);
    totalAlerts += alerts.length;
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set('metrics:pipeline:injuries', new Date().toISOString(), { ex: 172800 });
    } catch {}
  }

  return NextResponse.json({ alerts: totalAlerts });
}
