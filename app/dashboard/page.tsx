import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTier, getVerdict } from '@/lib/verdict';
import TopBar from '@/components/dashboard/TopBar';
import Sidebar from '@/components/dashboard/Sidebar';
import PlayerCard, { deriveRadarVals } from '@/components/dashboard/PlayerCard';
import RightPanel from '@/components/dashboard/RightPanel';
import TradeTargetsTable from '@/components/dashboard/TradeTargetsTable';
import DynastyNewsFeed from '@/components/dashboard/DynastyNewsFeed';
import IncomingTrades, { type IncomingTrade } from '@/components/dashboard/IncomingTrades';
import Footer from '@/components/dashboard/Footer';

export const dynamic = 'force-dynamic';

type PlayerRow = {
  full_name: string | null;
  position: string | null;
  team: string | null;
  depth_chart_position?: string | null;
};

type TfoRow = {
  player_id: string;
  tfo_score: number;
  calculated_at?: string | null;
  players: PlayerRow | PlayerRow[] | null;
};

function unwrapPlayer(p: TfoRow['players']): PlayerRow | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

const PLACEHOLDER_TRADES: IncomingTrade[] = [
  {
    id: '1',
    playerId: '6794',
    playerName: 'Justin Jefferson',
    leagueName: 'Dynasty 1QB',
    managerHandle: '@AlphaManager',
    dynastyEdge: 18.4,
    status: 'NEW',
    tfoScore: 94.7,
  },
  {
    id: '2',
    playerId: '10229',
    playerName: 'Bijan Robinson',
    leagueName: 'Redraft Main',
    managerHandle: '@BetaManager',
    dynastyEdge: 12.7,
    status: 'PENDING',
    tfoScore: 76,
  },
  {
    id: '3',
    playerId: '4046',
    playerName: 'CeeDee Lamb',
    leagueName: 'Dynasty SF',
    managerHandle: '@GammaManager',
    dynastyEdge: 8.9,
    status: 'PENDING',
    tfoScore: 61,
  },
];

