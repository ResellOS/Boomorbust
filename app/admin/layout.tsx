import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--indigo-light)]">Admin</span>
            <span className="hidden text-[11px] text-[var(--text-muted)] sm:inline">Operational console</span>
          </div>
          <Link href="/dashboard" className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-white">
            ← Back to app
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
