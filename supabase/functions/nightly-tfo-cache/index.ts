/**
 * Supabase Edge Function — nightly-tfo-cache
 *
 * Runs at 2:00 AM nightly via Supabase cron.
 * Computes structural TFO scores for every player on every user roster,
 * applying per-league scoring context, and upserts into tfo_cache.
 *
 * Manual trigger: POST /functions/v1/nightly-tfo-cache
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
  fnName: string,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      error_message: `[${fnName}] ${message}`,
      metadata: context ?? {},
      created_at: new Date().toISOString(),
    });
  } catch { /* swallow log failure */ }
}

// ─── Inlined TFO helpers (Deno-compatible; mirrors lib/tfo/formula.ts) ───────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Age curve multiplier by position — matches formula.ts exactly. */
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

function normalizeKtcTo100(ktcValue: number): number {
  return clamp(((ktcValue - 1500) / 7500) * 100);
}

/**
 * Structural TFO calculation — faithful to the formula, uses KTC as the
 * market-implied opportunity signal since OC/OL data isn't available in batch.
 *
 *   TFO = (OPS × 0.35) + (SFS × 0.25) + (F-FIG proxy × 0.25) + (SIT × 0.15)
 */
function computeStructuralTFO(
  position: string,
  age: number,
  ktcValue: number,
  scoringType: string,
): { tfoScore: number; opsScore: number; sfsScore: number; sitScore: number; grade: string; verdict: string } {
  const ageM = ageCurveMult(position, age);
  const ktcN = normalizeKtcTo100(ktcValue);

  // Scoring type modifier
  let scoringMod = 1.0;
  if (scoringType === 'superflex' && position === 'QB') scoringMod = 1.15;
  else if (scoringType === 'ppr' && position === 'TE') scoringMod = 1.05;
  else if ((scoringType === 'ppr' || scoringType === 'half_ppr') && position === 'WR') scoringMod = 1.03;
  else if (scoringType === 'standard' && position === 'RB') scoringMod = 1.05;

  // OPS — opportunity/usage signal, proxied from KTC market rank
  const opsScore = clamp(ktcN * 0.75 + 22);

  // SFS — scheme fit stability, neutral default (no OC data in batch)
  const sfsScore = 68;

  // F-FIG proxy — age-adjusted quality signal
  const ffigProxy = clamp(ageM * (ktcN * 0.60 + 40));

  // SIT — situation / market signal
  const sitScore = clamp(ktcN * 0.80 + 18);

  const raw = opsScore * 0.35 + sfsScore * 0.25 + ffigProxy * 0.25 + sitScore * 0.15;
  const tfoScore = Math.round(clamp(raw * scoringMod) * 10) / 10;

  const grade =
    tfoScore >= 88 ? 'ELITE' :
    tfoScore >= 75 ? 'HIGH VALUE' :
    tfoScore >= 60 ? 'VIABLE' :
    tfoScore >= 45 ? 'SPECULATIVE' : 'AVOID';

  const verdict =
    tfoScore >= 85 ? 'BOOM' :
    tfoScore >= 72 ? 'LEAN_BOOM' :
    tfoScore >= 58 ? 'NEUTRAL' :
    tfoScore >= 44 ? 'LEAN_BUST' : 'BUST';

  return { tfoScore, opsScore, sfsScore, sitScore, grade, verdict };
}

// ─── KTC data loader ──────────────────────────────────────────────────────────

interface KTCEntry { player_name: string; position: string; age: number; ktc_value: number }

async function loadKTCValues(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  // Try Upstash Redis cache first
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
    } catch { /* fall through to direct scrape */ }
  }

  // Direct scrape from KTC as fallback
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

// ─── Sleeper player data loader ───────────────────────────────────────────────

interface SleeperPlayer {
  full_name?: string;
  position?: string;
  age?: number;
  team?: string;
  status?: string;
}

async function loadSleeperPlayers(): Promise<Record<string, SleeperPlayer>> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) return {};
    return await res.json() as Record<string, SleeperPlayer>;
  } catch {
    return {};
  }
}

// ─── Main sync logic ──────────────────────────────────────────────────────────

interface SyncResult { processed: number; upserted: number; errors: number }

async function runNightlyTFOCache(): Promise<SyncResult> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

  let processed = 0;
  let errors = 0;

  // 1. Load all data in parallel
  const [sleeperPlayers, ktcMap, rostersResult, settingsResult] = await Promise.all([
    loadSleeperPlayers(),
    loadKTCValues(),
    supabase.from('rosters').select('league_id, owner_id, players'),
    supabase.from('league_settings').select('league_id, scoring_type, superflex'),
  ]);

  const rosters = (rostersResult.data ?? []) as Array<{
    league_id: string;
    owner_id: string | null;
    players: string[] | null;
  }>;

  const scoringByLeague = new Map<string, string>();
  for (const s of (settingsResult.data ?? []) as Array<{ league_id: string; scoring_type: string; superflex?: boolean }>) {
    scoringByLeague.set(s.league_id, s.superflex ? 'superflex' : (s.scoring_type ?? 'ppr'));
  }

  // 2. Build deduplicated set of (player_id, league_id, scoring_type)
  const toProcess = new Map<string, { playerId: string; leagueId: string; scoringType: string }>();
  for (const roster of rosters) {
    const { league_id, players } = roster;
    if (!league_id || !players?.length) continue;
    const scoringType = scoringByLeague.get(league_id) ?? 'ppr';

    for (const pid of players) {
      const p = sleeperPlayers[pid];
      if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;
      const key = `${pid}::${league_id}::${scoringType}`;
      if (!toProcess.has(key)) {
        toProcess.set(key, { playerId: pid, leagueId: league_id, scoringType });
      }
    }
  }

  // 3. Compute TFO for each unique combo + batch upsert in chunks of 200
  const rows: Record<string, unknown>[] = [];

  for (const { playerId, leagueId, scoringType } of toProcess.values()) {
    const p = sleeperPlayers[playerId];
    if (!p) continue;

    const position = (p.position ?? 'WR').toUpperCase();
    const age = p.age ?? 26;
    const name = (p.full_name ?? '').toLowerCase();
    const ktcValue = ktcMap.get(name) ?? 0;

    const { tfoScore, opsScore, sfsScore, sitScore, grade, verdict } =
      computeStructuralTFO(position, age, ktcValue, scoringType);

    rows.push({
      player_id:    playerId,
      league_id:    leagueId,
      scoring_type: scoringType,
      tfo_score:    tfoScore,
      ops_score:    Math.round(opsScore * 10) / 10,
      sfs_score:    Math.round(sfsScore * 10) / 10,
      sit_score:    Math.round(sitScore * 10) / 10,
      grade,
      verdict,
      calculated_at: now,
    });
    processed++;
  }

  // Batch upsert — Supabase handles up to 1000 rows per call
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('tfo_cache')
      .upsert(chunk, { onConflict: 'player_id,league_id,scoring_type' });

    if (error) {
      errors++;
      await logError(supabase, 'nightly-tfo-cache', `Upsert batch ${i / BATCH} failed: ${error.message}`);
    }
  }

  const upserted = rows.length - errors * BATCH;
  return { processed, upserted: Math.max(0, upserted), errors };
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

    const result = await runNightlyTFOCache();

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      const supabase = getSupabase();
      await supabase.from('error_logs').insert({
        error_message: `[nightly-tfo-cache] Uncaught: ${msg}`,
        created_at: new Date().toISOString(),
      });
    } catch { /* swallow */ }

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
