import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchUserLeagues, fetchLeagueFull, fetchLeagueRosters, fetchNflState, type SleeperLeague, type SleeperLeagueFull } from '@/lib/sleeper';
import { mergeSleeperRosterSettings } from '@/lib/sleeper/leagueCardLogo';
import { persistLastEmpireRatingAfterSync } from '@/lib/dashboard/empireRating';

// Rosters + full engine (TFO, GM profiles, BBV, trade opps) run inline on a
// user's Sync click, so allow up to 5 minutes (requires Vercel Pro).
export const maxDuration = 300;

export async function POST(req: Request) {
  // Auth check via cookie-based client (anon key)
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin client for all DB writes — bypasses RLS, prevents silent roster insert failures
  const db = createAdminClient();

  const body = await req.json().catch(() => ({})) as { league_ids?: unknown };
  const leagueIds: string[] = Array.isArray(body.league_ids)
    ? (body.league_ids as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.sleeper_user_id) {
    return NextResponse.json(
      { error: 'No Sleeper user ID found. Update your profile first.' },
      { status: 400 }
    );
  }

  // Derive the active season from Sleeper's NFL state rather than hardcoding,
  // so dynasty leagues for the current season sync during the offseason too.
  const nflState = await fetchNflState();
  const season = nflState?.season ?? new Date().getFullYear().toString();

  let leagues: SleeperLeague[] | null;
  if (leagueIds.length > 0) {
    const results = await Promise.all(leagueIds.map((id) => fetchLeagueFull(id)));
    leagues = results.filter((l): l is SleeperLeagueFull => l !== null);
  } else {
    leagues = await fetchUserLeagues(profile.sleeper_user_id, season);
  }

  if (!leagues) {
    return NextResponse.json({ error: 'Failed to fetch leagues from Sleeper' }, { status: 502 });
  }

  const userId = user.id;

  console.log(`[sync] user ${userId}: fetched ${leagues.length} leagues from Sleeper`);
  let leaguesSynced = 0;
  let rostersSynced = 0;
  const syncErrors: string[] = [];

  async function logError(source: string, message: string, metadata: Record<string, unknown>) {
    try {
      await db.from('error_logs').insert({ source, message, user_id: userId, metadata });
    } catch { /* non-fatal */ }
  }

  for (const league of leagues) {
    const { error: leagueError } = await db.from('leagues').upsert(
      {
        id: league.league_id,
        user_id: userId,
        name: league.name,
        season: league.season,
        total_rosters: league.total_rosters,
        scoring_settings: league.scoring_settings,
        settings: league.settings,
        status: league.status,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (leagueError) {
      const msg = `league ${league.league_id} (${league.name}): ${leagueError.message}`;
      console.error(`[sync] ${msg}`);
      syncErrors.push(msg);
      await logError('sync/leagues', msg, { league_id: league.league_id, code: leagueError.code });
      continue;
    }

    leaguesSynced++;

    // Fetch rosters and log count before any write
    const rosters = await fetchLeagueRosters(league.league_id);
    console.log(`[sync] league ${league.league_id} (${league.name}): ${rosters?.length ?? 'null'} rosters from Sleeper`);

    if (!rosters?.length) continue;

    for (const roster of rosters) {
      const { error: rosterError } = await db.from('rosters').upsert(
        {
          roster_id: roster.roster_id,
          league_id: league.league_id,
          owner_id: roster.owner_id,
          players: roster.players ?? [],
          starters: roster.starters ?? [],
          settings: mergeSleeperRosterSettings(roster as unknown as Record<string, unknown>),
        },
        { onConflict: 'roster_id,league_id' },
      );

      if (rosterError) {
        const msg = `roster ${roster.roster_id} in league ${league.league_id}: ${rosterError.message}`;
        console.error(`[sync] ${msg}`);
        syncErrors.push(msg);
        await logError('sync/rosters', msg, {
          roster_id: roster.roster_id,
          league_id: league.league_id,
          code: rosterError.code,
        });
      } else {
        rostersSynced++;
      }
    }
  }

  console.log(`[sync] done — leagues: ${leaguesSynced}, rosters: ${rostersSynced}, errors: ${syncErrors.length}`);

  if (rostersSynced > 0 || leaguesSynced > 0) {
    await persistLastEmpireRatingAfterSync(userId, profile.sleeper_user_id);
  }

  // ── Run the engine INLINE so the dashboard is fresh immediately, instead of
  // waiting up to a day for the nightly crons. Each call is best-effort and
  // non-fatal; a partial engine run still returns success. Mirrors the auth
  // patterns the cron routes expect (CRON_SECRET) + the per-user TFO route.
  const engines: Record<string, boolean> = {
    tfo: false,
    managerProfiles: false,
    bbv: false,
    tradeOpps: false,
  };

  if (rostersSynced > 0 || leaguesSynced > 0) {
    const origin = new URL(req.url).origin;
    const cookie = req.headers.get('cookie') ?? '';
    const cronAuth = `Bearer ${process.env.CRON_SECRET ?? ''}`;

    // 1. TFO pre-warm for this user's rostered players (session/cookie auth).
    try {
      const r = await fetch(`${origin}/api/onboarding/calculate-tfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({}),
      });
      engines.tfo = r.ok;
    } catch (err) {
      console.error('[sync] calculate-tfo failed:', err);
    }

    // 2. GM / manager profiles (CRON_SECRET, POST).
    try {
      const r = await fetch(`${origin}/api/cron/sync-manager-profiles`, {
        method: 'POST',
        headers: { Authorization: cronAuth },
      });
      engines.managerProfiles = r.ok;
    } catch (err) {
      console.error('[sync] sync-manager-profiles failed:', err);
    }

    // 3. BBV / BVI value engine (CRON_SECRET, GET).
    try {
      const r = await fetch(`${origin}/api/cron/calculate-bbv`, {
        headers: { Authorization: cronAuth },
      });
      engines.bbv = r.ok;
    } catch (err) {
      console.error('[sync] calculate-bbv failed:', err);
    }

    // 4. Proactive trade opportunities (CRON_SECRET, GET).
    try {
      const r = await fetch(`${origin}/api/cron/proactive-trades`, {
        headers: { Authorization: cronAuth },
      });
      engines.tradeOpps = r.ok;
    } catch (err) {
      console.error('[sync] proactive-trades failed:', err);
    }

    console.log('[sync] engines:', JSON.stringify(engines));
  }

  return NextResponse.json({
    success: true,
    leagues_synced: leaguesSynced,
    rosters_synced: rostersSynced,
    engines,
    errors: syncErrors.length > 0 ? syncErrors : undefined,
    message: 'Sync complete. Dashboard data is now updated.',
  });
}
