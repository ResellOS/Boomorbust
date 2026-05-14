import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
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

/** Map raw TFO cache verdict string → UI verdict (4-way). */
function mapVerdict(raw: string | null | undefined, overvalued: boolean): Verdict {
  if (overvalued) return 'SELL';
  const v = (raw ?? '').toUpperCase().replace(/\s+/g, '_');
  if (v.includes('BOOM')) return 'BOOM';
  if (v.includes('BUST')) return 'BUST';
  if (v.includes('NEUTRAL') || v.includes('LEAN') || !v) return 'HOLD';
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

  // ── Cold path: query tfo_cache directly ───────────────────────────────────
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('id')
    .eq('user_id', user.id);
  const leagueIds = (leagueRows ?? []).map((l) => String(l.id));

  if (!leagueIds.length) {
    return NextResponse.json({ players: [] } satisfies PlayersHubResponse);
  }

  const filterLeagueIds = leagueId !== 'all' && leagueId
    ? [leagueId]
    : leagueIds;

  const { data: tfoRows } = await supabase
    .from('tfo_cache')
    .select('player_id, tfo_score, grade, verdict, league_id')
    .in('league_id', filterLeagueIds)
    .order('tfo_score', { ascending: false })
    .limit(50);

  if (!tfoRows?.length) {
    return NextResponse.json({ players: [] } satisfies PlayersHubResponse);
  }

  // Deduplicate by player_id keeping highest tfo_score
  const best = new Map<string, typeof tfoRows[0]>();
  for (const row of tfoRows) {
    const pid   = String(row.player_id);
    const score = Number(row.tfo_score);
    const prev  = best.get(pid);
    if (!prev || score > Number(prev.tfo_score)) best.set(pid, row);
  }

  // Pull player names from Sleeper players table via rosters
  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('players')
    .in('league_id', filterLeagueIds)
    .limit(20);

  // Build a crude name/pos/team map from rosterRows is not possible without
  // the players API; return minimal data and let the card use its own fallback.
  const entries: PlayerHubEntry[] = Array.from(best.values())
    .slice(0, limit)
    .map((row) => {
      const score   = Math.round(Number(row.tfo_score));
      const verdict = mapVerdict(String(row.verdict ?? ''), false);
      return {
        playerId: String(row.player_id),
        name:     `Player ${String(row.player_id).slice(-4)}`, // placeholder until players are cached
        position: 'WR',
        team:     '—',
        tfoScore: score,
        verdict,
        subLabel: deriveSubLabel(score, verdict),
      };
    });

  // Suppress unused variable warning
  void rosterRows;

  return NextResponse.json({ players: entries } satisfies PlayersHubResponse);
}
