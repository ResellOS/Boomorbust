import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPerformanceData } from '@/lib/performance/fetchPerformanceData';
import Sidebar from '@/components/dashboard/Sidebar';
import PerformanceTopBar from '@/components/performance/PerformanceTopBar';
import PerformanceClient from '@/components/performance/PerformanceClient';
import WhyBobPanel from '@/components/performance/WhyBobPanel';
import PerformanceFooter from '@/components/performance/PerformanceFooter';
import { getUserTier } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[performance] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[performance] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  let needsOnboarding = false;

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[performance] profile query error:', error);
    } else if (!profile?.sleeper_user_id) {
      needsOnboarding = true;
    }
  } catch (err) {
    console.error('[performance] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');

  const data = await fetchPerformanceData(userId);
  const tier = await getUserTier(userId);

  return (
    <div className="performance-page-grid h-full overflow-hidden bg-bg">
      <div className="col-span-full">
        <PerformanceTopBar stats={data.stats} />
      </div>
      <Sidebar leagues={data.leagues} subscriptionTier={tier} />
      <div className="col-start-1 md:col-start-2 row-start-2 min-h-0 overflow-hidden">
        <PerformanceClient data={data} />
      </div>
      <div className="hidden md:col-start-3 md:row-start-2 md:block md:min-h-0 md:overflow-hidden">
        <WhyBobPanel stats={data.stats} />
      </div>
      <div className="col-span-full row-start-3">
        <PerformanceFooter />
      </div>
    </div>
  );
}
