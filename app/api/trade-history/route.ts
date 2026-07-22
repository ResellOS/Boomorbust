import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/trade-history?league_id=&period=&type=&page=&limit=
// Completed trades from league_transactions (type = 'trade' only — not waivers or
// free-agent adds), scoped to the signed-in user's leagues, newest first, paginated.
// league_transactions is engine-populated; when empty this returns an empty page so
// the UI shows its "no trade history yet" state. Defensive: never 500s.

function periodCutoffIso(period: string): string | null {
  const now = Date.now();
  if (period === 'week') return new Date(now - 7 * 86_400_000).toISOString();
  if (period === 'month') return new Date(now - 30 * 86_400_000).toISOString();
  if (period === 'season') return new Date(now - 365 * 86_400_000).toISOString();
  return null; // 'all' or unknown → no time filter
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const leagueId = sp.get('league_id') ?? 'all';
  const period = sp.get('period') ?? 'season';
  const type = sp.get('type') ?? 'all'; // all | mine | league
  const page = Math.max(1, Number(sp.get('page') ?? '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? '20') || 20));

  try {
    const auth = createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();

    // The user's leagues (scope + name lookup).
    const { data: leagueRows } = await db.from('leagues').select('id, name').eq('user_id', user.id);
    const leagues = (leagueRows ?? []) as { id: string; name: string }[];
    if (leagues.length === 0) {
      return NextResponse.json({ trades: [], page, limit, hasMore: false, total: 0 });
    }
    const leagueName = new Map(leagues.map((l) => [String(l.id), l.name]));
    const scopeIds = leagueId !== 'all' ? [leagueId] : leagues.map((l) => String(l.id));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('league_transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'trade')
      .in('league_id', scopeIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    const cutoff = periodCutoffIso(period);
    if (cutoff) q = q.gte('created_at', cutoff);

    const { data, count, error } = await q;
    if (error) {
      return NextResponse.json({ trades: [], page, limit, hasMore: false, total: 0, note: error.message });
    }

    const trades = (data ?? []).map((t: Record<string, unknown>) => ({
      id: String(t.id ?? t.transaction_id ?? ''),
      leagueId: String(t.league_id ?? ''),
      leagueName: leagueName.get(String(t.league_id ?? '')) ?? '—',
      createdAt: (t.created_at as string | null) ?? null,
      adds: (t.adds as unknown) ?? null,
      drops: (t.drops as unknown) ?? null,
      payload: (t.payload as unknown) ?? null,
    }));

    const total = count ?? trades.length;
    const hasMore = from + trades.length < total;

    // NOTE: type=mine/league requires per-league roster mapping to attribute a
    // transaction to the user; not resolved here (table is engine-populated and
    // currently empty). The param is accepted and reserved.
    return NextResponse.json({ trades, page, limit, hasMore, total, typeFilter: type });
  } catch (e) {
    return NextResponse.json({
      trades: [],
      page,
      limit,
      hasMore: false,
      total: 0,
      note: e instanceof Error ? e.message : 'error',
    });
  }
}
