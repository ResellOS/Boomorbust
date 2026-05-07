import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';

const CACHE_KEY = 'bbv_all';
const CACHE_TTL = 600; // 10 minutes — BBV updates weekly

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({});
  if (ids === 'all' || ids === '*') {
    const redis = getRedis();
    let allBbv: Record<string, number> | null = null;
    if (redis) {
      try {
        allBbv = await redis.get<Record<string, number>>(CACHE_KEY);
      } catch {
        /* fall through */
      }
    }
    if (!allBbv) {
      const db = createAdminClient();
      const { data, error } = await db.from('bbv_values').select('player_id, bbv_score');
      if (error || !data) return NextResponse.json({});
      allBbv = {};
      for (const row of data) allBbv[row.player_id] = row.bbv_score;
      if (redis) {
        try {
          await redis.set(CACHE_KEY, allBbv, { ex: CACHE_TTL });
        } catch {
          /* non-fatal */
        }
      }
    }
    return NextResponse.json(allBbv);
  }

  const playerIds = new Set(ids.split(',').filter(Boolean).slice(0, 200));
  const redis = getRedis();

  let allBbv: Record<string, number> | null = null;

  if (redis) {
    try {
      allBbv = await redis.get<Record<string, number>>(CACHE_KEY);
    } catch { /* fall through to DB */ }
  }

  if (!allBbv) {
    const db = createAdminClient();
    const { data, error } = await db.from('bbv_values').select('player_id, bbv_score');
    if (error || !data) return NextResponse.json({});

    allBbv = {};
    for (const row of data) allBbv[row.player_id] = row.bbv_score;

    if (redis) {
      try { await redis.set(CACHE_KEY, allBbv, { ex: CACHE_TTL }); } catch { /* non-fatal */ }
    }
  }

  const result: Record<string, number> = {};
  for (const id of Array.from(playerIds)) {
    if (allBbv[id] !== undefined) result[id] = allBbv[id];
  }

  return NextResponse.json(result);
}
