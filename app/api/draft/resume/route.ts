import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DraftPickRecord } from '@/lib/draft/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: session, error } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const { data: pickRows } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('session_id', id)
      .order('overall', { ascending: true });

    const config = (session.config ?? {}) as Record<string, unknown>;
    const picks: DraftPickRecord[] = (pickRows ?? []).map((r) => ({
      overall: r.overall,
      round: r.round,
      slot: r.slot,
      isUser: r.is_user,
      player: {
        playerId: r.player_id ?? '',
        name: r.player_name ?? 'Unknown',
        position: r.position ?? '—',
        team: '—',
        age: null,
        tfoScore: Number(r.tfo_score) || 0,
        verdict: 'NEUTRAL',
        bobRank: r.bob_rank ?? 999,
        marketRank: r.market_rank ?? 999,
        adp: r.market_rank ?? 999,
      },
      bobTopRank: r.bob_rank ?? 999,
      followedBob: r.followed_bob ?? false,
    }));

    return NextResponse.json({ config, picks, sessionId: id });
  } catch (err) {
    console.error('[draft/resume]', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
