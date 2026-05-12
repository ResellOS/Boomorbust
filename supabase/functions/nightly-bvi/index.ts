/**
 * Supabase Edge Function — nightly-bvi
 *
 * Runs at 2:30 AM nightly via Supabase cron.
 * For every player in tfo_cache: computes BVI score, stores in player_values.
 * Generates SELL HIGH notifications when BVI delta > 800 above KTC.
 *
 * Manual trigger: POST /functions/v1/nightly-bvi
 * Auth: Authorization: Bearer {CRON_SECRET}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Environment ──────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const UPSTASH_REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '';
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '';

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
      error_message: `[nightly-bvi] ${message}`,
      metadata: context ?? {},
      created_at: new Date().toISOString(),
    });
  } catch { /* swallow */ }
}

// ─── Inlined helpers ──────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeKtcTo100(ktcValue: number): number {
  return clamp(((ktcValue - 1500) / 7500) * 100);
}

function ageCurveMult(position: string, age: number): number {
  const a = age;
  if (position === 'QB') {
    if (a >= 22 && a <= 32) return 1.0;
    if (a >= 33 && a <= 35) return 0.95;
    if (a >= 36 && a <= 38) return 0.82;
    return 0.7;
  }
  if (position === 'RB') {
    if (a >= 22 && a <= 25) return 1.0;
    if (a === 26) return 0.88;
    if (a === 27) return 0.78;
    if (a === 28) return 0.65;
    return 0.48;
  }
  if (position === 'WR') {
    if (a >= 22 && a <= 24) return 0.92;
    if (a >= 25 && a <= 28) return 1.0;
    if (a >= 29 && a <= 30) return 0.93;
    if (a >= 31 && a <= 32) return 0.84;
    return 0.72;
  }
  // TE
  if (a >= 22 && a <= 24) return 0.9;
  if (a >= 25 && a <= 28) return 1.0;
  if (a >= 29 && a <= 31) return 0.93;
  if (a >= 32 && a <= 33) return 0.82;
  return 0.68;
}

/**
 * BVI computation (mirrors lib/bvi/engine.ts core logic).
 *
 * BVI = (TFO trajectory × 0.30) + (scheme stability × 0.20)
 *     + (age curve × 0.20) + (positional scarcity × 0.15)
 *     + (trade momentum × 0.15)
 *
 * In batch mode: trajectory from tfo history, scarcity/momentum = defaults.
 * Output is KTC-scale (0-10,000): quality × 100.
 */
function computeBVI(
  tfoScores: number[],          // [latest, ...older], up to 3
  ktcValue: number,
  position: string,
  age: number,
  scoringType: string,
): {
  bviScore: number;
  delta: number;
  trend: 'rising' | 'falling' | 'neutral';
  signal: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED';
} {
  const latest = tfoScores[0] ?? 55;
  const oldest = tfoScores[tfoScores.length - 1] ?? latest;
  const trendDelta = latest - oldest;
  const trend: 'rising' | 'falling' | 'neutral' =
    trendDelta > 3 ? 'rising' : trendDelta < -3 ? 'falling' : 'neutral';

  // Component 1: TFO trajectory (0-100)
  const trajectoryAdj = trend === 'rising' ? 8 : trend === 'falling' ? -8 : 0;
  const tfoComponent = clamp(latest + trajectoryAdj);

  // Component 2: Scheme stability — neutral (no OC data in batch)
  const schemeComponent = 68;

  // Component 3: Age curve position
  const ageM = ageCurveMult(position, age);
  const ageCurveComponent = clamp(ageM * 100);

  // Component 4: Positional scarcity (static baselines)
  const scarcityBase: Record<string, number> = { QB: 72, RB: 65, WR: 60, TE: 70 };
  const scarcityComponent = scarcityBase[(position ?? 'WR').toUpperCase()] ?? 60;

  // Component 5: Trade momentum — neutral default (no trades table query in batch)
  const momentumComponent = 55;

  // Scoring type multiplier on KTC
  let ktcMult = 1.0;
  if (scoringType === 'superflex' && position === 'QB') ktcMult = 1.25;
  else if (scoringType === 'ppr' && position === 'TE') ktcMult = 1.08;
  else if ((scoringType === 'ppr' || scoringType === 'half_ppr') && position === 'WR') ktcMult = 1.04;

  const adjustedKtc = Math.round(ktcValue * ktcMult);

  // Weighted quality (0-100)
  const quality =
    tfoComponent   * 0.30 +
    schemeComponent * 0.20 +
    ageCurveComponent * 0.20 +
    scarcityComponent * 0.15 +
    momentumComponent * 0.15;

  // Scale to KTC range (0-10,000)
  const bviScore = Math.round(clamp(quality) * 100);
  const delta = bviScore - adjustedKtc;

  const signal: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' =
    delta >= 400 ? 'UNDERVALUED' :
    delta <= -400 ? 'OVERVALUED' : 'FAIR';

  return { bviScore, delta, trend, signal };
}

