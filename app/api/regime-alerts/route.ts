import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/regime-alerts?leagueId=&days= — recent, unacknowledged regime-change
// alerts (snap/target spikes, QB changes, etc.), newest first. Reads the shared
// `regime_change_alerts` table populated by the engine. Degrades to empty (never
// 500) so an empty table hides the panel.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const leagueId = url.searchParams.get('leagueId') ?? url.searchParams.get('league_id') ?? undefined;
  const days = Number(url.searchParams.get('days') ?? '14');
  const since = new Date(Date.now() - (Number.isFinite(days) ? days : 14) * 86_400_000).toISOString();

  try {
    const db = createAdminClient();
    let q = db
      .from('regime_change_alerts')
      .select('*')
      .eq('acknowledged', false)
      .gte('change_detected_at', since)
      .order('change_detected_at', { ascending: false })
      .limit(50);
    if (leagueId && leagueId !== 'all') q = q.eq('league_id', leagueId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ count: 0, alerts: [], note: error.message });
    return NextResponse.json({ count: data?.length ?? 0, alerts: data ?? [] });
  } catch (e) {
    return NextResponse.json({ count: 0, alerts: [], note: e instanceof Error ? e.message : 'error' });
  }
}
