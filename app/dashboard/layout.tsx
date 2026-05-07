import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEmpireTicker } from '@/lib/dashboard/empireTicker';
import NavBar from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_paid, preference_data, sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.sleeper_user_id) redirect('/onboarding');

  const empireTicker = await getEmpireTicker(supabase, user.id);

  const pref =
    profile?.preference_data && typeof profile.preference_data === 'object' && profile.preference_data !== null
      ? (profile.preference_data as Record<string, unknown>)
      : {};

  let tier: 'free' | 'pro' | 'elite' = 'free';
  if (pref.subscription_tier === 'elite') tier = 'elite';
  else if (profile?.is_paid) tier = 'pro';

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      <NavBar
        email={user.email ?? ''}
        username={profile?.username ?? null}
        tier={tier}
        empireTicker={empireTicker}
      />
      <div className="pb-[72px] lg:pb-0">{children}</div>
    </div>
  );
}
