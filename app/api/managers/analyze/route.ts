import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { fetchLeagueRosters, fetchLeagueUsers, fetchTransactions } from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { buildManagerProfile, type ManagerProfileData } from '@/lib/managers/analyzer';

const SEASONS = ['2024', '2025'];
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export interface MgrProfileRow {
  sleeper_roster_id: number;
  sleeper_owner_id: string | null;
  display_name: string | null;
  avatar: string | null;
  trade_count: number;
  data: ManagerProfileData;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { league_id } = await request.json() as { league_id: string };
  if (!league_id) return NextResponse.json({ error: 'Missing league_id' }, { status: 400 });

  // Verify the user owns this league
  const { data: league } = await supabase.from('leagues').select('id').eq('id', league_id).eq('user_id', user.id).single();
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const redis = getRedis();
  const cacheKey = `mgr_profiles:${league_id}`;

  if (redis) {
    try {
      const cached = await redis.get<MgrProfileRow[]>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  // Fetch all transactions across both seasons in parallel
  const txPromises = SEASONS.flatMap(() =>
    WEEKS.map((week) => fetchTransactions(league_id, week).catch(() => null))
  );
  // Also fetch rosters, users, player DB, and KTC in parallel
  const [txArrays, rosters, leagueUsers, playerDb, ktcValues] = await Promise.all([
    Promise.all(txPromises),
    fetchLeagueRosters(league_id),
    fetchLeagueUsers(league_id),
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!rosters?.length || !playerDb) {
    return NextResponse.json({ error: 'Failed to fetch league data' }, { status: 502 });
  }

  const allTransactions = txArrays.flat().filter((x): x is NonNullable<typeof x> => x != null).flat();

  // Build lookup maps
  const userMap: Record<string, { display_name: string; avatar: string | null }> = {};
  for (const u of leagueUsers ?? []) {
    userMap[u.user_id] = { display_name: u.display_name, avatar: u.avatar };
  }

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  // Build profiles for every roster
  const profiles: MgrProfileRow[] = [];
  const upserts: object[] = [];

  for (const roster of rosters) {
    const playerIds = roster.players ?? [];
    const profile = buildManagerProfile(
      roster.roster_id,
      playerIds as string[],
      allTransactions,
      playerDb,
      ktcMap
    );

    const ownerInfo = roster.owner_id ? (userMap[roster.owner_id] ?? null) : null;

    const row: MgrProfileRow = {
      sleeper_roster_id: roster.roster_id,
      sleeper_owner_id: roster.owner_id,
      display_name: ownerInfo?.display_name ?? null,
      avatar: ownerInfo?.avatar ?? null,
      trade_count: profile.trade_count,
      data: profile,
    };

    profiles.push(row);

    upserts.push({
      user_id: user.id,
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

  // Upsert all profiles
  await supabase.from('manager_profiles').upsert(upserts, {
    onConflict: 'league_id,sleeper_roster_id',
  });

  if (redis) {
    try { await redis.set(cacheKey, profiles, { ex: 86400 }); } catch {}
  }

  return NextResponse.json(profiles);
}
