import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardBodyLock from '@/components/dashboard/DashboardBodyLock';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'League Detail',
};

export default async function LeagueDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | null = null;
  let hasSleeper = false;
  let needsOnboarding = false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) console.error('[leagues/layout] getUser error:', error);
    else userId = data?.user?.id ?? null;

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('sleeper_user_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) console.error('[leagues/layout] profile error:', profileError);
      else if (!profile) console.error('[leagues/layout] no profile');
      else if (!profile.sleeper_user_id) needsOnboarding = true;
      else hasSleeper = true;
    }
  } catch (err) {
    console.error('[leagues/layout] auth failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!userId || !hasSleeper) redirect('/login');

  return (
    <>
      <DashboardBodyLock />
      <div className="h-screen overflow-hidden bg-bg font-figtree text-text min-w-[1280px]">
        {children}
      </div>
    </>
  );
}
