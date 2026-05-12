import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUpstashRedis } from '@/lib/upstash';

export const dynamic = 'force-dynamic';

const COUNT_CACHE_KEY = 'waitlist:count:v1';
const CACHE_TTL_SEC = 300;

export async function GET() {
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const cached = await redis.get<number | string>(COUNT_CACHE_KEY);
      if (cached != null) {
        const parsed = typeof cached === 'number' ? cached : parseInt(String(cached), 10);
        if (Number.isFinite(parsed)) {
          return NextResponse.json({ count: parsed });
        }
      }
    } catch {
      /* fall through */
    }
  }

  const admin = createAdminClient();
  const { count, error } = await admin.from('waitlist').select('*', { count: 'exact', head: true });

  if (error) {
    console.error('waitlist count:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const n = count ?? 0;

  if (redis) {
    try {
      await redis.set(COUNT_CACHE_KEY, n, { ex: CACHE_TTL_SEC });
    } catch {
      /* ignore cache failures */
    }
  }

  return NextResponse.json({ count: n });
}
