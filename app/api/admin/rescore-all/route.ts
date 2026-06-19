import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rescoreAllPlayers } from '@/lib/formula/rescoreAll';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function isAdmin(email: string | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  return Boolean(admin && email === admin);
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const result = await rescoreAllPlayers();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Rescore failed' },
      { status: 500 },
    );
  }
}
