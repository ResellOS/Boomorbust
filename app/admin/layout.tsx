import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <header className="bg-[#1E293B] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[#6366F1] font-bold text-sm uppercase tracking-widest">Admin</span>
          <span className="text-[#475569] text-xs">The Front Office</span>
        </div>
        <Link href="/dashboard" className="text-xs text-[#94A3B8] hover:text-white transition">
          ← Back to app
        </Link>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  );
}
