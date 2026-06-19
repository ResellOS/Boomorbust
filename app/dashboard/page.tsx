import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveDashboardAuth } from '@/lib/auth/serverSession';
import {
  emptyDashboardRotationData,
  fetchRotationData,
} from '@/lib/dashboard/fetchRotationData';
import { fetchDailyTasks } from '@/lib/dashboard/fetchDailyTasks';
import { LEAGUE_STATUS } from '@/lib/dashboard/rotation';
import { getUserTier } from '@/lib/access/gates';
import Sidebar, { type League } from '@/components/dashboard/Sidebar';
import DashboardClient from '@/components/dashboard/DashboardClient';
import TerminalPageGrid from '@/components/dashboard/TerminalPageGrid';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const auth = await resolveDashboardAuth();

  if (auth.needsOnboarding) redirect('/onboarding');
  if (!auth.userId) redirect('/auth/login');

  let sleeperUserId = auth.sleeperUserId;
  let lastEmpireRating: number | null = null;

  if (!sleeperUserId) {
    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('sleeper_user_id, last_empire_rating')
        .eq('id', auth.userId)
        .maybeSingle();

      if (profile?.sleeper_user_id) {
        sleeperUserId = profile.sleeper_user_id;
      } else if (!auth.profileUnavailable && !profile?.sleeper_user_id) {
        redirect('/onboarding');
      }

      const raw = profile?.last_empire_rating;
      lastEmpireRating =
        raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
    } catch (err) {
      console.error('[dashboard] admin profile fetch failed:', err);
    }
  } else {
    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_empire_rating')
        .eq('id', auth.userId)
        .maybeSingle();
      const raw = profile?.last_empire_rating;
      lastEmpireRating =
        raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
    } catch {
      /* non-blocking */
    }
  }

  if (!sleeperUserId && !auth.profileUnavailable) {
    redirect('/auth/login');
  }

  let data = await emptyDashboardRotationData();
  if (sleeperUserId) {
    try {
      data = await fetchRotationData(auth.userId, sleeperUserId);
    } catch (err) {
      console.error('[dashboard] fetchRotationData failed:', err);
    }
  }

  let dailyTasks: Awaited<ReturnType<typeof fetchDailyTasks>> = [];
  try {
    dailyTasks = await fetchDailyTasks(auth.userId);
  } catch (err) {
    console.error('[dashboard] fetchDailyTasks failed:', err);
  }

  let tier: Awaited<ReturnType<typeof getUserTier>> = 'free';
  try {
    tier = await getUserTier(auth.userId);
  } catch (err) {
    console.error('[dashboard] getUserTier failed:', err);
  }

  const showAds = tier === 'free';

  const sidebarLeagues: League[] = data.leagues.map((l) => {
    const meta = LEAGUE_STATUS[l.status];
    return {
      id: l.id,
      name: l.name,
      rotationStatus: { key: meta.key, label: meta.label, color: meta.color },
    };
  });

  return (
    <TerminalPageGrid>
      <Sidebar
        leagues={sidebarLeagues}
        signalCounts={data.portfolio.signalCounts}
        showAds={showAds}
      />
      <DashboardClient data={data} dailyTasks={dailyTasks} lastEmpireRating={lastEmpireRating} />
    </TerminalPageGrid>
  );
}
