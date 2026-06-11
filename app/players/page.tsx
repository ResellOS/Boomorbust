import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPlayerHubData } from '@/lib/players/fetchPlayerHubData';
import Sidebar from '@/components/dashboard/Sidebar';
import Footer from '@/components/dashboard/Footer';
import PlayerHubTopBar from '@/components/players/PlayerHubTopBar';
import PlayerHubClient from '@/components/players/PlayerHubClient';

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

  const hubData = await fetchPlayerHubData(userId, sleeperUserId);

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: '66px 1fr 28px',
        gridTemplateColumns: '215px 1fr',
      }}
    >
      <PlayerHubTopBar stats={hubData.stats} />

      <Sidebar leagues={hubData.leagues} rosterSnapshot={hubData.rosterSnapshot} />

      <PlayerHubClient
        players={hubData.players}
        leaguePresence={hubData.leaguePresence}
      />

      <Footer
        leagueCount={hubData.leagueCount}
        edgeOpportunities={hubData.edgeOpportunities}
        lastRunMinutes={hubData.stats.lastUpdatedMinutes}
      />
    </div>
  );
}
