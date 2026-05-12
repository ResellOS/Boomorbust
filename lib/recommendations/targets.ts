/**
 * getRecommendedTargets — top 3 undervalued trade targets per league.
 *
 * Scoring: gap_fill_score (0/50) + bvi_delta_score (0–50) + tfo_grade_score (0/30/40/50)
 * Cached in Upstash Redis with 6hr TTL.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecommendedTarget {
  player_id: string;
  name: string;
  position: string;
  team: string;
  bvi_display: string;
  gap_reason: string;
  combined_score: number;
  redirects_to: string;
}

interface PlayerValueRow {
  player_id: string;
  bvi_score: number;
  ktc_value: number;
  delta: number;
  tfo_score: number;
}

interface BbvRow {
  player_id: string;
  player_name: string;
  position: string;
  team: string | null;
}

// ─── Redis ────────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const CACHE_TTL = 21600; // 6 hours

function cacheKey(leagueId: string, ownerId: string): string {
  return `rec_targets:${leagueId}:${ownerId}`;
}

// ─── TFO grade → score ────────────────────────────────────────────────────────

function tfoGradeScore(tfoScore: number): number {
  if (tfoScore >= 80) return 50;   // ELITE
  if (tfoScore >= 65) return 40;   // HIGH_VALUE
  if (tfoScore >= 50) return 30;   // VIABLE
  return 0;
}

// ─── BVI delta → normalized score (0–50) ─────────────────────────────────────
// delta is BVI (0–100) minus KTC normalized (0–100)

function bviDeltaScore(delta: number): number {
  // Positive delta means undervalued. Normalize to 0–50.
  return Math.min(50, Math.max(0, delta * 1.5));
}

// ─── Gap fill detection ───────────────────────────────────────────────────────

async function getRosterNeeds(leagueId: string, ownerId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('league_settings')
    .select('roster_needs')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  return (data as { roster_needs?: string[] } | null)?.roster_needs ?? [];
}

async function getOwnedPlayerIds(leagueId: string, ownerId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('rosters')
    .select('players')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  return (data as { players?: string[] | null } | null)?.players ?? [];
}

// ─── Main: getRecommendedTargets ──────────────────────────────────────────────

export async function getRecommendedTargets(
  leagueId: string,
  ownerId: string,
): Promise<RecommendedTarget[]> {
  const redis = getRedis();
  const key = cacheKey(leagueId, ownerId);

  // Cache hit
  if (redis) {
    try {
      const cached = await redis.get<RecommendedTarget[]>(key);
      if (cached) return cached;
    } catch {
      // Fall through
    }
  }

  const supabase = createAdminClient();

  const [rosterNeeds, ownedIds] = await Promise.all([
    getRosterNeeds(leagueId, ownerId),
    getOwnedPlayerIds(leagueId, ownerId),
  ]);

  // Undervalued players not on this owner's roster, sorted by BVI
  const { data: candidates } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, ktc_value, delta, tfo_score')
    .eq('scoring_type', 'ppr')
    .gt('delta', 5)
    .gte('bvi_score', 55)
    .not(
      'player_id',
      'in',
      ownedIds.length ? `(${ownedIds.map(id => `"${id}"`).join(',')})` : '("")',
    )
    .order('bvi_score', { ascending: false })
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const candidateRows = candidates as PlayerValueRow[];
  const playerIds = candidateRows.map(c => c.player_id);

  const { data: bbvPlayers } = await supabase
    .from('bbv_values')
    .select('player_id, player_name, position, team')
    .in('player_id', playerIds);

  const bbvMap = new Map(
    ((bbvPlayers as BbvRow[] | null) ?? []).map(p => [p.player_id, p]),
  );

  // Score each candidate
  const scored = candidateRows.map(row => {
    const bbv = bbvMap.get(row.player_id);
    const position = bbv?.position?.toUpperCase() ?? '';

    const gapFill = rosterNeeds.some(need => need.toUpperCase() === position);
    const gapFillScore = gapFill ? 50 : 0;
    const deltaScore = bviDeltaScore(row.delta);
    const tfoScore = tfoGradeScore(row.tfo_score);
    const combined = gapFillScore + deltaScore + tfoScore;

    const ktcNorm = Math.round(Math.min(100, Math.max(0, (row.ktc_value - 1000) / 80)));
    const deltaLabel = row.delta >= 0 ? `+${row.delta}` : `${row.delta}`;
    const signal = row.delta >= 8 ? 'UNDERVALUED' : row.delta <= -8 ? 'OVERVALUED' : 'FAIR';

    return {
      player_id: row.player_id,
      name: bbv?.player_name ?? row.player_id,
      position: bbv?.position ?? '',
      team: bbv?.team ?? '—',
      bvi_display: `BVI: ${row.bvi_score} | KTC: ${ktcNorm} | △${deltaLabel} ${signal}`,
      gap_reason: gapFill
        ? `Fills your ${position} gap`
        : `Undervalued ${position} — strong buy window`,
      combined_score: Math.round(combined),
      redirects_to: `/dashboard/trade?target=${row.player_id}`,
      _combined: combined,
    };
  });

  const top3 = scored
    .sort((a, b) => b._combined - a._combined)
    .slice(0, 3)
    .map(({ _combined: _, ...rest }) => rest);

  // Cache result
  if (redis) {
    try {
      await redis.set(key, top3, { ex: CACHE_TTL });
    } catch {
      // Non-fatal
    }
  }

  return top3;
}
