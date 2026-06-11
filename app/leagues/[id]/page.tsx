import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueDetail } from '@/lib/league/fetchLeagueDetail';
import LeagueDetailTopBar from '@/components/league/LeagueDetailTopBar';
import LeagueDetailSidebar from '@/components/league/LeagueDetailSidebar';
import LeagueDetailPanels from '@/components/league/LeagueDetailPanels';
import LeagueDetailFooter from '@/components/league/LeagueDetailFooter';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeagueDetailPage({ params }: PageProps) {
  const { id } = await params;

  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[leagues] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[leagues] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  let sleeperUserId: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[leagues] profile query error:', error);
    } else if (!profile?.sleeper_user_id) {
      redirect('/onboarding');
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[leagues] profile fetch failed:', err);
    redirect('/login');
  }

  if (!sleeperUserId) redirect('/login');

  const data = await fetchLeagueDetail(id, userId, sleeperUserId);
  if (!data) notFound();

  return (
    <div className="flex h-full flex-col">
      <LeagueDetailTopBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeagueDetailSidebar leagues={data.allLeagues} activeLeagueId={id} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <LeagueDetailPanels data={data} />
          <LeagueDetailFooter
            playersTracked={data.footer.playersTracked}
            boomPlayers={data.footer.boomPlayers}
            bustPlayers={data.footer.bustPlayers}
            avgDynastyRating={data.footer.avgDynastyRating}
            lastUpdatedMinutes={data.footer.lastUpdatedMinutes}
            leagueCount={data.footer.leagueCount}
          />
        </main>
      </div>
    </div>
  );
}
