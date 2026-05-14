import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/nav/TopNav';
import AdSlot from '@/components/ads/AdSlot';
import DashboardStoreInitializer from '@/components/layout/DashboardStoreInitializer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: 'Boom or Bust · %s',
  },
};

/**
 * Authenticated app shell for all routes inside the (dashboard) route group.
 *
 * Structure:
 *   <html bg="#0a0d14">                        ← no FOUC; set in globals.css + layout.tsx
 *     <TopNav fixed 56px />                    ← primary chrome
 *     <div className="pt-14">…main…</div>      ← clears fixed bar
 *   </html>
 *
 * No sidebar here — each page owns its own sidebar/panel layout if needed.
 */
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

  const pref =
    profile?.preference_data &&
    typeof profile.preference_data === 'object' &&
    profile.preference_data !== null
      ? (profile.preference_data as Record<string, unknown>)
      : {};

  let tier: 'free' | 'pro' | 'elite' = 'free';
  if (pref.subscription_tier === 'elite' || pref.subscription_tier === 'all_pro_terminal') {
    tier = 'elite';
  } else if (profile?.is_paid) {
    tier = 'pro';
  }

  return (
    /*
     * Outer wrapper fills the viewport with the canonical background so there
     * is never a white flash between the <html> background and the first paint.
     * min-h-dvh uses the dynamic viewport height so mobile chrome bars don't
     * cause a layout shift.
     */
    <div
      className="relative min-h-dvh"
      style={{
        background: '#0a0d14',
        fontFamily: 'var(--font-body)',
        color: '#f8fafc',
      }}
    >
      {/* NAV — fixed 56px bar; content clears via pt-14 wrapper below */}
      <TopNav email={user.email ?? ''} username={profile?.username ?? null} />

      <div className="pt-14" style={{ background: '#0a0d14' }}>
        {tier === 'free' ? <AdSlot /> : null}

        <main
          className="relative min-h-[calc(100dvh-3.5rem)]"
          style={{ background: '#0a0d14' }}
        >
          {children}
        </main>
      </div>

      {/* Initialise Zustand activeLeagueId → 'all' on mount */}
      <DashboardStoreInitializer />
    </div>
  );
}
