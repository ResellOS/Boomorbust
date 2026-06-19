import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/draft/start — opens a draft session, returns its id (or null if the
// draft_sessions table isn't present yet; the room still runs locally).
export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[draft/start] getUser failed:', err);
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    draftType = 'startup',
    draftName = 'Mock Draft',
    teams = 12,
    rounds = 5,
    scoring = 'ppr',
    superflex = false,
    yourPick = 1,
    scoringContext = 'dynasty',
    draftOrderType,
    pickTimer,
    cpuAutopick,
    playerPool,
    thirdRoundReversal,
    showTeamNames,
    rosterSlots,
    teamOrder,
  } = body ?? {};

  const config = {
    draftName,
    draftOrderType,
    pickTimer,
    cpuAutopick,
    playerPool,
    thirdRoundReversal,
    showTeamNames,
    rosterSlots,
    teamOrder,
    scoringContext,
    pickCount: 0,
  };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('draft_sessions')
      .insert({
        user_id: userId,
        draft_type: draftType,
        teams,
        rounds,
        scoring,
        superflex,
        your_pick: yourPick,
        status: 'in_progress',
        config,
      })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json({ sessionId: data?.id ?? null });
  } catch (err) {
    console.error('[draft/start] session insert failed:', err);
    // Degrade gracefully — the room continues without DB-backed logging.
    return NextResponse.json({ sessionId: null });
  }
}