// ─── KTC data loader ──────────────────────────────────────────────────────────

interface KTCEntry { player_name: string; ktc_value: number }

async function loadKTCValues(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      const r = await fetch(`${UPSTASH_REDIS_REST_URL}/get/ktc:dynasty:values`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      });
      if (r.ok) {
        const json = await r.json() as { result?: string | null };
        if (json.result) {
          const entries = JSON.parse(json.result) as KTCEntry[];
          for (const e of entries) {
            if (e.player_name) map.set(e.player_name.toLowerCase(), e.ktc_value);
          }
          if (map.size > 0) return map;
        }
      }
    } catch { /* fall through */ }
  }

  // Direct scrape fallback
  try {
    const res = await fetch('https://keeptradecut.com/dynasty-rankings', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BoomOrBust/1.0)' },
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]) as Record<string, unknown>;
        const props = data?.props as Record<string, unknown> | undefined;
        const pageProps = props?.pageProps as Record<string, unknown> | undefined;
        const rankings = (
          pageProps?.rankings ?? pageProps?.players ?? pageProps?.initialRankings
        ) as Array<Record<string, unknown>> | undefined;

        if (Array.isArray(rankings)) {
          for (const p of rankings) {
            const name = String(p.playerName ?? p.name ?? '');
            const val = Number(p.value ?? 0);
            if (name && val) map.set(name.toLowerCase(), val);
          }
        }
      }
    }
  } catch { /* KTC unavailable */ }

  return map;
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

// ─── Sell-high notification builder ──────────────────────────────────────────

async function generateSellHighNotifications(
  supabase: ReturnType<typeof getSupabase>,
  sellHighPlayers: Array<{ playerId: string; name: string; bviScore: number; ktcValue: number; delta: number; leagueId: string }>,
): Promise<number> {
  if (!sellHighPlayers.length) return 0;

  // For each sell-high player, find users who own them
  const playerIds = Array.from(new Set(sellHighPlayers.map(p => p.playerId)));

  // Find rosters containing these players
  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('owner_id, league_id, players');

  type RosterRow = { owner_id: string | null; league_id: string; players: string[] | null };
  const rosters = (rosterRows ?? []) as RosterRow[];

  // Build player → list of (sleeper_owner_id, league_id) owning it
  const ownersByPlayer = new Map<string, Array<{ ownerSid: string; leagueId: string }>>();
  for (const r of rosters) {
    if (!r.owner_id || !r.players) continue;
    for (const pid of r.players) {
      if (!playerIds.includes(pid)) continue;
      if (!ownersByPlayer.has(pid)) ownersByPlayer.set(pid, []);
      ownersByPlayer.get(pid)!.push({ ownerSid: r.owner_id, leagueId: r.league_id });
    }
  }

  // Resolve sleeper_user_id → auth user_id via profiles
  const sleeperOwnerIds = Array.from(
    new Set(Array.from(ownersByPlayer.values()).flat().map(o => o.ownerSid)),
  );
  if (!sleeperOwnerIds.length) return 0;

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, sleeper_user_id')
    .in('sleeper_user_id', sleeperOwnerIds);

  const sidToAuthId = new Map<string, string>();
  for (const p of (profileRows ?? []) as Array<{ id: string; sleeper_user_id: string }>) {
    sidToAuthId.set(String(p.sleeper_user_id), p.id);
  }

  // Build notification rows
  const notifications: Record<string, unknown>[] = [];

  for (const sh of sellHighPlayers) {
    const owners = ownersByPlayer.get(sh.playerId) ?? [];
    for (const { ownerSid, leagueId } of owners) {
      if (leagueId !== sh.leagueId) continue; // only notify for the relevant league
      const authId = sidToAuthId.get(ownerSid);
      if (!authId) continue;

      const sign = sh.delta >= 0 ? '+' : '';
      notifications.push({
        user_id:     authId,
        type:        'sell_high',
        player_id:   sh.playerId,
        league_id:   leagueId,
        message:     `SELL HIGH: ${sh.name} — BVI ${sh.bviScore.toLocaleString()} vs KTC ${sh.ktcValue.toLocaleString()} (${sign}${sh.delta.toLocaleString()} delta). Market is undervaluing them — move now.`,
        redirects_to: '/dashboard/trade',
        read:        false,
        created_at:  new Date().toISOString(),
      });
    }
  }

  if (!notifications.length) return 0;

  // Batch insert notifications in chunks
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications.slice(i, i + BATCH));
    if (!error) inserted += Math.min(BATCH, notifications.length - i);
  }

  return inserted;
}

