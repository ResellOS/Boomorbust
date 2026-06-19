import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardBodyLock from '@/components/dashboard/DashboardBodyLock';
import TerminalShell from '@/components/dashboard/TerminalShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BOB Track Record',
};

export default async function PerformanceLayout({
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
    if (error) console.error('[performance/layout] getUser error:', error);
    else userId = data?.user?.id ?? null;

    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('sleeper_user_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) console.error('[performance/layout] profile error:', profileError);
      else if (!profile?.sleeper_user_id) needsOnboarding = true;
      else hasSleeper = true;
    }
  } catch (err) {
    console.error('[performance/layout] auth failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!userId || !hasSleeper) redirect('/login');

  return (
    <>
      <DashboardBodyLock />
      <TerminalShell>{children}</TerminalShell>
    </>
  );
}
