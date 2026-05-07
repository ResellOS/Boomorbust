import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueRosters, fetchLeagueUsers, fetchTransactions } from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { buildManagerProfile } from '@/lib/managers/analyzer';
import { Redis } from '@upstash/redis';

const SEASONS = ['2024', '2025'];
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const ACTIVE_WINDOW_DAYS = 7;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 86400 * 1000).toISOString();

  // Find all active users (updated in last 7 days)
  const { data: activeProfiles } = await db
    .from('profiles')
    .select('id')
    .gte('updated_at', cutoff);

  if (!activeProfiles?.length) return NextResponse.json({ analyzed: 0 });

  const [playerDb, ktcValues] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!playerDb) return NextResponse.json({ error: 'Player DB unavailable' }, { status: 502 });

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  const redis = getRedis();
  let analyzed = 0;

  for (const { id: userId } of activeProfiles) {
    const { data: leagues } = await db.from('leagues').select('id').eq('user_id', userId);
    if (!leagues?.length) continue;

    for (const { id: league_id } of leagues) {
      try {
        const txPromises = SEASONS.flatMap(() =>
          WEEKS.map((week) => fetchTransactions(league_id, week).catch(() => null))
        );

        const [txArrays, rosters, leagueUsers] = await Promise.all([
          Promise.all(txPromises),
          fetchLeagueRosters(league_id),
          fetchLeagueUsers(league_id),
        ]);

        if (!rosters?.length) continue;

        const allTransactions = txArrays.flat().filter((x): x is NonNullable<typeof x> => x != null).flat();

        const userMap: Record<string, { display_name: string; avatar: string | null }> = {};
        for (const u of leagueUsers ?? []) {
          userMap[u.user_id] = { display_name: u.display_name, avatar: u.avatar };
        }

        const upserts: object[] = [];
        for (const roster of rosters) {
          const playerIds = (roster.players ?? []) as string[];
          const profile = buildManagerProfile(roster.roster_id, playerIds, allTransactions, playerDb, ktcMap);
          const ownerInfo = roster.owner_id ? (userMap[roster.owner_id] ?? null) : null;

          upserts.push({
            user_id: userId,
            league_id,
            sleeper_roster_id: roster.roster_id,
            sleeper_owner_id: roster.owner_id,
            display_name: ownerInfo?.display_name ?? null,
            avatar: ownerInfo?.avatar ?? null,
            trade_count: profile.trade_count,
            data: profile,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        await db.from('manager_profiles').upsert(upserts, { onConflict: 'league_id,sleeper_roster_id' });

        if (redis) {
          try { await redis.del(`mgr_profiles:${league_id}`); } catch {}
        }

        analyzed++;
      } catch (err) {
        console.error(`Manager profile sync failed for league ${league_id}:`, err);
      }
    }
  }

  return NextResponse.json({ analyzed });
}
