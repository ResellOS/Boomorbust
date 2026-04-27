import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const redis = getRedis();
  if (!redis) return NextResponse.json({ message: '✓ No Redis configured — nothing to clear' });

  try {
    // Clear all known cache keys
    const keys = ['ktc_values', 'sleeper_players'];
    await Promise.all(keys.map((k) => redis.del(k)));
    return NextResponse.json({ message: `✓ Cleared ${keys.length} cache keys (ktc_values, sleeper_players)` });
  } catch (e) {
    return NextResponse.json({ message: `✗ Redis error: ${String(e)}` }, { status: 500 });
  }
}
