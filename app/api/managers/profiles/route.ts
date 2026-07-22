import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/managers/profiles?leagueId= — GM/manager archetype profiles for a
// league. Reads the shared `manager_profiles` table (populated by the engine's
// League Intelligence sync — currently ~294 rows). Returns {count, profiles}.
// Degrades to empty (never 500).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leagueId = url.searchParams.get('leagueId') ?? url.searchParams.get('league_id') ?? undefined;

  try {
    const db = createAdminClient();
    let q = db
      .from('manager_profiles')
      .select(
        'league_id, user_id, sleeper_user_id, display_name, archetype, tags, trade_frequency, youth_preference, waiver_aggression, transaction_count, confidence, recent_needs, sample_size, calculated_at',
      )
      .order('transaction_count', { ascending: false })
      .limit(30);
    if (leagueId && leagueId !== 'all') q = q.eq('league_id', leagueId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ count: 0, profiles: [], note: error.message });
    return NextResponse.json({ count: data?.length ?? 0, profiles: data ?? [] });
  } catch (e) {
    return NextResponse.json({ count: 0, profiles: [], note: e instanceof Error ? e.message : 'error' });
  }
}
