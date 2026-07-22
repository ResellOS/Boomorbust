import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/sell-windows?leagueId=&owner_id= — active (unacknowledged) sell-window
// alerts, most urgent first. Reads the shared `sell_window_alerts` table populated
// by the engine. Returns {count, alerts}; degrades to empty (never 500) so an empty
// or not-yet-migrated table simply hides the panel.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leagueId = url.searchParams.get('leagueId') ?? url.searchParams.get('league_id') ?? undefined;
  const ownerId = url.searchParams.get('owner_id') ?? undefined;

  try {
    const db = createAdminClient();
    let q = db
      .from('sell_window_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('urgency_score', { ascending: false })
      .limit(50);
    if (leagueId && leagueId !== 'all') q = q.eq('league_id', leagueId);
    if (ownerId) q = q.eq('owner_id', ownerId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ count: 0, alerts: [], note: error.message });
    return NextResponse.json({ count: data?.length ?? 0, alerts: data ?? [] });
  } catch (e) {
    return NextResponse.json({ count: 0, alerts: [], note: e instanceof Error ? e.message : 'error' });
  }
}
