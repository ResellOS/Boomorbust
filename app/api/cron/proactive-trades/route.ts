/**
 * Proactive trade scanner — nightly cron.
 * For each active user, scans their rosters for sell-high candidates
 * and matching buy-low targets across all leagues, then writes
 * notifications to the notifications table.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface PlayerValueRow {
  player_id: string;
  bvi_score: number;
  ktc_value: number;
  tfo_score: number;
  delta: number;
  trend: string;
}

interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Pull all active users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, sleeper_user_id')
    .not('sleeper_user_id', 'is', null);

  if (!users || users.length === 0) {
    return NextResponse.json({ scanned: 0, notifications: 0 });
  }

  let totalNotifications = 0;

  for (const user of users as Array<{ id: string; sleeper_user_id: string }>) {
    // Get user's leagues
    const { data: leagueRows } = await supabase
      .from('league_settings')
      .select('league_id')
      .eq('owner_id', user.id);

    const leagueIds = (leagueRows as Array<{ league_id: string }> | null)?.map(r => r.league_id) ?? [];
    if (!leagueIds.length) continue;

    // Get all player IDs on user's rosters
    const { data: rosterRows } = await supabase
      .from('rosters')
      .select('players')
      .in('league_id', leagueIds)
      .eq('owner_id', user.id);

    const ownedIds = Array.from(new Set(
      (rosterRows as Array<{ players: string[] | null }> | null)
        ?.flatMap(r => r.players ?? []) ?? [],
    ));

    if (!ownedIds.length) continue;

    // Get player values for owned players
    const { data: ownedValues } = await supabase
      .from('player_values')
      .select('player_id, bvi_score, ktc_value, tfo_score, delta, trend')
      .in('player_id', ownedIds)
      .eq('scoring_type', 'ppr');

    // Sell-high candidates: trend RISING, delta > 10 (BVI > KTC norm)
    const sellHighCandidates = ((ownedValues as PlayerValueRow[] | null) ?? [])
      .filter(p => p.trend === 'RISING' && p.delta > 10)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);

    // Buy-low targets: not owned, delta < -10 (undervalued), high BVI
    const { data: buyLowValues } = await supabase
      .from('player_values')
      .select('player_id, bvi_score, ktc_value, tfo_score, delta, trend')
      .eq('scoring_type', 'ppr')
      .lt('delta', -10)
      .gte('bvi_score', 60)
      .not('player_id', 'in', `(${ownedIds.map(id => `"${id}"`).join(',')})`)
      .order('bvi_score', { ascending: false })
      .limit(3);

    const notifications: NotificationInsert[] = [];
    const now = new Date().toISOString();

    for (const sell of sellHighCandidates) {
      const { data: bbv } = await supabase
        .from('bbv_values')
        .select('player_name, position')
        .eq('player_id', sell.player_id)
        .maybeSingle();
      const name = (bbv as { player_name?: string } | null)?.player_name ?? sell.player_id;
      const pos = (bbv as { position?: string } | null)?.position ?? '';

      notifications.push({
        user_id: user.id,
        type: 'sell_high',
        title: `Sell-High Window: ${name}`,
        body: `${name} (${pos}) BVI is rising — market may be overvaluing. Consider cashing in now while trade value is peaked.`,
        metadata: {
          player_id: sell.player_id,
          bvi_score: sell.bvi_score,
          ktc_value: sell.ktc_value,
          delta: sell.delta,
          trend: sell.trend,
          redirect_to: `/dashboard/trade?player=${sell.player_id}&mode=sell`,
        },
        created_at: now,
      });
    }

    for (const buy of (buyLowValues as PlayerValueRow[] | null) ?? []) {
      const { data: bbv } = await supabase
        .from('bbv_values')
        .select('player_name, position')
        .eq('player_id', buy.player_id)
        .maybeSingle();
      const name = (bbv as { player_name?: string } | null)?.player_name ?? buy.player_id;
      const pos = (bbv as { position?: string } | null)?.position ?? '';

      notifications.push({
        user_id: user.id,
        type: 'buy_low',
        title: `Buy-Low Alert: ${name}`,
        body: `${name} (${pos}) BVI score of ${buy.bvi_score} is well above market price. Potential undervalued target.`,
        metadata: {
          player_id: buy.player_id,
          bvi_score: buy.bvi_score,
          ktc_value: buy.ktc_value,
          delta: buy.delta,
          redirect_to: `/dashboard/trade?target=${buy.player_id}`,
        },
        created_at: now,
      });
    }

    if (notifications.length) {
      await supabase.from('notifications').insert(notifications);
      totalNotifications += notifications.length;
    }
  }

  return NextResponse.json({
    scanned: users.length,
    notifications: totalNotifications,
  });
}