export default async function DashboardPage() {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect('/auth/login');

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .single();

  if (!profile?.sleeper_user_id) redirect('/onboarding');

  const sleeperUserId = profile.sleeper_user_id;

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, league_type, status')
    .eq('owner_id', sleeperUserId);

  const leagueList = leagues ?? [];

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('player_id')
    .eq('owner_id', sleeperUserId);

  const playerIds = Array.from(
    new Set((rosterRows ?? []).map((r) => r.player_id).filter(Boolean)),
  );

  let myPlayers: TfoRow[] = [];
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('tfo_cache')
      .select(
        'player_id, tfo_score, calculated_at, players(full_name, position, team, depth_chart_position)',
      )
      .in('player_id', playerIds)
      .order('tfo_score', { ascending: false })
      .limit(5);
    myPlayers = (data ?? []) as TfoRow[];
  }

  let targets: TfoRow[] = [];
  let targetsQuery = supabase
    .from('tfo_cache')
    .select('player_id, tfo_score, players(full_name, position, team)')
    .order('tfo_score', { ascending: false })
    .limit(8);

  if (playerIds.length > 0) {
    targetsQuery = targetsQuery.not('player_id', 'in', `(${playerIds.join(',')})`);
  }

  const { data: targetRows } = await targetsQuery;
  targets = (targetRows ?? []) as TfoRow[];

  let overvalued: TfoRow[] = [];
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('tfo_cache')
      .select('player_id, tfo_score, players(full_name, position, team)')
      .in('player_id', playerIds)
      .order('tfo_score', { ascending: true })
      .limit(5);
    overvalued = (data ?? []) as TfoRow[];
  }

  let allRosterTfo: { tfo_score: number }[] = [];
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('tfo_cache')
      .select('tfo_score')
      .in('player_id', playerIds);
    allRosterTfo = data ?? [];
  }

  const signalCounts = { boom: 0, hold: 0, bust: 0, total: allRosterTfo.length };
  for (const row of allRosterTfo) {
    const v = getVerdict(row.tfo_score);
    if (v.class === 'boom') signalCounts.boom += 1;
    else if (v.class === 'hold') signalCounts.hold += 1;
    else signalCounts.bust += 1;
  }

  const avgTfo =
    allRosterTfo.length > 0
      ? allRosterTfo.reduce((s, r) => s + r.tfo_score, 0) / allRosterTfo.length
      : 72;

  const tradeTargets = targets.map((row, i) => {
    const p = unwrapPlayer(row.players);
    const league = leagueList[i % Math.max(leagueList.length, 1)];
    return {
      playerId: row.player_id,
      playerName: p?.full_name ?? 'Unknown Player',
      position: p?.position ?? '—',
      team: p?.team ?? '—',
      leagueName: league?.name ?? 'League',
      tfoScore: row.tfo_score,
    };
  });

  const overvaluedAssets = overvalued.map((row) => {
    const p = unwrapPlayer(row.players);
    return {
      playerId: row.player_id,
      playerName: p?.full_name ?? 'Unknown Player',
      position: p?.position ?? '—',
      team: p?.team ?? '—',
      delta: -Math.max(1, (70 - row.tfo_score) * 0.35),
    };
  });

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: '66px 1fr 28px',
        gridTemplateColumns: '215px 1fr',
      }}
    >
      <TopBar
        leagueCount={leagueList.length}
        playersRostered={playerIds.length}
        tradeOffers={3}
        dynastyEdge={Math.max(0, avgTfo - 70)}
        empireRating={Math.min(99, Math.max(40, avgTfo + 8))}
      />

      <Sidebar leagues={leagueList} />

      <div
        className="row-start-2 min-h-0 overflow-hidden"
        style={{ display: 'grid', gridTemplateColumns: '1fr 288px', minWidth: 0 }}
      >
        <div className="flex min-w-0 flex-col gap-[9px] overflow-hidden p-[11px_13px]">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-figtree text-[11.5px] font-bold uppercase tracking-[1.5px] text-text">
                My Boom/Bust Players
              </span>
              <Link href="/players" className="font-mono text-[9px] text-boom no-underline">
                View All Players →
              </Link>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {myPlayers.length > 0 ? (
                myPlayers.map((row) => {
                  const p = unwrapPlayer(row.players);
                  return (
                    <PlayerCard
                      key={row.player_id}
                      playerId={row.player_id}
                      playerName={p?.full_name ?? 'Unknown Player'}
                      position={p?.position ?? '—'}
                      team={p?.team ?? '—'}
                      tfoScore={row.tfo_score}
                      radarVals={deriveRadarVals(row.player_id, row.tfo_score)}
                      tier={getTier(row.tfo_score)}
                    />
                  );
                })
              ) : (
                <>
                  <PlayerCard
                    playerId="6794"
                    playerName="Justin Jefferson"
                    position="WR"
                    team="MIN"
                    tfoScore={94.7}
                    radarVals={deriveRadarVals('6794', 94.7)}
                    tier="Elite Tier"
                  />
                  <PlayerCard
                    playerId="9228"
                    playerName="CJ Stroud"
                    position="QB"
                    team="HOU"
                    tfoScore={88.1}
                    radarVals={deriveRadarVals('9228', 88.1)}
                    tier="Elite Tier"
                  />
                  <PlayerCard
                    playerId="9493"
                    playerName="Breece Hall"
                    position="RB"
                    team="NYJ"
                    tfoScore={76.3}
                    radarVals={deriveRadarVals('9493', 76.3)}
                    tier="Solid Tier"
                  />
                  <PlayerCard
                    playerId="9990"
                    playerName="Drake London"
                    position="WR"
                    team="ATL"
                    tfoScore={61.2}
                    radarVals={deriveRadarVals('9990', 61.2)}
                    tier="Weak Tier"
                  />
                  <PlayerCard
                    playerId="8154"
                    playerName="Sam LaPorta"
                    position="TE"
                    team="DET"
                    tfoScore={54.8}
                    radarVals={deriveRadarVals('8154', 54.8)}
                    tier="Avoid Tier"
                  />
                </>
              )}
            </div>
          </div>

          <div
            className="min-h-0 flex-1"
            style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 9 }}
          >
            <TradeTargetsTable targets={tradeTargets} />
            <div className="flex min-h-0 flex-col gap-[9px]">
              <DynastyNewsFeed />
              <IncomingTrades trades={PLACEHOLDER_TRADES} viewAllCount={24} />
            </div>
          </div>
        </div>

        <RightPanel
          signals={signalCounts}
          exposureWarnings={[]}
          overvalued={overvaluedAssets}
        />
      </div>

      <Footer
        leagueCount={Math.max(leagueList.length, 1)}
        connectedLeagues={leagueList.length}
        edgeOpportunities={tradeTargets.length > 0 ? tradeTargets.length + 19 : 27}
      />
    </div>
  );
}
