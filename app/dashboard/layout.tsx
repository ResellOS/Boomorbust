import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeTier } from '@/lib/access/gates';
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
    .select('username, is_paid, subscription_tier, preference_data, sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.sleeper_user_id) redirect('/onboarding');

  const empireTicker = await getEmpireTicker(supabase, user.id);

  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  const tier = normalizeTier(rawTier, profile?.is_paid);

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
