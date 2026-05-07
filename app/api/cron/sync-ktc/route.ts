import { NextResponse } from 'next/server';
import { getKTCValues } from '@/lib/values/ktc';
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

  const redis = getRedis();
  if (redis) {
    try { await redis.del('ktc_values'); } catch { /* proceed to re-scrape */ }
  }

  const values = await getKTCValues();
  return NextResponse.json({ warmed: values?.length ?? 0 });
}
