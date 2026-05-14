import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface OvervaluedAsset {
  playerId:  string;
  name:      string;
  position:  string;
  team:      string;
  photoUrl:  string;
  delta:     number; // negative number — e.g. -1240 (BVI - KTC)
}

export interface SignalsResponse {
  buy:       number;
  hold:      number;
  sell:      number;
  overvalued: OvervaluedAsset[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

/** Classify a raw TFO verdict string into buy / hold / sell. */
function classifyVerdict(raw: string): 'buy' | 'hold' | 'sell' {
  const v = raw.toUpperCase().replace(/\s+/g, '_');
  if (v.includes('BOOM')) return 'buy';
  if (v.includes('BUST')) return 'sell';
  return 'hold';
}

// ─── Snapshot cache shape (only fields we need) ───────────────────────────────

interface CachedOvervaluedPlayer {
  player_id:      string;
  name:           string;
  position:       string;
  team:           string;
  photoUrl:       string;
  ktcValue:       number;
  bviDelta?:      number | null;
  overvalueScore: number;
  moPts:          number;
}

interface CachedHubSpotlight {
  boom: { player_id: string } | null;
  bust: { player_id: string } | null;
}

interface CachedSnapshot {
  overvalued?: CachedOvervaluedPlayer[];
  tfoVerdictByPlayerId?: Record<string, string>;
  hubSpotlightByLeague?: Record<string, CachedHubSpotlight>;
}

// ─── Aggregate signals from verdictMap (filtered to player IDs in a set if provided) ──

function aggregateSignals(
  verdictMap: Record<string, string>,
  filterIds?: Set<string>,
): { buy: number; hold: number; sell: number } {
  let buy = 0, hold = 0, sell = 0;
  for (const [pid, verdict] of Object.entries(verdictMap)) {
    if (filterIds && !filterIds.has(pid)) continue;
    const cls = classifyVerdict(verdict);
    if (cls === 'buy')  buy++;
    else if (cls === 'sell') sell++;
    else hold++;
  }
  return { buy, hold, sell };
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

  // ── Try Redis snapshot cache ───────────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    try {
      const snap = await redis.get<CachedSnapshot>(`dashboard:snapshot:v8:${user.id}`);
      if (snap) {
        const verdictMap = snap.tfoVerdictByPlayerId ?? {};

        // For a specific league, limit signals to players spotted in that league
        let filterIds: Set<string> | undefined;
        if (leagueId !== 'all' && snap.hubSpotlightByLeague) {
          const spot = snap.hubSpotlightByLeague[leagueId];
          if (spot) {
            filterIds = new Set<string>();
            if (spot.boom?.player_id) filterIds.add(spot.boom.player_id);
            if (spot.bust?.player_id) filterIds.add(spot.bust.player_id);
          }
        }

        const { buy, hold, sell } = aggregateSignals(verdictMap, filterIds);

        // Map overvalued players — prefer bviDelta when available; fall back to overvalueScore
        const ovAssets: OvervaluedAsset[] = (snap.overvalued ?? [])
          .filter((p) => p && p.player_id)
          .map((p) => {
            // bviDelta is already negative when overvalued (BVI < KTC)
            // overvalueScore is a positive "premium over output" — negate for display
            const delta =
              typeof p.bviDelta === 'number'
                ? Math.round(p.bviDelta)
                : -Math.round(Math.abs(p.overvalueScore));
            return {
              playerId: p.player_id,
              name:     p.name,
              position: p.position,
              team:     p.team ?? '—',
              photoUrl: p.photoUrl,
              delta,
            } satisfies OvervaluedAsset;
          })
          // Sort most overvalued first (most negative delta)
          .sort((a, b) => a.delta - b.delta)
          .slice(0, 5);

        return NextResponse.json({
          buy,
          hold,
          sell,
          overvalued: ovAssets,
        } satisfies SignalsResponse);
      }
    } catch { /* fall through */ }
  }

  // ── Cold path: query tfo_cache for verdict distribution ───────────────────
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('id')
    .eq('user_id', user.id);

  const leagueIds = (leagueRows ?? []).map((l) => String(l.id));
  if (!leagueIds.length) {
    return NextResponse.json({ buy: 0, hold: 0, sell: 0, overvalued: [] } satisfies SignalsResponse);
  }

  const filterLeagueIds = leagueId !== 'all' && leagueId ? [leagueId] : leagueIds;

  const { data: tfoRows } = await supabase
    .from('tfo_cache')
    .select('player_id, verdict')
    .in('league_id', filterLeagueIds)
    .limit(500);

  let buy = 0, hold = 0, sell = 0;
  for (const row of tfoRows ?? []) {
    const cls = classifyVerdict(String(row.verdict ?? ''));
    if (cls === 'buy')       buy++;
    else if (cls === 'sell') sell++;
    else                     hold++;
  }

  // Pull overvalued from player_values (negative delta = market overvalues vs BVI)
  const { data: pvRows } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, ktc_value, delta')
    .lt('delta', 0)
    .order('delta', { ascending: true })
    .limit(5);

  const overvalued: OvervaluedAsset[] = (pvRows ?? []).map((r) => ({
    playerId: String(r.player_id),
    name:     `Player ${String(r.player_id).slice(-4)}`,
    position: 'WR',
    team:     '—',
    photoUrl: `https://sleepercdn.com/content/nfl/players/${r.player_id}.jpg`,
    delta:    Math.round(Number(r.delta ?? 0)),
  }));

  return NextResponse.json({ buy, hold, sell, overvalued } satisfies SignalsResponse);
}
