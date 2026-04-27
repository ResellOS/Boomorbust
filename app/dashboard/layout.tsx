import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NavBar from '@/components/NavBar';

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

  return (
    <div className="min-h-screen bg-background">
      <NavBar email={user.email ?? ''} />
      {children}
    </div>
  );
}
