import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

/** Full profile payload for admin modal */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const db = createAdminClient();
  const [{ data: profile }, { data: au, error: auErr }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).maybeSingle(),
    db.auth.admin.getUserById(id),
  ]);

  if (auErr) {
    return NextResponse.json({ error: auErr.message }, { status: 404 });
  }

  return NextResponse.json({
    email: au.user?.email ?? null,
    created_at_auth: au.user?.created_at ?? null,
    profile: profile ?? null,
  });
}
