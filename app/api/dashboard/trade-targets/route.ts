import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Public types ─────────────────────────────────────────────────────────────

export type TradeVerdict = 'SMASH' | 'STRONG BUY' | 'BUY' | 'MONITOR';

export interface TradeTarget {
  playerId:    string;
  name:        string;
  position:    string;
  team:        string;
  photoUrl:    string;
  leagueId:   string;
  leagueName:  string;
  treScore:    number;
  acquireCost: string;
  verdict:     TradeVerdict;
  gapReason:   string;
}

export interface TradeTargetsResponse {
  targets: TradeTarget[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

/** Convert raw TFO verdict string to a numeric bonus for TRE calculation. */
function tfoBonus(tfoVerdict: string | null | undefined): number {
  const v = (tfoVerdict ?? '').toUpperCase().replace(/\s+/g, '_');
  if (v.includes('BOOM'))      return 10;
  if (v.includes('LEAN_BOOM')) return 5;
  if (v.includes('LEAN_BUST')) return -5;
  if (v.includes('BUST'))      return -10;
  return 0;
}

/** Derive a display TRE score (40–99) from the BVI delta + TFO signal. */
function deriveTreScore(bviDelta: number, tfoVerdict: string | null | undefined): number {
  // bviDelta is in raw KTC-point units — each 100 pts ≈ 1 TRE point
  const base = 62 + Math.round(bviDelta / 120) + tfoBonus(tfoVerdict);
  return Math.min(99, Math.max(40, base));
}

/** Derive a trade verdict label from the TRE score. */
function deriveVerdict(treScore: number): TradeVerdict {
  if (treScore >= 88) return 'SMASH';
  if (treScore >= 78) return 'STRONG BUY';
  if (treScore >= 65) return 'BUY';
  return 'MONITOR';
}

/**
 * Approximate what it costs to acquire a player in dynasty terms.
 * Based solely on their KTC value tier.
 */
function deriveAcquireCost(ktcValue: number, position: string): string {
  const pos = position.toUpperCase();
  // WR/RB filler for the "plus a player" component
  const filler = (pos === 'QB' || pos === 'TE') ? 'WR' : (pos === 'WR' ? 'RB' : 'WR');

  if (ktcValue >= 8_000) return `2 1st + ${filler}`;
  if (ktcValue >= 6_500) return `1st + 2nd + ${filler}`;
  if (ktcValue >= 5_000) return `1st + ${filler}`;
  if (ktcValue >= 3_500) return `1st + 2nd`;
  if (ktcValue >= 2_000) return `2nd + ${filler}`;
  if (ktcValue >= 1_000) return `2nd + 3rd`;
  return `3rd + ${filler}`;
}

// ─── Snapshot cache shape (only fields we need) ───────────────────────────────

interface CachedRecommendedTarget {
  player_id:   string;
  name:        string;
  position:    string;
  team:        string;
  photoUrl:    string;
  bviScore:    number;
  ktcValue:    number;
  bviDelta:    number;
  gapReason:   string;
  tfoVerdict?: string | null;
  leagueId:    string;
  leagueName:  string;
}

interface CachedSnapshot {
  recommendedTargets?: CachedRecommendedTarget[];
}

// ─── Map snapshot row → API response row ─────────────────────────────────────

function mapTarget(raw: CachedRecommendedTarget): TradeTarget {
  const treScore    = deriveTreScore(raw.bviDelta, raw.tfoVerdict);
  const verdict     = deriveVerdict(treScore);
  const acquireCost = deriveAcquireCost(raw.ktcValue, raw.position);

  return {
    playerId:    raw.player_id,
    name:        raw.name,
    position:    raw.position,
    team:        raw.team,
    photoUrl:    raw.photoUrl,
    leagueId:    raw.leagueId,
    leagueName:  raw.leagueName,
    treScore,
    acquireCost,
    verdict,
    gapReason:   raw.gapReason,
  };
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
  const limit    = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? '5')));

  // ── Try Redis snapshot cache first ────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    try {
      const snap = await redis.get<CachedSnapshot>(`dashboard:snapshot:v8:${user.id}`);
      if (snap?.recommendedTargets?.length) {
        const filtered = (
          leagueId === 'all'
            ? snap.recommendedTargets
            : snap.recommendedTargets.filter((r) => r.leagueId === leagueId)
        )
          .sort((a, b) => b.bviDelta - a.bviDelta)
          .slice(0, limit);

        const targets = filtered.map(mapTarget);
        return NextResponse.json({ targets } satisfies TradeTargetsResponse);
      }
    } catch { /* fall through to cold path */ }
  }

  // ── Cold path: query player_values directly ───────────────────────────────
  // Get user's leagues
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('user_id', user.id);

  if (!leagueRows?.length) {
    return NextResponse.json({ targets: [] } satisfies TradeTargetsResponse);
  }

  const filterIds = leagueId !== 'all' && leagueId
    ? [leagueId]
    : leagueRows.map((l) => String(l.id));

  // Pull undervalued players from player_values
  const { data: pvRows } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, ktc_value, delta, scoring_type')
    .gt('delta', 0)
    .order('delta', { ascending: false })
    .limit(limit * 4);

  if (!pvRows?.length) {
    return NextResponse.json({ targets: [] } satisfies TradeTargetsResponse);
  }

  // Build response without player names (no players table join in cold path)
  const lgMap = new Map(leagueRows.map((l) => [String(l.id), l.name ?? 'League']));

  const targets: TradeTarget[] = pvRows.slice(0, limit).map((row, idx) => {
    const pid      = String(row.player_id);
    const bviDelta = Math.round(Number(row.delta ?? 0));
    const ktcVal   = Math.round(Number(row.ktc_value ?? 0));
    const treScore = deriveTreScore(bviDelta, null);
    const verdict  = deriveVerdict(treScore);
    // Rotate through user's leagues for display
    const lgId     = filterIds[idx % filterIds.length] ?? '';
    return {
      playerId:    pid,
      name:        `Player ${pid.slice(-4)}`,
      position:    'WR',
      team:        '—',
      photoUrl:    `https://sleepercdn.com/content/nfl/players/${pid}.jpg`,
      leagueId:    lgId,
      leagueName:  lgMap.get(lgId) ?? 'League',
      treScore,
      acquireCost: deriveAcquireCost(ktcVal, 'WR'),
      verdict,
      gapReason:   'BVI undervalued',
    };
  });

  return NextResponse.json({ targets } satisfies TradeTargetsResponse);
}
