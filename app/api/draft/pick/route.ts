import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/draft/pick — logs a single pick (user or CPU) to draft_picks.
export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[draft/pick] getUser failed:', err);
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    sessionId = null,
    overall,
    round,
    slot,
    isUser = false,
    playerId,
    playerName,
    position,
    tfoScore,
    bobRank,
    marketRank,
    followedBob,
    scoringContext = 'dynasty',
  } = body ?? {};

  if (!sessionId || overall == null) {
    // No session to attach to — nothing to persist, not an error.
    return NextResponse.json({ ok: false, skipped: true });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('draft_picks').insert({
      session_id: sessionId,
      user_id: userId,
      overall,
      round,
      slot,
      is_user: isUser,
      player_id: playerId ?? null,
      player_name: playerName ?? null,
      position: position ?? null,
      tfo_score: tfoScore ?? null,
      bob_rank: bobRank ?? null,
      market_rank: marketRank ?? null,
      followed_bob: followedBob ?? null,
      scoring_context: scoringContext,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[draft/pick] insert failed:', err);
    return NextResponse.json({ ok: false });
  }
}
