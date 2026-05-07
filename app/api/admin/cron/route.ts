import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const JOBS = {
  'sync-ktc': '/api/cron/sync-ktc',
  'sync-sleeper': '/api/cron/sync-sleeper',
  'calculate-bbv': '/api/cron/calculate-bbv',
} as const;

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let job: keyof typeof JOBS;
  try {
    const body = await request.json();
    if (!body?.job || !(body.job in JOBS)) {
      return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
    }
    job = body.job as keyof typeof JOBS;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const path = JOBS[job];
  try {
    const res = await fetch(`${origin}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? res.statusText, details: data },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }
    return NextResponse.json({ ok: true, job, ...data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
