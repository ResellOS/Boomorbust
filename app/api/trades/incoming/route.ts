import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchTradeHubData } from '@/lib/trade-hub/fetchTradeHubData';
import { mapTradeHubOfferToIncoming } from '@/lib/trade-hub/mapIncomingFromTradeHub';
import type { IncomingOffersResponse } from '@/components/trade-hub/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = request.nextUrl.searchParams.get('leagueId') ?? request.nextUrl.searchParams.get('league_id');

  try {
    const hub = await fetchTradeHubData(request, leagueId);
    const leagueIndex = new Map(hub.leagues.map((l, i) => [l.id, i]));

    const offers = hub.incomingOffers.map((o) =>
      mapTradeHubOfferToIncoming(o, leagueIndex.get(o.league_id) ?? 0),
    );

    const payload: IncomingOffersResponse = {
      offers,
      totalCount: offers.length,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 502 });
  }
}
