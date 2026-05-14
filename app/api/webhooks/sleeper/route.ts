/**
 * Sleeper webhook receiver.
 * Sleeper POSTs league events here — we trigger a targeted sync for the affected league.
 * Register this URL in Sleeper as: https://boomorbust.app/api/webhooks/sleeper
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueRosters, fetchLeagueFull } from '@/lib/sleeper';
import { mergeSleeperRosterSettings } from '@/lib/sleeper/leagueCardLogo';

export const maxDuration = 30;

// Sleeper webhook event types we care about
const RELEVANT_EVENTS = new Set([
  'trade_accepted',
  'waiver_awarded',
  'roster_add',
  'roster_drop',
  'draft_pick_traded',
  'league_roster_updated',
]);

interface SleeperWebhookPayload {
  type?: string;
  league_id?: string;
  roster_id?: number;
  transaction_id?: string;
}

export async function POST(request: NextRequest) {
  // Optional signature verification (Sleeper doesn't sign webhooks currently,
  // but we guard with a shared secret query param for safety)
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.SLEEPER_WEBHOOK_SECRET && secret !== process.env.SLEEPER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let payload: SleeperWebhookPayload;
  try {
    payload = (await request.json()) as SleeperWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, league_id } = payload;

  if (!type || !league_id) {
    return NextResponse.json({ ok: true, skipped: 'missing type or league_id' });
  }

  if (!RELEVANT_EVENTS.has(type)) {
    return NextResponse.json({ ok: true, skipped: `event type ${type} not tracked` });
  }

  const db = createAdminClient();

  // Find which user owns this league so we can sync it
  const { data: league } = await db
    .from('leagues')
    .select('user_id, name')
    .eq('id', league_id)
    .maybeSingle();

  if (!league?.user_id) {
    return NextResponse.json({ ok: true, skipped: 'league not found in DB' });
  }

  try {
    // Refresh league metadata
    const leagueData = await fetchLeagueFull(league_id);
    if (leagueData) {
      await db.from('leagues').upsert({
        id: leagueData.league_id,
        user_id: league.user_id,
        name: leagueData.name,
        season: leagueData.season,
        total_rosters: leagueData.total_rosters,
        scoring_settings: leagueData.scoring_settings,
        settings: leagueData.settings,
        status: leagueData.status,
        synced_at: new Date().toISOString(),
      });
    }

    // Refresh rosters for this league
    const rosters = await fetchLeagueRosters(league_id);
    if (rosters?.length) {
      for (const roster of rosters) {
        await db.from('rosters').upsert(
          {
            roster_id: roster.roster_id,
            league_id,
            owner_id: roster.owner_id,
            players: roster.players ?? [],
            starters: roster.starters ?? [],
            settings: mergeSleeperRosterSettings(roster as unknown as Record<string, unknown>),
          },
          { onConflict: 'roster_id,league_id' },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      event: type,
      league_id,
      rosters_synced: rosters?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
