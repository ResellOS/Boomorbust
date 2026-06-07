import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardBodyLock from '@/components/dashboard/DashboardBodyLock';

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
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.sleeper_user_id) redirect('/onboarding');

  return (
    <>
      <DashboardBodyLock />
      <div className="min-w-[1280px] h-screen overflow-hidden bg-bg text-text font-figtree">
        {children}
      </div>
    </>
  );
}
