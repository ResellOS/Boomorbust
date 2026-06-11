import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deriveRadarVals, getTier, getVerdict } from '@/lib/verdict';
import TopBar from '@/components/dashboard/TopBar';
import Sidebar, { type League } from '@/components/dashboard/Sidebar';
import PlayerCard from '@/components/dashboard/PlayerCard';
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
  age?: number | null;
};

type TfoRow = {
  player_id: string;
  tfo_score: number | null;
  calculated_at?: string | null;
  players: PlayerRow | PlayerRow[] | null;
};

function unwrapPlayer(p: TfoRow['players']): PlayerRow | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

function safeScore(score: number | null | undefined): number {
  return typeof score === 'number' && Number.isFinite(score) ? score : 0;
}

// This is a dynasty product, so prefer dynasty scores — but fall back to redraft
// until the engine's dynasty prescore has been run (formula_scores starts
// redraft-only), so the dashboard never blanks out.
async function resolveScoringContext(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<'dynasty' | 'redraft'> {
  try {
    const { count } = await supabase
      .from('formula_scores')
      .select('id', { count: 'exact', head: true })
      .eq('scoring_context', 'dynasty');
    return (count ?? 0) > 0 ? 'dynasty' : 'redraft';
  } catch {
    return 'redraft';
  }
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
  let userId: string | null = null;

  try {
    const authClient = createClient();
    const { data, error } = await authClient.auth.getUser();
    if (error) console.error('[dashboard] getUser error:', error);
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[dashboard] getUser failed:', err);
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
      console.error('[dashboard] profile query error:', error);
    } else if (!profile) {
      console.error('[dashboard] no profile found for user:', userId);
    } else if (!profile.sleeper_user_id) {
      needsOnboarding = true;
    } else {
      sleeperUserId = profile.sleeper_user_id;
    }
  } catch (err) {
    console.error('[dashboard] profile fetch failed:', err);
  }

  if (needsOnboarding) redirect('/onboarding');
  if (!sleeperUserId) redirect('/login');

  let leagueList: League[] = [];
  let playerIds: string[] = [];
  let myPlayers: TfoRow[] = [];
  let targets: TfoRow[] = [];
  let overvalued: TfoRow[] = [];
  let allRosterTfo: { tfo_score: number | null }[] = [];

  try {
    const supabase = createAdminClient();
    const scoringContext = await resolveScoringContext(supabase);

    try {
      // leagues are keyed by the Supabase auth uid (user_id). The table has no
      // owner_id or league_type columns — selecting/filtering them errors out.
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, status')
        .eq('user_id', userId);
      if (error) throw error;
      leagueList = (data ?? []) as League[];
    } catch (err) {
      console.error('[dashboard] leagues fetch failed:', err);
      leagueList = [];
    }

    try {
      // rosters.owner_id stores the Sleeper user id (NOT the Supabase auth uid),
      // and players is a text[] of player_ids — flatten every roster's array.
      const { data, error } = await supabase
        .from('rosters')
        .select('players')
        .eq('owner_id', sleeperUserId);
      if (error) throw error;
      const ids = new Set<string>();
      for (const r of data ?? []) {
        for (const pid of (r.players as string[] | null) ?? []) {
          if (pid) ids.add(String(pid));
        }
      }
      playerIds = Array.from(ids);
    } catch (err) {
      console.error('[dashboard] rosters fetch failed:', err);
      playerIds = [];
    }

    if (playerIds.length > 0) {
      try {
        // Scores live in formula_scores (the engine's serving table); player
        // metadata lives in players (PK = id). No FK for PostgREST embedding,
        // so fetch both and join in JS. Real rostered players, deduped, TFO desc.
        const [tfoRes, playerRes] = await Promise.all([
          supabase
            .from('formula_scores')
            .select('player_id, tfo_score, calculated_at')
            .eq('scoring_context', scoringContext)
            .in('player_id', playerIds)
            .order('tfo_score', { ascending: false }),
          supabase
            .from('players')
            .select('id, full_name, position, team, age')
            .in('id', playerIds),
        ]);
        if (tfoRes.error) throw tfoRes.error;
        if (playerRes.error) throw playerRes.error;

        const metaMap = new Map<string, PlayerRow>();
        for (const p of playerRes.data ?? []) {
          metaMap.set(String(p.id), {
            full_name: p.full_name,
            position: p.position,
            team: p.team,
            age: p.age,
          });
        }

        const seen = new Set<string>();
        myPlayers = [];
        for (const t of tfoRes.data ?? []) {
          const pid = String(t.player_id);
          if (seen.has(pid)) continue;
          seen.add(pid);
          myPlayers.push({
            player_id: pid,
            tfo_score: t.tfo_score,
            calculated_at: t.calculated_at,
            players: metaMap.get(pid) ?? null,
          });
        }
      } catch (err) {
        console.error('[dashboard] myPlayers fetch failed:', err);
        myPlayers = [];
      }
    }

    try {
      // Trade targets: top league-wide scores the user does NOT already roster.
      // formula_scores has no players FK, so join metadata in JS.
      let targetsQuery = supabase
        .from('formula_scores')
        .select('player_id, tfo_score')
        .eq('scoring_context', scoringContext)
        .order('tfo_score', { ascending: false })
        .limit(8);

      if (playerIds.length > 0) {
        targetsQuery = targetsQuery.not('player_id', 'in', `(${playerIds.join(',')})`);
      }

      const { data, error } = await targetsQuery;
      if (error) throw error;

      const targetIds = (data ?? []).map((r) => String(r.player_id));
      const metaById = new Map<string, PlayerRow>();
      if (targetIds.length > 0) {
        const { data: meta } = await supabase
          .from('players')
          .select('id, full_name, position, team')
          .in('id', targetIds);
        for (const p of meta ?? []) {
          metaById.set(String(p.id), { full_name: p.full_name, position: p.position, team: p.team });
        }
      }
      targets = (data ?? []).map((r) => ({
        player_id: String(r.player_id),
        tfo_score: r.tfo_score,
        players: metaById.get(String(r.player_id)) ?? null,
      }));
    } catch (err) {
      console.error('[dashboard] trade targets fetch failed:', err);
      targets = [];
    }

    // Overvalued + signal counts derive from the already-fetched roster scores
    // (myPlayers is deduped and sorted by TFO desc) — no extra queries needed.
    overvalued = myPlayers.slice(-5).reverse();
    allRosterTfo = myPlayers.map((p) => ({ tfo_score: p.tfo_score }));
  } catch (err) {
    console.error('[dashboard] createAdminClient or data load failed:', err);
  }

  const signalCounts = { boom: 0, hold: 0, bust: 0, total: allRosterTfo.length };
  for (const row of allRosterTfo) {
    const score = safeScore(row.tfo_score);
    if (score <= 0) continue;
    const v = getVerdict(score);
    if (v.class === 'boom') signalCounts.boom += 1;
    else if (v.class === 'hold') signalCounts.hold += 1;
    else signalCounts.bust += 1;
  }

  const validScores = allRosterTfo
    .map((r) => safeScore(r.tfo_score))
    .filter((s) => s > 0);

  const avgTfo =
    validScores.length > 0
      ? validScores.reduce((s, r) => s + r, 0) / validScores.length
      : 72;

  const tradeTargets = targets.map((row, i) => {
    const p = unwrapPlayer(row.players);
    const league = leagueList[i % Math.max(leagueList.length, 1)];
    const score = safeScore(row.tfo_score);
    return {
      playerId: row.player_id ?? `target-${i}`,
      playerName: p?.full_name ?? 'Unknown Player',
      position: p?.position ?? '—',
      team: p?.team ?? '—',
      leagueName: league?.name ?? 'League',
      tfoScore: score > 0 ? score : 50,
    };
  });

  const overvaluedAssets = overvalued.map((row, i) => {
    const p = unwrapPlayer(row.players);
    const score = safeScore(row.tfo_score);
    return {
      playerId: row.player_id ?? `overvalued-${i}`,
      playerName: p?.full_name ?? 'Unknown Player',
      position: p?.position ?? '—',
      team: p?.team ?? '—',
      delta: -Math.max(1, (70 - score) * 0.35),
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
        empireRating={Math.round(Math.min(99, Math.max(40, avgTfo + 8)) * 10) / 10}
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
            {myPlayers.length > 0 ? (
              <div
                className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {myPlayers.map((row) => {
                  const p = unwrapPlayer(row.players);
                  const score = safeScore(row.tfo_score);
                  return (
                    <div key={row.player_id} className="w-[185px] shrink-0">
                      <PlayerCard
                        playerId={row.player_id}
                        playerName={p?.full_name ?? 'Unknown Player'}
                        position={p?.position ?? '—'}
                        team={p?.team ?? '—'}
                        tfoScore={score > 0 ? score : 50}
                        radarVals={deriveRadarVals(row.player_id, score > 0 ? score : 50)}
                        tier={getTier(score > 0 ? score : 50)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[120px] items-center justify-center rounded-[9px] border border-border bg-surface font-mono text-[11px] text-muted">
                No rostered players synced yet — run a league sync to populate your board.
              </div>
            )}
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
        leagueCount={leagueList.length}
        edgeOpportunities={tradeTargets.length > 0 ? tradeTargets.length + 19 : 27}
      />
    </div>
  );
}
