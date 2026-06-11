import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchDraftData } from '@/lib/draft/fetchDraftData';
import Sidebar from '@/components/dashboard/Sidebar';
import DraftRoomClient from '@/components/draft/DraftRoomClient';

export const dynamic = 'force-dynamic';

export default async function DraftPage() {
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[draft] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[draft] getUser failed:', err);
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
      console.error('[draft] profile query error:', error);
    } else if (!profile) {
      console.error('[draft] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[draft] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  const data = await fetchDraftData(userId);

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: '66px 1fr 28px',
        gridTemplateColumns: '215px 1fr 320px',
      }}
    >
      <Sidebar leagues={data.leagues} />
      <DraftRoomClient pool={data.pool} scoringContext={data.scoringContext} />
    </div>
  );
}
