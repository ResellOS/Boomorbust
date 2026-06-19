import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchExposureData } from '@/lib/exposure/fetchExposureData';
import Sidebar from '@/components/dashboard/Sidebar';
import ExposureTopBar from '@/components/exposure/ExposureTopBar';
import ExposureClient from '@/components/exposure/ExposureClient';
import ExposureFooter from '@/components/exposure/ExposureFooter';
import TerminalPageGrid from '@/components/dashboard/TerminalPageGrid';

export const dynamic = 'force-dynamic';

export default async function ExposurePage() {
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[exposure] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[exposure] getUser failed:', err);
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
      console.error('[exposure] profile query error:', error);
    } else if (!profile) {
      console.error('[exposure] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[exposure] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  const data = await fetchExposureData(userId, sleeperUserId);

  return (
    <TerminalPageGrid>
      <ExposureTopBar stats={data.topbar} />
      <Sidebar leagues={data.leagues} />
      <div className="col-start-1 md:col-start-2 row-start-2 min-h-0 overflow-hidden">
        <ExposureClient data={data} />
      </div>
      <ExposureFooter
        leagueCount={data.topbar.leaguesConnected}
        playerCount={data.players.length}
        totalAssetValue={data.topbar.totalAssetValue}
      />
    </TerminalPageGrid>
  );
}
