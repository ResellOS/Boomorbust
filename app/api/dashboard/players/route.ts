import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Verdict } from '@/components/dashboard/PlayerHubCard';

export const dynamic = 'force-dynamic';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PlayerHubEntry {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
  subLabel: string;
  verdict: Verdict;
}

export interface PlayersHubResponse {
  players: PlayerHubEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

/** Map raw TFO cache verdict string → UI verdict (4-way).
 *  Handles both calculate-tfo verdicts (BOOM/LEAN_BOOM/NEUTRAL/LEAN_BUST/BUST)
 *  and DMS tier values stored by cache-tfo (FAVORABLE/STABLE/TOUGH). */
function mapVerdict(raw: string | null | undefined, overvalued: boolean): Verdict {
  if (overvalued) return 'SELL';
  const v = (raw ?? '').toUpperCase().replace(/\s+/g, '_');
  if (!v) return 'HOLD';
  if (v.includes('BOOM') || v === 'FAVORABLE') return 'BOOM';
  if (v.includes('BUST') || v === 'TOUGH') return 'BUST';
  return 'HOLD';
}

/** Derive the sub-label from TFO score + verdict. */
function deriveSubLabel(tfoScore: number, verdict: Verdict): string {
  switch (verdict) {
    case 'SELL': return 'Declining Value';
    case 'BUST': return 'Fade Target';
    case 'HOLD': return 'Solid Value';
    case 'BOOM':
      if (tfoScore >= 88) return 'Elite Upside';
      if (tfoScore >= 75) return 'High Floor';
      return 'Solid Value';
  }
}

// ─── Snapshot cache shape (only fields we use) ───────────────────────────────

interface CachedSpotlightPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
  tfoGrade?: string | null;
  tfoVerdict?: string | null;
}

interface CachedSnapshot {
  hubSpotlightByLeague?: Record<
    string,
    { boom: CachedSpotlightPlayer | null; bust: CachedSpotlightPlayer | null }
  >;
  overvalued?: Array<{
    player_id: string;
    name: string;
    position: string;
    team: string;
    tfoVerdict?: string | null;
  }>;
  topRotation?: Array<{
    player_id: string;
    name: string;
    position: string;
    team: string;
    current_points?: number;
    ktc_value?: number;
  }>;
  tfoVerdictByPlayerId?: Record<string, string>;
}

// ─── Build player list from snapshot ─────────────────────────────────────────

