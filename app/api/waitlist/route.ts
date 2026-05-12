import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUpstashRedis } from '@/lib/upstash';

export const dynamic = 'force-dynamic';

const COUNT_CACHE_KEY = 'waitlist:count:v1';

function normalizeEmail(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!s || s.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = normalizeEmail((body as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('waitlist').insert({
    email,
    source: typeof (body as { source?: unknown }).source === 'string'
      ? String((body as { source: string }).source).slice(0, 120)
      : 'auth-signup-coming-soon',
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('waitlist insert:', error);
    return NextResponse.json({ error: 'Could not save email' }, { status: 500 });
  }

  const redis = getUpstashRedis();
  if (redis) await redis.del(COUNT_CACHE_KEY).catch(() => {});

  return NextResponse.json({ ok: true });
}
