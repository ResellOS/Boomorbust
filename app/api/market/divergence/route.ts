import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';

const CACHE_TTL = 3600; // 1 hour

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') ?? 'ppr';
  const season = searchParams.get('season') ?? '2025';

  const cacheKey = `market:divergence:${season}:${format}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  const db = createAdminClient();

  const [{ data: draftRows }, { data: ktcRows }] = await Promise.all([
    db
      .from('draft_market_data')
      .select('player_id, pick_number')
      .eq('season', season)
      .eq('scoring_format', format),
    db
      .from('bbv_values')
      .select('player_id, player_name, position, ktc_value')
      .gt('ktc_value', 0),
  ]);

  if (!draftRows?.length || !ktcRows?.length) return NextResponse.json([]);

  // Aggregate ADP per player
  const adpAgg: Record<string, { sum: number; count: number }> = {};
  for (const row of draftRows) {
    if (!adpAgg[row.player_id]) adpAgg[row.player_id] = { sum: 0, count: 0 };
    adpAgg[row.player_id].sum += Number(row.pick_number);
    adpAgg[row.player_id].count++;
  }

  // Filter to >= 10 samples
  const qualified = Object.entries(adpAgg)
    .filter(([, v]) => v.count >= 10)
    .map(([player_id, v]) => ({ player_id, adp: v.sum / v.count, sample_size: v.count }))
    .sort((a, b) => a.adp - b.adp);

  if (!qualified.length) return NextResponse.json([]);

  // Build KTC lookup and rank map
  const ktcMap: Record<string, { player_name: string; position: string; ktc_value: number }> = {};
  for (const row of ktcRows) ktcMap[row.player_id] = row;

  const ktcSorted = [...ktcRows].sort((a, b) => b.ktc_value - a.ktc_value);
  const ktcRankMap: Record<string, number> = {};
  ktcSorted.forEach((p, i) => { ktcRankMap[p.player_id] = i + 1; });

  const totalPlayers = qualified.length;

  const results = qualified
    .filter((p) => ktcMap[p.player_id])
    .map((p) => {
      const marketRank = qualified.indexOf(p) + 1;
      const ktcRank = ktcRankMap[p.player_id] ?? marketRank;
      const divergencePct =
        Math.round((Math.abs(marketRank - ktcRank) / totalPlayers) * 1000) / 10;
      return {
        player_id: p.player_id,
        player_name: ktcMap[p.player_id].player_name,
        position: ktcMap[p.player_id].position,
        adp: Math.round(p.adp * 100) / 100,
        ktc_value: ktcMap[p.player_id].ktc_value,
        market_rank: marketRank,
        ktc_rank: ktcRank,
        divergence_pct: divergencePct,
        // positive = market sleeping on him (KTC ranks higher than ADP)
        direction: ktcRank < marketRank ? 'undervalued' : 'overvalued',
        sample_size: p.sample_size,
      };
    })
    .filter((p) => p.divergence_pct > 15)
    .sort((a, b) => b.divergence_pct - a.divergence_pct);

  if (redis) {
    try { await redis.set(cacheKey, results, { ex: CACHE_TTL }); } catch {}
  }

  return NextResponse.json(results);
}
