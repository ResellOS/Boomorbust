import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchTradePageData } from '@/lib/trade/fetchTradePageData';
import type { TradePageData } from '@/lib/trade/types';
import { getUserTier } from '@/lib/access/gates';
import TradeTopBar from '@/components/trade/TradeTopBar';
import Sidebar from '@/components/dashboard/Sidebar';
import TradeHubClient from '@/components/trade/TradeHubClient';
import TradeFooter from '@/components/trade/TradeFooter';
import TerminalPageGrid from '@/components/dashboard/TerminalPageGrid';

export const dynamic = 'force-dynamic';

export default async function TradePage({
  searchParams,
}: {
  searchParams: { target?: string; league?: string; offer?: string };
}) {
  let userId: string | null = null;

  try {
    const auth = createClient();
    const { data, error } = await auth.auth.getUser();
    if (error) console.error('[trade] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[trade] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  const data: TradePageData = await fetchTradePageData(userId);
  const tier = await getUserTier(userId);
  const showAds = tier === 'free';

  return (
    <TerminalPageGrid>
      <TradeTopBar stats={data.stats} />
      <Sidebar leagues={data.leagues} />
      <TradeHubClient
        data={data}
        showAds={showAds}
        initialTargetPlayerId={searchParams.target}
        initialLeagueId={searchParams.league}
        initialOfferId={searchParams.offer}
      />
      <TradeFooter footer={data.footer} />
    </TerminalPageGrid>
  );
}
