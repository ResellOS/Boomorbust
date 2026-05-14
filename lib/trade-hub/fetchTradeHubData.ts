import type { NextRequest } from 'next/server';
import type { TradeHubData } from '@/app/api/dashboard/trade-hub/route';

/**
 * Server-only: calls the dashboard trade-hub route with the caller's cookies.
 */
export async function fetchTradeHubData(request: NextRequest, leagueId?: string | null): Promise<TradeHubData> {
  const hubParams = new URLSearchParams();
  if (leagueId && leagueId !== 'all') {
    hubParams.set('league_id', leagueId);
  }

  const hubUrl = new URL(
    `/api/dashboard/trade-hub${hubParams.toString() ? `?${hubParams}` : ''}`,
    request.url,
  );

  const res = await fetch(hubUrl.toString(), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`trade-hub ${res.status}`);
  }

  return (await res.json()) as TradeHubData;
}
