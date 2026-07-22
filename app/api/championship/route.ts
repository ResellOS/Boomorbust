import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/championship?leagueId= — championship odds per team.
// Reads the shared `championship_odds` table. This table currently exists but is
// EMPTY (no championship model has populated it yet), so this honestly returns
// {count: 0, odds: []} and the panel stays hidden until data lands.
// (Note: there is no `championship_probabilities` table — `championship_odds` is
// the real one.) Degrades to empty (never 500).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leagueId = url.searchParams.get('leagueId') ?? url.searchParams.get('league_id') ?? undefined;

  try {
    const db = createAdminClient();
    let q = db.from('championship_odds').select('*').limit(50);
    // Only filter by league when a league is specified; the column may not exist
    // on an empty/undefined schema, so a failure here degrades to empty below.
    if (leagueId && leagueId !== 'all') q = q.eq('league_id', leagueId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ count: 0, odds: [], note: error.message });
    return NextResponse.json({ count: data?.length ?? 0, odds: data ?? [] });
  } catch (e) {
    return NextResponse.json({ count: 0, odds: [], note: e instanceof Error ? e.message : 'error' });
  }
}
