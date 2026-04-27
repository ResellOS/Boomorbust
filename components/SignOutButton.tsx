'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-text-muted hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
    >
      Sign out
    </button>
  );
}
