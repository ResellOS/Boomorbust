import { NextResponse } from 'next/server';
import { gradeAllProspects } from '@/lib/rookies/grades';
import { Redis } from '@upstash/redis';

const CACHE_KEY = 'rookies:grades:2025';
const TTL = 86400; // 24 hours

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const grades = await gradeAllProspects();

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(CACHE_KEY, grades, { ex: TTL });
    } catch {}
  }

  return NextResponse.json({ ok: true, count: grades.length });
}
