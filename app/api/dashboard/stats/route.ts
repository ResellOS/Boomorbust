import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  leagues: number;
  playersRostered: number;
  tradeOffers: number;
  /** Per-matchup average points edge (your score − opp score). Null until snapshot is cached. */
  treEdge: number | null;
  /** Win probability this week, 0–100. Null until snapshot is cached. */
  winProbability: number | null;
}

// Minimal slice we care about from the snapshot cache
interface SnapshotEmpireSlice {
  empire?: {
    score?: number;
    oppScore?: number;
    winning?: number;
    total?: number;
    winProbability?: number;
    leaguesCount?: number;
    activeTrades?: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 1. Try the snapshot Redis cache first ──────────────────────────────────
  // The heavy snapshot route caches at this key for 5 min. When warm we get
  // all five stats in < 5 ms without touching Sleeper or Supabase.
  const redis = getRedis();
  const snapshotKey = `dashboard:snapshot:v8:${user.id}`;
  let cached: SnapshotEmpireSlice | null = null;
  if (redis) {
    try {
      cached = await redis.get<SnapshotEmpireSlice>(snapshotKey);
    } catch { /* non-fatal */ }
  }

  if (cached?.empire) {
    const e = cached.empire;
    const treEdge =
      e.total && e.total > 0 && e.score != null && e.oppScore != null
        ? Math.round(((e.score - e.oppScore) / e.total) * 10) / 10
        : null;

    const stats: DashboardStats = {
      leagues:         e.leaguesCount ?? 0,
      playersRostered: 0, // filled below from DB (not in snapshot)
      tradeOffers:     e.activeTrades ?? 0,
      treEdge,
      winProbability:  e.winProbability ?? null,
    };

    // Still pull the player count from DB (fast single query)
    stats.playersRostered = await countDistinctPlayers(supabase, user.id);

    return NextResponse.json(stats);
  }

  // ── 2. Cold path: lightweight DB-only queries ──────────────────────────────
  const [leagueCount, playersRostered] = await Promise.all([
    countLeagues(supabase, user.id),
    countDistinctPlayers(supabase, user.id),
  ]);

  const stats: DashboardStats = {
    leagues:         leagueCount,
    playersRostered,
    tradeOffers:     0,   // needs snapshot cache — will show real value on next load
    treEdge:         null, // needs matchup data from snapshot
    winProbability:  null, // needs matchup data from snapshot
  };

  return NextResponse.json(stats);
}

// ─── Sub-queries ──────────────────────────────────────────────────────────────

async function countLeagues(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('leagues')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

async function countDistinctPlayers(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  // Get the user's Sleeper owner ID to filter rosters correctly
  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
  if (!ownerSid) return 0;

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('user_id', userId);
  if (!leagues?.length) return 0;

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('players')
    .in('league_id', leagues.map((l) => l.id))
    .eq('owner_id', ownerSid);

  const seen = new Set<string>();
  for (const row of rosterRows ?? []) {
    for (const pid of (row.players as string[] | null) ?? []) {
      seen.add(pid);
    }
  }
  return seen.size;
}
