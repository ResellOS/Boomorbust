import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';
import { getPlayersByIds } from '@/lib/sleeper/players';

const CACHE_TTL = 86400; // 24 hours

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const season = searchParams.get('season') ?? '2025';
  const type = searchParams.get('type') ?? 'startup';
  const format = searchParams.get('format') ?? 'ppr';

  const cacheKey = `adp:${season}:${type}:${format}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('draft_market_data')
    .select('player_id, pick_number')
    .eq('season', season)
    .eq('draft_type', type)
    .eq('scoring_format', format);

  if (error || !data?.length) return NextResponse.json([]);

  // Aggregate pick_numbers per player
  const agg: Record<string, number[]> = {};
  for (const row of data) {
    if (!agg[row.player_id]) agg[row.player_id] = [];
    agg[row.player_id].push(Number(row.pick_number));
  }

  const playerIds = Object.keys(agg);
  const playerData = await getPlayersByIds(playerIds);

  const results = playerIds
    .map((playerId) => {
      const picks = agg[playerId].sort((a, b) => a - b);
      const adp = picks.reduce((s, p) => s + p, 0) / picks.length;
      const player = playerData[playerId];
      return {
        player_id: playerId,
        player_name: player?.full_name ?? playerId,
        position: player?.position ?? 'UNK',
        adp: Math.round(adp * 100) / 100,
        sample_size: picks.length,
        min_pick: picks[0],
        max_pick: picks[picks.length - 1],
      };
    })
    .sort((a, b) => a.adp - b.adp);

  if (redis) {
    try { await redis.set(cacheKey, results, { ex: CACHE_TTL }); } catch {}
  }

  return NextResponse.json(results);
}
