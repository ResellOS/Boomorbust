import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminDashboardPayload, getBuildMetaPackageJson } from '@/lib/admin/dashboard-data';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  const initial = await getAdminDashboardPayload();
  const { nextVersion } = await getBuildMetaPackageJson();

  const deployUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (
    <AdminDashboardClient
      initial={initial}
      buildMeta={{
        sha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VITE_COMMIT_SHA ?? 'local',
        next: nextVersion,
        node: process.version,
        vercelUrl: deployUrl,
        deployedAt: new Date().toISOString(),
      }}
    />
  );
}
