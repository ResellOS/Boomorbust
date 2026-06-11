import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchExposureData } from '@/lib/exposure/fetchExposureData';
import Sidebar from '@/components/dashboard/Sidebar';
import ExposureTopBar from '@/components/exposure/ExposureTopBar';
import ExposureClient from '@/components/exposure/ExposureClient';
import ExposureRightPanel from '@/components/exposure/ExposureRightPanel';
import ExposureFooter from '@/components/exposure/ExposureFooter';

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
  const dangerCount = data.players.filter((p) => p.riskLevel === 'DANGER').length;

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: '66px 1fr 28px',
        gridTemplateColumns: '215px 1fr',
      }}
    >
      <ExposureTopBar stats={data.topbar} />

      <Sidebar
        leagues={data.leagues}
        exposureOverview={data.portfolioOverview}
        exposureHealth={data.exposureHealth}
      />

      <div
        className="row-start-2 flex min-h-0 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <ExposureClient players={data.players} isGameDay={data.isGameDay} />
        <ExposureRightPanel
          portfolioRisk={data.portfolioRisk}
          dangerAlerts={data.dangerAlerts}
          positionBreakdown={data.positionBreakdown}
          positionAdvisory={data.positionAdvisory}
          weeklyPerformance={data.weeklyPerformance}
          nflWeek={data.nflWeek}
        />
      </div>

      <ExposureFooter
        dangerCount={dangerCount}
        leagueCount={data.leagueCount}
      />
    </div>
  );
}
