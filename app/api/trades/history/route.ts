import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchTradeHubData } from '@/lib/trade-hub/fetchTradeHubData';
import { mapTradeHistoryItem } from '@/lib/trade-hub/mapTradeHistoryItem';
import type { TradeHistoryApiResponse } from '@/components/trade-hub/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw ? parseInt(raw, 10) : 5;
  const limit = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 5;

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? req.nextUrl.searchParams.get('league_id');

  try {
    const hub = await fetchTradeHubData(req, leagueId);
    const trades = hub.tradeHistory.slice(0, limit).map(mapTradeHistoryItem);
    const body: TradeHistoryApiResponse = { trades };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'Failed to load trade history' }, { status: 502 });
  }
}
