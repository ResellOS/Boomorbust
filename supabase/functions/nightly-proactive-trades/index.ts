/**
 * Supabase Edge Function — nightly-proactive-trades
 *
 * Runs at 3:00 AM nightly via Supabase cron.
 * For each user × league: identifies weak positional slots and surfaces
 * the top 3 trade acquisition targets from other managers in that league.
 * Results stored as TRADE_SUGGESTION notifications.
 *
 * Manual trigger: POST /functions/v1/nightly-proactive-trades
 * Auth: Authorization: Bearer {CRON_SECRET}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Environment ──────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── Error logger ─────────────────────────────────────────────────────────────

async function logError(
  supabase: ReturnType<typeof getSupabase>,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      error_message: `[nightly-proactive-trades] ${message}`,
      metadata: context ?? {},
      created_at: new Date().toISOString(),
    });
  } catch { /* swallow */ }
}

// ─── Inlined TFO grade helper ─────────────────────────────────────────────────

function tfoGrade(score: number): string {
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

// ─── Verdict-to-priority ──────────────────────────────────────────────────────

function verdictPriority(verdict: string | null): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (verdict === 'BOOM' || verdict === 'LEAN_BOOM') return 'HIGH';
  if (verdict === 'NEUTRAL') return 'MEDIUM';
  return 'LOW';
}

// ─── Gap-position slot labels ─────────────────────────────────────────────────

function slotLabel(pos: string, rank: number): string {
  return `${pos.toUpperCase()}${rank}`;
}

// ─── Notification deduplication: skip if sent in last 24h for same player+league ─

async function recentNotificationExists(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  playerId: string,
  leagueId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'trade_suggestion')
    .eq('player_id', playerId)
    .eq('league_id', leagueId)
    .gte('created_at', cutoff)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ─── Sleeper player lookup ────────────────────────────────────────────────────

interface SleeperPlayer { full_name?: string; position?: string; age?: number }

async function loadSleeperPlayers(): Promise<Record<string, SleeperPlayer>> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) return {};
    return await res.json() as Record<string, SleeperPlayer>;
  } catch { return {}; }
}

// ─── Main proactive trades logic ──────────────────────────────────────────────

interface ProactiveResult {
  usersProcessed: number;
  leaguesScanned: number;
  notificationsCreated: number;
  errors: number;
}

