import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPlayerHubData } from '@/lib/players/fetchPlayerHubData';
import { fetchTradePageData } from '@/lib/trade/fetchTradePageData';
import { getUserTier } from '@/lib/access/gates';
import Sidebar from '@/components/dashboard/Sidebar';
import Footer from '@/components/dashboard/Footer';
import PlayerHubTopBar from '@/components/players/PlayerHubTopBar';
import PlayerHubClient from '@/components/players/PlayerHubClient';
import TerminalPageGrid from '@/components/dashboard/TerminalPageGrid';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[players] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[players] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  let sleeperUserId: string | null = null;
  let needsOnboarding = false;

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[players] profile query error:', error);
    } else if (!profile) {
      console.error('[players] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[players] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  const [hubData, tradeData] = await Promise.all([
    fetchPlayerHubData(userId, sleeperUserId),
    fetchTradePageData(userId).catch(() => null),
  ]);
  const tier = await getUserTier(userId);
  const showAds = tier === 'free';
  const tradeOpportunities = tradeData?.opportunities ?? [];

  return (
    <TerminalPageGrid>
      <PlayerHubTopBar stats={hubData.stats} />

      <Sidebar leagues={hubData.leagues} rosterSnapshot={hubData.rosterSnapshot} subscriptionTier={tier} />

      <Suspense
        fallback={
          <div className="col-start-1 md:col-start-2 row-start-2 flex items-center justify-center font-mono text-[12px] text-muted">
            Loading players…
          </div>
        }
      >
        <PlayerHubClient
          players={hubData.players}
          leaguePresence={hubData.leaguePresence}
          portfolio={hubData.portfolio}
          leagues={hubData.leagues}
          tradeOpportunities={tradeOpportunities}
          showAds={showAds}
        />
      </Suspense>

      <Footer
        leagueCount={hubData.leagueCount}
        edgeOpportunities={hubData.edgeOpportunities}
        lastRunMinutes={hubData.stats.lastUpdatedMinutes}
      />
    </TerminalPageGrid>
  );
}
