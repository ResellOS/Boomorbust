import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/trade-history?league_id=&period=&type=&page=&limit=
// The signed-in user's completed trades from the `trades` table (real data — 253
// rows across leagues), newest first, paginated. assets_sent/assets_received are
// arrays of Sleeper player ids; we resolve them to names. Defensive: never 500s.
//
// NOTE: every `trades` row is one of the user's own trades (keyed by user_id), so
// type=all/mine/league all return the same set here — the param is accepted and
// reserved for when league-wide (non-user) trades become available.

function periodCutoffIso(period: string): string | null {
  const now = Date.now();
  if (period === 'week') return new Date(now - 7 * 86_400_000).toISOString();
  if (period === 'month') return new Date(now - 30 * 86_400_000).toISOString();
  if (period === 'season') return new Date(now - 365 * 86_400_000).toISOString();
  return null;
}

interface TradeRowRaw {
  id: string;
  league_id: string | null;
  league_scoring_type: string | null;
  assets_sent: string[] | null;
  assets_received: string[] | null;
  status: string | null;
  created_at: string | null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const leagueId = sp.get('league_id') ?? 'all';
  const period = sp.get('period') ?? 'season';
  const type = sp.get('type') ?? 'all';
  const page = Math.max(1, Number(sp.get('page') ?? '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? '20') || 20));

  try {
    const auth = createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();

    const { data: leagueRows } = await db.from('leagues').select('id, name').eq('user_id', user.id);
    const leagueName = new Map(((leagueRows ?? []) as { id: string; name: string }[]).map((l) => [String(l.id), l.name]));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('trades')
      .select('id, league_id, league_scoring_type, assets_sent, assets_received, status, created_at', {
        count: 'exact',
      })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (leagueId !== 'all') q = q.eq('league_id', leagueId);
    const cutoff = periodCutoffIso(period);
    if (cutoff) q = q.gte('created_at', cutoff);

    const { data, count, error } = await q;
    if (error) {
      return NextResponse.json({ trades: [], page, limit, hasMore: false, total: 0, note: error.message });
    }
    const raw = (data ?? []) as TradeRowRaw[];

    // Resolve player ids -> names for every asset on the page.
    const ids = new Set<string>();
    for (const t of raw) {
      for (const a of t.assets_sent ?? []) ids.add(String(a));
      for (const a of t.assets_received ?? []) ids.add(String(a));
    }
    const nameMap = new Map<string, { name: string; position: string | null }>();
    if (ids.size > 0) {
      const { data: players } = await db
        .from('players')
        .select('id, full_name, position')
        .in('id', Array.from(ids));
      for (const p of (players ?? []) as { id: string; full_name: string | null; position: string | null }[]) {
        nameMap.set(String(p.id), { name: p.full_name ?? `#${p.id}`, position: p.position ?? null });
      }
    }
    const toAssets = (arr: string[] | null) =>
      (arr ?? []).map((id) => ({
        id: String(id),
        name: nameMap.get(String(id))?.name ?? `#${id}`,
        position: nameMap.get(String(id))?.position ?? null,
      }));

    const trades = raw.map((t) => ({
      id: String(t.id),
      leagueId: String(t.league_id ?? ''),
      leagueName: leagueName.get(String(t.league_id ?? '')) ?? '—',
      createdAt: t.created_at ?? null,
      status: t.status ?? null,
      scoringType: t.league_scoring_type ?? null,
      assetsSent: toAssets(t.assets_sent),
      assetsReceived: toAssets(t.assets_received),
    }));

    const total = count ?? trades.length;
    const hasMore = from + trades.length < total;
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
