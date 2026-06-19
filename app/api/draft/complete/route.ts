import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/draft/complete — marks a session finished and stores its grade.
export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[draft/complete] getUser failed:', err);
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sessionId = null, grade = null, avgTfo = null, agreementRate = null, draftName = null } =
    body ?? {};

  if (!sessionId) return NextResponse.json({ ok: false, skipped: true });

  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('draft_sessions')
      .select('config')
      .eq('id', sessionId)
      .maybeSingle();
    const prevConfig = (existing?.config ?? {}) as Record<string, unknown>;
    const { error } = await supabase
      .from('draft_sessions')
      .update({
        status: 'completed',
        grade,
        avg_tfo: avgTfo,
        agreement_rate: agreementRate,
        completed_at: new Date().toISOString(),
        config: { ...prevConfig, draftName: draftName ?? prevConfig.draftName },
      })
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[draft/complete] update failed:', err);
    return NextResponse.json({ ok: false });
  }
}
