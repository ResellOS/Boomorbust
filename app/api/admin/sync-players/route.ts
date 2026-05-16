import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { seedPlayers } from '@/lib/sleeper/seedPlayers';
import { Redis } from '@upstash/redis';

export const maxDuration = 120;

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

/** Admin GET: seed all players from Sleeper into the players table. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = createAdminClient();
  const start = Date.now();

  const result = await seedPlayers();

  // Log progress summary to error_logs
  await db.from('error_logs').insert({
    source: 'seed-progress',
    message: `Seed complete: ${result.upserted}/${result.count} players in ${Date.now() - start}ms`,
    user_id: user?.id ?? null,
    metadata: { upserted: result.upserted, skipped: result.skipped, errors: result.errors },
  });

  return NextResponse.json({
    ok: result.errors.length === 0,
    upserted: result.upserted,
    skipped: result.skipped,
    total: result.count,
    duration: Date.now() - start,
    errors: result.errors.slice(0, 5),
  });
}

/** Admin POST: clear Redis player cache. */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const redis = getRedis();
  if (redis) {
    try {
      await redis.del('sleeper:players:nfl');
    } catch (e) {
      return NextResponse.json({ message: `✗ Redis error: ${String(e)}` }, { status: 500 });
    }
  }

  return NextResponse.json({ message: '✓ Player DB cache cleared — next request will re-fetch from Sleeper' });
}
