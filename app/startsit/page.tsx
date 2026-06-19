import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchStartSitData } from '@/lib/startsit/fetchStartSitData';
import Sidebar from '@/components/dashboard/Sidebar';
import StartSitTopBar from '@/components/startsit/StartSitTopBar';
import StartSitClient from '@/components/startsit/StartSitClient';
import StartSitRightPanel from '@/components/startsit/StartSitRightPanel';
import StartSitFooter from '@/components/startsit/StartSitFooter';
import TerminalPageGrid from '@/components/dashboard/TerminalPageGrid';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ week?: string; league?: string }>;
}

export default async function StartSitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedWeek = params.week ? Number(params.week) : undefined;
  const selectedLeague = params.league ?? undefined;

  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[startsit] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[startsit] getUser failed:', err);
  }

  if (!userId) redirect('/login');

  let sleeperUserId: string | null = null;
  let needsOnboarding = false;

  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[startsit] profile query error:', error);
    } else if (!profile) {
      console.error('[startsit] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[startsit] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  const data = await fetchStartSitData(
    userId,
    sleeperUserId,
    selectedWeek,
    selectedLeague,
  );

  return (
    <TerminalPageGrid variant="startsit">
      <StartSitTopBar stats={data.topbar} isOffseason={data.weekContext.isOffseason} />

      <Sidebar
        leagues={data.leagues}
        weekContext={{
          nflWeek: data.weekContext.nflWeek,
          windowOpen: data.weekContext.windowOpen,
          lockDeadline: data.weekContext.lockDeadline,
          weatherImpact: data.weekContext.weatherImpact,
          isOffseason: data.weekContext.isOffseason,
        }}
        bobConfidence={data.bobConfidence}
      />

      <div className="col-start-1 md:col-start-2 row-start-2 flex min-h-0 flex-col overflow-hidden md:flex-row">
        <StartSitClient
          nflWeek={data.weekContext.nflWeek}
          isOffseason={data.weekContext.isOffseason}
          leagues={data.leagues}
          seasonRecord={data.seasonRecord}
          decisions={data.decisions}
          decisionsSummary={data.decisionsSummary}
          lineupOptimizer={data.lineupOptimizer}
          flexDecisions={data.flexDecisions}
          hasRealData={data.hasRealData}
        />
        <div className="hidden md:block md:shrink-0">
          <StartSitRightPanel
            seasonRecord={data.seasonRecord}
            alerts={data.alerts}
            weekContext={data.weekContext}
            leagueCount={data.leagueCount}
          />
        </div>
      </div>

      <StartSitFooter
        seasonRecord={data.topbar.seasonRecord}
        winRate={data.topbar.seasonWinRate}
        weekCalls={data.topbar.decisionsToday ?? data.topbar.thisWeekCalls}
        leagueCount={data.leagueCount}
        nflWeek={data.weekContext.nflWeek}
        lastRunMinutes={data.topbar.lastUpdatedMinutes}
      />
    </TerminalPageGrid>
  );
}