// ─── Main BVI sync logic ──────────────────────────────────────────────────────

interface BVISyncResult {
  playersProcessed: number;
  playerValuesUpserted: number;
  sellHighNotifications: number;
  errors: number;
}

async function runNightlyBVI(): Promise<BVISyncResult> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

  let errors = 0;

  // 1. Parallel data load
  const [sleeperPlayers, ktcMap, tfoResult] = await Promise.all([
    loadSleeperPlayers(),
    loadKTCValues(),
    supabase
      .from('tfo_cache')
      .select('player_id, league_id, scoring_type, tfo_score, calculated_at')
      .order('calculated_at', { ascending: false }),
  ]);

  type TfoRow = {
    player_id: string;
    league_id: string | null;
    scoring_type: string;
    tfo_score: number;
    calculated_at: string;
  };
  const tfoRows = (tfoResult.data ?? []) as TfoRow[];

  // Group TFO rows by (player_id, scoring_type): keep latest 3 per combo
  const tfoHistory = new Map<string, number[]>();
  for (const r of tfoRows) {
    const key = `${r.player_id}::${r.scoring_type}`;
    if (!tfoHistory.has(key)) tfoHistory.set(key, []);
    const arr = tfoHistory.get(key)!;
    if (arr.length < 3) arr.push(Number(r.tfo_score));
  }

  // 2. Compute BVI per (player_id, scoring_type) combo
  const SELL_HIGH_THRESHOLD = 800; // BVI delta > 800 above KTC = SELL signal
  const sellHighPlayers: Array<{
    playerId: string; name: string; bviScore: number; ktcValue: number; delta: number; leagueId: string;
  }> = [];

  const pvRows: Record<string, unknown>[] = [];

  // Deduplicate by (player_id, scoring_type)
  const processed = new Set<string>();

  // Group tfo rows by player+scoring to find their primary league
  const playerLeagueMap = new Map<string, string>(); // player_id → first league_id found
  for (const r of tfoRows) {
    if (r.league_id && !playerLeagueMap.has(r.player_id)) {
      playerLeagueMap.set(r.player_id, r.league_id);
    }
  }

  for (const r of tfoRows) {
    const key = `${r.player_id}::${r.scoring_type}`;
    if (processed.has(key)) continue;
    processed.add(key);

    const p = sleeperPlayers[r.player_id];
    const position = (p?.position ?? 'WR').toUpperCase();
    if (!SKILL.has(position)) continue;

    const age = p?.age ?? 26;
    const playerName = p?.full_name ?? r.player_id;
    const ktcValue = ktcMap.get(playerName.toLowerCase()) ?? 0;

    const scores = tfoHistory.get(key) ?? [Number(r.tfo_score)];
    const { bviScore, delta, trend, signal } = computeBVI(
      scores, ktcValue, position, age, r.scoring_type,
    );

    pvRows.push({
      player_id:    r.player_id,
      scoring_type: r.scoring_type,
      bvi_score:    bviScore,
      ktc_value:    ktcValue,
      tfo_score:    scores[0] ?? 0,
      delta,
      trend,
      calculated_at: now,
    });

    // Sell-high signal
    if (delta >= SELL_HIGH_THRESHOLD && signal === 'UNDERVALUED' && ktcValue > 0) {
      const leagueId = playerLeagueMap.get(r.player_id) ?? '';
      if (leagueId) {
        sellHighPlayers.push({ playerId: r.player_id, name: playerName, bviScore, ktcValue, delta, leagueId });
      }
    }
  }

  // 3. Batch upsert player_values
  const BATCH = 500;
  let upserted = 0;
  for (let i = 0; i < pvRows.length; i += BATCH) {
    const { error } = await supabase
      .from('player_values')
      .upsert(pvRows.slice(i, i + BATCH), { onConflict: 'player_id,scoring_type' });
    if (error) {
      errors++;
      await logError(supabase, `player_values upsert batch ${i / BATCH} failed: ${error.message}`);
    } else {
      upserted += Math.min(BATCH, pvRows.length - i);
    }
  }

  // 4. Generate SELL HIGH notifications
  let sellHighNotifications = 0;
  if (sellHighPlayers.length > 0) {
    try {
      sellHighNotifications = await generateSellHighNotifications(supabase, sellHighPlayers);
    } catch (err) {
      errors++;
      await logError(supabase, `sell-high notification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    playersProcessed: processed.size,
    playerValuesUpserted: upserted,
    sellHighNotifications,
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

    const result = await runNightlyBVI();

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const supabase = getSupabase();
      await supabase.from('error_logs').insert({
        error_message: `[nightly-bvi] Uncaught: ${msg}`,
        created_at: new Date().toISOString(),
      });
    } catch { /* swallow */ }

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
