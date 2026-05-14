import { NextResponse, type NextRequest } from 'next/server';
import { fetchTradeHubData } from '@/lib/trade-hub/fetchTradeHubData';
import { mapProactiveToSuggestion } from '@/lib/trade-hub/mapProactiveToSuggestion';
import type { TreSuggestionsApiResponse } from '@/components/trade-hub/types';
import { requireFeature } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireFeature('tre_suggestions');
  if (gate instanceof NextResponse) return gate;

  const leagueId = request.nextUrl.searchParams.get('leagueId') ?? request.nextUrl.searchParams.get('league_id');

  try {
    const hub = await fetchTradeHubData(request, leagueId);
    const suggestions = hub.proactiveTrades.slice(0, 12).map(mapProactiveToSuggestion);
    const body: TreSuggestionsApiResponse = { suggestions };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'Failed to load suggestions' }, { status: 502 });
  }
}
