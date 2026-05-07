import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || typeof (body as { email?: unknown }).email !== 'string') {
    return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });
  }

  const raw = (body as { email: string }).email.trim();
  const email = raw.toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email format' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, error: 'Waitlist temporarily unavailable' }, { status: 503 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('waitlist').insert({
      email,
      source: 'boom-or-bust-page',
    });

    if (error) {
      // Unique violation — treat as success (already on list)
      if (error.code === '23505') {
        return NextResponse.json({ ok: true });
      }
      console.error('waitlist insert:', error.message);
      return NextResponse.json({ ok: false, error: 'Could not save email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('waitlist:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
