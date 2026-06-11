import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchRotationData } from '@/lib/dashboard/fetchRotationData';
import { LEAGUE_STATUS } from '@/lib/dashboard/rotation';
import Sidebar, { type League } from '@/components/dashboard/Sidebar';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[dashboard] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[dashboard] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  // Owner lookup: auth.uid() -> profiles.id -> profiles.sleeper_user_id.
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
      console.error('[dashboard] profile query error:', error);
    } else if (!profile) {
      console.error('[dashboard] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[dashboard] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  // One initial load of every league's data; the client filters in memory on
  // rotation / league switch (no further API calls).
  const data = await fetchRotationData(userId, sleeperUserId);

  const sidebarLeagues: League[] = data.leagues.map((l) => {
    const meta = LEAGUE_STATUS[l.status];
    return {
      id: l.id,
      name: l.name,
      rotationStatus: { key: meta.key, label: meta.label, color: meta.color },
    };
  });

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: '66px 1fr 28px',
        gridTemplateColumns: '215px 1fr',
      }}
    >
      <Sidebar leagues={sidebarLeagues} />
      <DashboardClient data={data} />
    </div>
  );
}
