import { redirect } from 'next/navigation';
import { resolveDashboardAuth } from '@/lib/auth/serverSession';
import DashboardBodyLock from '@/components/dashboard/DashboardBodyLock';
import TerminalShell from '@/components/dashboard/TerminalShell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await resolveDashboardAuth();

  if (auth.needsOnboarding) redirect('/onboarding');
  if (!auth.userId) redirect('/auth/login');
  // Profile DB blip — user is authenticated; let the page render with fallbacks.
  if (!auth.profileUnavailable && !auth.sleeperUserId && !auth.needsOnboarding) {
    redirect('/auth/login');
  }

  return (
    <>
      <DashboardBodyLock />
      <TerminalShell>{children}</TerminalShell>
    </>
  );
}