async function runNightlyProactiveTrades(): Promise<ProactiveResult> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  const KTC_FLOOR: Record<string, number> = { WR: 3500, RB: 3000, QB: 4000, TE: 2000 };

  let errors = 0;
  let notificationsCreated = 0;
  let leaguesScanned = 0;

  // ── 1. Load data in parallel ─────────────────────────────────────────────────
  const [sleeperPlayers, profilesResult, rostersResult, tfoResult, pvResult] = await Promise.all([
    loadSleeperPlayers(),
    supabase.from('profiles').select('id, sleeper_user_id'),
    supabase.from('rosters').select('league_id, owner_id, players'),
    supabase.from('tfo_cache').select('player_id, league_id, scoring_type, tfo_score, verdict').order('calculated_at', { ascending: false }),
    supabase.from('player_values').select('player_id, bvi_score, ktc_value, delta, scoring_type'),
  ]);

  type ProfileRow = { id: string; sleeper_user_id: string | null };
  type RosterRow  = { league_id: string; owner_id: string | null; players: string[] | null };
  type TfoRow     = { player_id: string; league_id: string | null; tfo_score: number; verdict: string | null };
  type PvRow      = { player_id: string; bvi_score: number; ktc_value: number; delta: number; scoring_type: string };

  const profiles  = (profilesResult.data  ?? []) as ProfileRow[];
  const rosters   = (rostersResult.data   ?? []) as RosterRow[];
  const tfoRows   = (tfoResult.data       ?? []) as TfoRow[];
  const pvRows    = (pvResult.data        ?? []) as PvRow[];

  // Build lookups
  const sidToAuthId  = new Map<string, string>();   // sleeper_user_id → auth UUID
  const authIdToSid  = new Map<string, string>();   // auth UUID → sleeper_user_id
  for (const p of profiles) {
    if (!p.sleeper_user_id) continue;
    sidToAuthId.set(String(p.sleeper_user_id), p.id);
    authIdToSid.set(p.id, String(p.sleeper_user_id));
  }

  // TFO by (player_id, league_id) — keep latest per combo
  const tfoByKey = new Map<string, { tfoScore: number; verdict: string | null }>();
  for (const r of tfoRows) {
    if (!r.league_id) continue;
    const key = `${r.player_id}::${r.league_id}`;
    if (!tfoByKey.has(key)) {
      tfoByKey.set(key, { tfoScore: Number(r.tfo_score), verdict: r.verdict });
    }
  }

  // BVI delta by player_id (global, first scoring_type found)
  const bviByPlayer = new Map<string, number>();
  for (const r of pvRows) {
    if (!bviByPlayer.has(r.player_id)) {
      bviByPlayer.set(r.player_id, r.bvi_score - r.ktc_value);
    }
  }

  // Group rosters by league
  const rostersByLeague = new Map<string, RosterRow[]>();
  for (const r of rosters) {
    if (!rostersByLeague.has(r.league_id)) rostersByLeague.set(r.league_id, []);
    rostersByLeague.get(r.league_id)!.push(r);
  }

  // ── 2. For each registered user × league they're in ──────────────────────────
  const notificationRows: Record<string, unknown>[] = [];

  for (const profile of profiles) {
    if (!profile.sleeper_user_id) continue;
    const sleeperSid = String(profile.sleeper_user_id);
    const authId = profile.id;

    // Leagues where this user has a roster
    const myRosters = rosters.filter(r => r.owner_id === sleeperSid);
    if (!myRosters.length) continue;

    for (const myRoster of myRosters) {
      const { league_id: leagueId, players: myPlayers } = myRoster;
      if (!leagueId || !myPlayers?.length) continue;

      leaguesScanned++;

      // Collect my players' TFO by position
      const posTfoSums: Record<string, number[]> = {};
      for (const pid of myPlayers) {
        const p = sleeperPlayers[pid];
        const pos = (p?.position ?? '').toUpperCase();
        if (!SKILL.has(pos)) continue;
        const tfo = tfoByKey.get(`${pid}::${leagueId}`)?.tfoScore ?? 55;
        if (!posTfoSums[pos]) posTfoSums[pos] = [];
        posTfoSums[pos]!.push(tfo);
      }

      // Avg TFO per position → weakest positions (sorted asc)
      const posAvg: Record<string, number> = {};
      for (const [pos, scores] of Object.entries(posTfoSums)) {
        posAvg[pos] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
      const sortedGaps = Object.entries(posAvg)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 2); // top 2 weakest positions

      if (!sortedGaps.length) continue;

      // Scan other rosters in this league for players at gap positions
      const otherRosters = (rostersByLeague.get(leagueId) ?? [])
        .filter(r => r.owner_id !== sleeperSid);

      const suggestions: Array<{
        playerId: string;
        playerName: string;
        position: string;
        gapSlot: string;
        tfoScore: number;
        verdict: string | null;
        bviDelta: number;
        score: number;
      }> = [];

      for (const [gapPos, myAvgTfo] of sortedGaps) {
        const gapSlot = slotLabel(gapPos, myAvgTfo < 55 ? 1 : 2);

        for (const other of otherRosters) {
          for (const pid of (other.players ?? [])) {
            const p = sleeperPlayers[pid];
            if (!p || (p.position ?? '').toUpperCase() !== gapPos) continue;

            const tfoEntry = tfoByKey.get(`${pid}::${leagueId}`);
            const tfoScore = tfoEntry?.tfoScore ?? 55;
            const verdict = tfoEntry?.verdict ?? null;

            // Skip players with bust signal
            if (verdict === 'BUST') continue;
            // Skip if their TFO is not better than my gap average
            if (tfoScore <= myAvgTfo + 5) continue;

            const bviDelta = bviByPlayer.get(pid) ?? 0;
            // Composite suggestion score: TFO improvement + BVI undervaluation bonus
            const score = (tfoScore - myAvgTfo) + (bviDelta > 400 ? 10 : 0);

            suggestions.push({
              playerId: pid,
              playerName: p.full_name ?? pid,
              position: gapPos,
              gapSlot,
              tfoScore,
              verdict,
              bviDelta,
              score,
            });
          }
        }
      }

      if (!suggestions.length) continue;

      // Sort by score, deduplicate by player, keep top 3
      const seen = new Set<string>();
      const top3 = suggestions
        .sort((a, b) => b.score - a.score)
        .filter(s => {
          if (seen.has(s.playerId)) return false;
          seen.add(s.playerId);
          return true;
        })
        .slice(0, 3);

      for (const s of top3) {
        try {
          // Skip if notified in last 24h
          const exists = await recentNotificationExists(supabase, authId, s.playerId, leagueId);
          if (exists) continue;

          const priority = verdictPriority(s.verdict);
          const grade = tfoGrade(s.tfoScore);
          const bviNote = s.bviDelta >= 400
            ? ` BVI shows them undervalued by +${s.bviDelta.toLocaleString()} — market window is open.`
            : '';

          const message =
            `${priority === 'HIGH' ? '🔥 ' : ''}Trade Target: ${s.playerName} (${s.position}) fills your ${s.gapSlot} gap — TFO ${s.tfoScore} (${grade}).${bviNote} Make this offer before their value pops.`;

          notificationRows.push({
            user_id:     authId,
            type:        'trade_suggestion',
            player_id:   s.playerId,
            league_id:   leagueId,
            message,
            redirects_to: '/dashboard/trade',
            read:        false,
            created_at:  now,
          });
        } catch (err) {
          errors++;
          await logError(supabase, `notification build failed for ${s.playerId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // ── 3. Batch insert all notifications ─────────────────────────────────────────
  const BATCH = 200;
  for (let i = 0; i < notificationRows.length; i += BATCH) {
    const { error } = await supabase
      .from('notifications')
      .insert(notificationRows.slice(i, i + BATCH));

    if (error) {
      errors++;
      await logError(supabase, `notification batch insert ${i / BATCH} failed: ${error.message}`);
    } else {
      notificationsCreated += Math.min(BATCH, notificationRows.length - i);
    }
  }

  return {
    usersProcessed: profiles.length,
    leaguesScanned,
    notificationsCreated,
    errors,
  };
}

// ─── Edge function handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!CRON_SECRET || token !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await runNightlyProactiveTrades();

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const supabase = getSupabase();
      await supabase.from('error_logs').insert({
        error_message: `[nightly-proactive-trades] Uncaught: ${msg}`,
        created_at: new Date().toISOString(),
      });
    } catch { /* swallow */ }

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