function buildFromSnapshot(
  snap: CachedSnapshot,
  leagueId: string,
  limit: number,
): PlayerHubEntry[] {
  const seen   = new Set<string>();
  const result: PlayerHubEntry[] = [];

  const push = (p: PlayerHubEntry) => {
    if (seen.has(p.playerId) || result.length >= limit) return;
    seen.add(p.playerId);
    result.push(p);
  };

  const spotMap = snap.hubSpotlightByLeague ?? {};

  // ── 1. BOOM players from hubSpotlightByLeague ─────────────────────────────
  const leagues = leagueId === 'all'
    ? Object.keys(spotMap)
    : [leagueId];

  for (const lid of leagues) {
    const spot = spotMap[lid];
    if (!spot?.boom) continue;
    const p = spot.boom;
    const score = Math.round(Number(p.tfoScore));
    push({
      playerId: p.player_id,
      name:     p.name,
      position: p.position,
      team:     p.team,
      tfoScore: score,
      verdict:  mapVerdict(p.tfoVerdict, false),
      subLabel: deriveSubLabel(score, mapVerdict(p.tfoVerdict, false)),
    });
    if (result.length >= Math.ceil(limit * 0.6)) break; // ~3 of 5 from BOOM
  }

  // ── 2. HOLD / neutral players — bust spotlight with neutral verdict ────────
  for (const lid of leagues) {
    const spot = spotMap[lid];
    if (!spot?.bust) continue;
    const p = spot.bust;
    const score = Math.round(Number(p.tfoScore));
    const verdict = mapVerdict(p.tfoVerdict, false);
    if (verdict === 'HOLD' || verdict === 'BUST') {
      push({
        playerId: p.player_id,
        name:     p.name,
        position: p.position,
        team:     p.team,
        tfoScore: score,
        verdict,
        subLabel: deriveSubLabel(score, verdict),
      });
    }
    if (result.length >= limit - 1) break;
  }

  // ── 3. SELL players — from overvalued list ────────────────────────────────
  for (const ov of snap.overvalued ?? []) {
    if (result.length >= limit) break;
    const score = Math.round(
      (snap.tfoVerdictByPlayerId?.[ov.player_id]
        ? 40 // low default for overvalued
        : 42),
    );
    push({
      playerId: ov.player_id,
      name:     ov.name,
      position: ov.position,
      team:     ov.team,
      tfoScore: score,
      verdict:  'SELL',
      subLabel: 'Declining Value',
    });
  }

  // ── 4. Fallback — topRotation (no TFO score, estimate from KTC) ──────────
  for (const rp of snap.topRotation ?? []) {
    if (result.length >= limit) break;
    const rawVerdict = snap.tfoVerdictByPlayerId?.[rp.player_id];
    const verdict = mapVerdict(rawVerdict, false);
    // Rough TFO estimate: normalise KTC to 0-100 scale (6,000 KTC ≈ 60 TFO)
    const score = Math.min(95, Math.round(((rp.ktc_value ?? 0) / 7500) * 65 + 30));
    push({
      playerId: rp.player_id,
      name:     rp.name,
      position: rp.position,
      team:     rp.team,
      tfoScore: score,
      verdict,
      subLabel: deriveSubLabel(score, verdict),
    });
  }

  return result;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId') ?? 'all';
  const limit    = Math.min(10, Math.max(1, Number(searchParams.get('limit') ?? '5')));

  // ── Try Redis snapshot cache first ────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    try {
      const snap = await redis.get<CachedSnapshot>(`dashboard:snapshot:v8:${user.id}`);
      if (snap) {
        const players = buildFromSnapshot(snap, leagueId, limit);
        if (players.length > 0) {
          return NextResponse.json({ players } satisfies PlayersHubResponse);
        }
      }
    } catch { /* fall through */ }
  }

  // ── Cold path: correct 7-step chain ──────────────────────────────────────
  const db = createAdminClient();

  // Step 2: profiles WHERE id = user.id → sleeper_user_id
  const { data: profile } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = (profile as { sleeper_user_id?: string | null } | null)?.sleeper_user_id;
  if (!sleeperUserId) {
    return NextResponse.json({ players: [] } satisfies PlayersHubResponse);
  }

  // Step 3: rosters WHERE owner_id = sleeper_user_id, optionally filtered by league
  const rosterQuery = db
    .from('rosters')
    .select('players')
    .eq('owner_id', String(sleeperUserId));
  const { data: rosterRows } = await (
    leagueId && leagueId !== 'all'
      ? rosterQuery.eq('league_id', leagueId)
      : rosterQuery
  );

  // Step 4: flatten players arrays → allPlayerIds (deduplicated)
  const seenIds = new Set<string>();
  const allPlayerIds: string[] = [];
  for (const r of rosterRows ?? []) {
    for (const pid of (r.players as string[] | null) ?? []) {
      if (pid && !seenIds.has(pid)) { seenIds.add(pid); allPlayerIds.push(pid); }
    }
  }

  if (!allPlayerIds.length) {
    return NextResponse.json({ players: [] } satisfies PlayersHubResponse);
  }

  // Step 5: tfo_cache WHERE player_id IN allPlayerIds — ppr scoring, no league_id filter
  const { data: tfoRows } = await db
    .from('formula_scores')
    .select('player_id, tfo_score, verdict')
    .in('player_id', allPlayerIds)
    .eq('scoring_type', 'ppr')
    .order('tfo_score', { ascending: false })
    .limit(50);

  // Step 6: players WHERE player_id IN allPlayerIds → names, position, team
  const { data: playerRows } = await db
    .from('players')
    .select('id, full_name, position, team')
    .in('id', allPlayerIds);

  // Step 7: join and return
  const tfoScores = new Map<string, { tfo_score: number; verdict: string | null }>();
  for (const t of tfoRows ?? []) {
    tfoScores.set(String(t.player_id), { tfo_score: Number(t.tfo_score), verdict: t.verdict as string | null });
  }

  const nameMap = new Map<string, { full_name: string; position: string; team: string }>();
  for (const p of playerRows ?? []) {
    nameMap.set(String(p.id), {
      full_name: String(p.full_name ?? `Player ${String(p.id).slice(-4)}`),
      position:  String(p.position ?? 'WR'),
      team:      String(p.team ?? '—'),
    });
  }

  // Sort by tfo_score desc, then take top `limit` with real data first
  const ranked = allPlayerIds
    .map((pid) => ({ pid, score: tfoScores.get(pid)?.tfo_score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const entries: PlayerHubEntry[] = ranked.map(({ pid, score }) => {
    const tfoEntry = tfoScores.get(pid);
    const info     = nameMap.get(pid);
    const roundedScore = Math.round(score);
    const verdict  = mapVerdict(tfoEntry?.verdict ?? null, false);
    return {
      playerId: pid,
      name:     info?.full_name ?? `Player ${pid.slice(-4)}`,
      position: info?.position  ?? 'WR',
      team:     info?.team      ?? '—',
      tfoScore: roundedScore,
      verdict,
      subLabel: deriveSubLabel(roundedScore, verdict),
    };
  });

  return NextResponse.json({ players: entries } satisfies PlayersHubResponse);
}
