import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchUserLeagues,
  fetchLeagueRosters,
  fetchTransactions,
  fetchNflState,
  fetchLeagueMatchups,
} from '@/lib/sleeper';
import { mergeSleeperRosterSettings } from '@/lib/sleeper/leagueCardLogo';
import { persistLastEmpireRatingAfterSync } from '@/lib/dashboard/empireRating';
import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function detectScoringType(s: Record<string, number>): string {
  const rec = s.rec ?? 0;
  if (rec >= 0.9) return 'ppr';
  if (rec >= 0.4) return 'half_ppr';
  return 'standard';
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: { users } } = await db.auth.admin.listUsers();
  if (!users?.length) return NextResponse.json({ leagues_synced: 0, rosters_synced: 0, transactions_synced: 0 });

  // Fetch NFL state once — used for matchup + transaction week range
  const nflState = await fetchNflState();
  const currentWeek = nflState?.week && nflState.week > 0 ? nflState.week : 1;
  const minWeek = Math.max(1, currentWeek - 4);

  let leagues_synced = 0;
  let rosters_synced = 0;
  let transactions_synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const redis = getRedis();

  async function logError(source: string, message: string, userId: string, meta: Record<string, unknown>) {
    try { await db.from('error_logs').insert({ source, message, user_id: userId, metadata: meta }); }
    catch { /* non-fatal */ }
  }

  for (const user of users) {
    const { data: profile } = await db
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .single();

    if (!profile?.sleeper_user_id) continue;

    // Skip users with no activity synced < 48h ago (offseason optimization)
    if (redis) {
      try {
        const [lastSync, hasActivity] = await Promise.all([
          redis.get<string>(`sync:last:${user.id}`),
          redis.get<string>(`sync:activity:${user.id}`),
        ]);
        if (lastSync && !hasActivity) {
          const hoursSince = (Date.now() - new Date(lastSync).getTime()) / 3600000;
          if (hoursSince < 48) { skipped++; continue; }
        }
      } catch { /* fall through and sync */ }
    }

    try {
      const leagues = await fetchUserLeagues(profile.sleeper_user_id, '2025');
      if (!leagues?.length) continue;

      let userLeaguesSynced = 0;
      let userRostersSynced = 0;

      for (const league of leagues) {
        // ── 1. Upsert league ────────────────────────────────────────────────
        const { error: leagueErr } = await db.from('leagues').upsert({
          id: league.league_id,
          user_id: user.id,
          name: league.name,
          season: league.season,
          total_rosters: league.total_rosters,
          scoring_settings: league.scoring_settings,
          settings: league.settings,
          status: league.status,
          // Sleeper returns roster_positions on the league object — keep it current.
          roster_positions:
            (league as unknown as { roster_positions?: string[] }).roster_positions ?? null,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (leagueErr) {
          errors.push(`league ${league.league_id}: ${leagueErr.message}`);
          await logError('cron/sync-sleeper/leagues', leagueErr.message, user.id, { league_id: league.league_id });
          continue;
        }

        // ── 2. Upsert league_settings ────────────────────────────────────────
        const rosterPositions = (league as unknown as { roster_positions?: string[] }).roster_positions ?? [];
        const scoringType = detectScoringType(league.scoring_settings);
        const superflex = rosterPositions.includes('SUPER_FLEX');
        const te_premium = (league.scoring_settings.bonus_rec_te ?? 0) > 0;
        const taxi_squad = ((league.settings.taxi_slots as number | undefined) ?? 0) > 0;

        await db.from('league_settings').upsert({
          league_id: league.league_id,
          scoring_type: scoringType,
          roster_requirements: { roster_positions: rosterPositions },
          league_size: league.total_rosters,
          superflex,
          te_premium,
          taxi_squad,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'league_id' });

        // ── 3. Sync rosters ─────────────────────────────────────────────────
        const rosters = await fetchLeagueRosters(league.league_id);
        for (const roster of rosters ?? []) {
          const { error: rosterErr } = await db.from('rosters').upsert(
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
          if (rosterErr) {
            errors.push(`roster ${roster.roster_id} in ${league.league_id}: ${rosterErr.message}`);
          } else {
            rosters_synced++;
            userRostersSynced++;
          }
        }

        // ── 4. Fetch current-week matchups (count only — no matchups table yet) ──
        await fetchLeagueMatchups(league.league_id, currentWeek).catch(() => null);

        // ── 5. Sync transactions (last 5 weeks) → trades table ──────────────
        for (let week = minWeek; week <= currentWeek; week++) {
          const txns = await fetchTransactions(league.league_id, week).catch(() => null);
          if (!txns?.length) continue;

          for (const txn of txns) {
            if (txn.type !== 'trade' || txn.status !== 'complete') continue;

            const assetsReceived = Object.keys(txn.adds ?? {});
            const assetsSent = Object.keys(txn.drops ?? {});
            const counterpartyRosterId = (txn.roster_ids ?? [])[1] ?? null;

            const { error: txnErr } = await db.from('trades').upsert({
              user_id: user.id,
              league_id: league.league_id,
              league_scoring_type: scoringType,
              assets_sent: assetsSent,
              assets_received: assetsReceived,
              counterparty_roster_id: counterpartyRosterId,
              status: 'accepted',
              source: 'sleeper',
              sleeper_transaction_id: txn.transaction_id,
              created_at: txn.created ? new Date(txn.created).toISOString() : new Date().toISOString(),
            }, { onConflict: 'sleeper_transaction_id', ignoreDuplicates: true });

            if (!txnErr) transactions_synced++;
          }
        }

        leagues_synced++;
        userLeaguesSynced++;

        // Rate limiting: 150ms between league syncs
        await sleep(150);
      }

      if (redis) {
        try {
          await redis.set(`sync:last:${user.id}`, new Date().toISOString(), { ex: 604800 });
          await redis.del(`sync:activity:${user.id}`);
        } catch { /* non-fatal */ }
      }

      if (userRostersSynced > 0 || userLeaguesSynced > 0) {
        await persistLastEmpireRatingAfterSync(user.id, profile.sleeper_user_id);
      }
    } catch (err) {
      const msg = String(err);
      errors.push(msg);
      await logError('cron/sync-sleeper', msg, user.id, {});
    }
  }

  if (redis) {
    try { await redis.set('metrics:pipeline:sleeper', new Date().toISOString(), { ex: 172800 }); }
    catch {}
  }

  return NextResponse.json({
    leagues_synced,
    rosters_synced,
    transactions_synced,
    skipped,
    total: users.length,
    errors: errors.slice(0, 10),
  });
}
