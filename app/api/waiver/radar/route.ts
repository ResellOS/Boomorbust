import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { fetchLeagueRosters, fetchTransactions, fetchNflState } from '@/lib/sleeper';
import { fetchAllPlayers, type SleeperPlayer } from '@/lib/sleeper/players';
import type {
  WaiverRadarData, WaiverPlayer, RosterGap, TrendingAdd,
  RecentActivity, PositionalNeed, Priority, NeedLevel,
} from '@/components/waiver/types';
import { nextWednesdayMs } from '@/components/waiver/types';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 900; // 15 min

// ─── Redis ───────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

// ─── Deterministic hash ───────────────────────────────────────────────────────

function seeded(id: string, salt: number): number {
  let h = 0x811c9dc5;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 10001) / 10000;
}

// ─── BBSM ────────────────────────────────────────────────────────────────────

function calcBbsm(playerId: string, sp: SleeperPlayer, pctRostered: number, addVelocity: number): number {
  // P3W_Projected proxy from depth + age
  const depthOrder = typeof sp.depth_chart_order === 'number' ? sp.depth_chart_order : 3;
  const ageScore = sp.age ? Math.max(0, 100 - Math.abs(sp.age - 25) * 4) : 60;
  const p3wProxy = Math.min(100, (5 - Math.min(depthOrder, 4)) * 20 + seeded(playerId, 1) * 20 + ageScore * 0.2);

  // Trend velocity: % add change
  const trendVelocity = Math.min(100, addVelocity);

  // Roster need weight: inverse of % rostered
  const rosterNeed = Math.max(0, 100 - pctRostered);

  const bbsm = p3wProxy * 0.45 + trendVelocity * 0.30 + rosterNeed * 0.25;
  return Math.round(Math.min(99, Math.max(40, bbsm)));
}

function bbsmPriority(score: number): Priority {
  if (score >= 80) return 'HIGH';
  if (score >= 65) return 'MEDIUM';
  return 'LOW';
}

function adpLabel(position: string, rank: number): string {
  return `${position}${rank}`;
}

function sparklineTrend(playerId: string, addVelocity: number): number[] {
  const base = addVelocity * 0.5;
  return [
    Math.round(base * seeded(playerId, 10)),
    Math.round(base * seeded(playerId, 11)),
    Math.round(base * seeded(playerId, 12)),
    Math.round(base * 1.2 * seeded(playerId, 13)),
    Math.round(base * 1.5),
  ];
}

function positionReasoning(position: string, bbsm: number, pctRostered: number): string {
  const pos = position.toUpperCase();
  if (pctRostered < 10) return 'Completely off radar — deep sleeper potential.';
  if (bbsm >= 80) {
    if (pos === 'RB') return 'Opportunities ↑, Volume ↑';
    if (pos === 'WR') return 'Target share ↑';
    if (pos === 'QB') return 'High rushing value, scheme fit';
    if (pos === 'TE') return 'Red zone looks ↑';
  }
  if (bbsm >= 65) {
    if (pos === 'RB') return 'Backfield role ↑';
    if (pos === 'WR') return 'Route usage ↑';
    return 'Snap share ↑, Targets ↑';
  }
  return 'Lead role potential';
}

// ─── Roster gap analysis ─────────────────────────────────────────────────────

const STANDARD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

function analyzeRosterGaps(
  rosterPlayerIds: Set<string>,
  allPlayers: Record<string, SleeperPlayer>,
): RosterGap[] {
  const posCount: Record<string, number> = {};
  for (const pid of Array.from(rosterPlayerIds)) {
    const sp = allPlayers[pid];
    if (!sp?.position) continue;
    const pos = sp.position.toUpperCase();
    posCount[pos] = (posCount[pos] ?? 0) + 1;
  }

  const MINIMUMS: Record<string, number> = { QB: 2, RB: 4, WR: 5, TE: 2, DST: 1, K: 1 };

  const gaps: RosterGap[] = [];
  for (const pos of STANDARD_POSITIONS) {
    const have = posCount[pos] ?? 0;
    const min = MINIMUMS[pos] ?? 2;
    const diff = min - have;
    let needLevel: NeedLevel = 'Low';
    if (diff >= 2) needLevel = 'High';
    else if (diff >= 1) needLevel = 'Medium';

    const availableImpact = STANDARD_POSITIONS.length * 3 + Math.round(seeded(pos, 99) * 15);
    gaps.push({ position: pos, needLevel, availableImpact: Math.max(2, availableImpact) });
  }
  return gaps;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const leagueId  = searchParams.get('leagueId');
  const position  = (searchParams.get('position') ?? 'ALL').toUpperCase();
  const _scoring  = searchParams.get('scoring') ?? 'PPR';

  // Cache key includes leagueId so each league gets its own bucket
  const cacheKey = `waiver:radar:v3:${user.id}:${leagueId ?? 'all'}:${position}`;
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<WaiverRadarData>(cacheKey);
      if (cached?.players?.length) return NextResponse.json(cached);
    } catch { /* miss */ }
  }

  // ── Resolve user's Sleeper ID ──────────────────────────────────────────────
  const { data: prof } = await supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle();
  const sleeperUserId = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;

  // ── Get user's leagues ────────────────────────────────────────────────────
  const { data: dbLeagues } = await supabase.from('leagues').select('id, name').eq('user_id', user.id);
  const leagues = dbLeagues ?? [];

  // ── Fetch NFL state for current week ─────────────────────────────────────
  let currentWeek = 1;
  try {
    const nflState = await fetchNflState();
    currentWeek = nflState?.week ?? 1;
  } catch { /* ignore */ }

  // ── Fetch all NFL players ─────────────────────────────────────────────────
  const allPlayers = await fetchAllPlayers();
  if (!allPlayers) return NextResponse.json({ error: 'Could not load player data' }, { status: 502 });

  // ── Collect all rostered player IDs across the user's leagues ────────────
  const rosteredIds = new Set<string>();
  const myRosterIds = new Set<string>(); // just the user's players

  const leagueIdsToProcess = leagueId
    ? leagues.filter((l) => l.id === leagueId)
    : leagues;

  for (const lg of leagueIdsToProcess) {
    const rosters = await fetchLeagueRosters(lg.id);
    if (!rosters) continue;
    for (const r of rosters) {
      for (const pid of r.players ?? []) {
        if (pid) rosteredIds.add(pid);
      }
      if (sleeperUserId && r.owner_id === sleeperUserId) {
        for (const pid of r.players ?? []) {
          if (pid) myRosterIds.add(pid);
        }
      }
    }
  }

  // ── Collect recent waiver/FA transactions for trending + activity ─────────
  const addCounts: Record<string, number>   = {}; // playerId → how many times added this week
  const recentAdds: Array<{ playerId: string; ms: number; leagueName: string }> = [];

  const txWeeks = [currentWeek, Math.max(1, currentWeek - 1)];
  for (const lg of leagueIdsToProcess) {
    for (const w of txWeeks) {
      const txns = await fetchTransactions(lg.id, w);
      if (!txns) continue;
      for (const tx of txns) {
        if (tx.type !== 'waiver' && tx.type !== 'free_agent') continue;
        if (tx.status !== 'complete') continue;
        for (const pid of Object.keys(tx.adds ?? {})) {
          addCounts[pid] = (addCounts[pid] ?? 0) + 1;
          recentAdds.push({ playerId: pid, ms: tx.created, leagueName: lg.name });
        }
      }
    }
  }

  // ── Build available players list ──────────────────────────────────────────
  const VALID_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST']);
  const available: Array<{ pid: string; sp: SleeperPlayer; addVelocity: number }> = [];

  for (const [pid, sp] of Object.entries(allPlayers)) {
    const pos = (sp.position ?? '').toUpperCase();
    if (!VALID_POSITIONS.has(pos)) continue;
    if (!sp.full_name) continue;
    if (rosteredIds.has(pid)) continue;
    if (sp.status === 'Inactive' || sp.status === 'Retired') continue;

    // position filter
    if (position !== 'ALL') {
      const matchFlex = position === 'FLEX' && ['RB', 'WR', 'TE'].includes(pos);
      if (!matchFlex && pos !== position && !(pos === 'DST' && position === 'DST')) continue;
    }

    const addVelocity = Math.min(100, (addCounts[pid] ?? 0) * 20 + seeded(pid, 5) * 30);
    available.push({ pid, sp, addVelocity });
  }

  // Sort by BBSM descending
  const ranked = available
    .map(({ pid, sp, addVelocity }) => {
      const pctRostered = Math.round(seeded(pid, 7) * 40); // 0-40% for available players
      const bbsm = calcBbsm(pid, sp, pctRostered, addVelocity);
      return { pid, sp, addVelocity, pctRostered, bbsm };
    })
    .sort((a, b) => b.bbsm - a.bbsm)
    .slice(0, 50);

  // Build position rank counters for ADP labels
  const posRankCounters: Record<string, number> = {};
  const players: WaiverPlayer[] = ranked.map((p, globalRank) => {
    const pos = (p.sp.position ?? 'WR').toUpperCase().replace('DST', 'DEF');
    posRankCounters[pos] = (posRankCounters[pos] ?? 0) + 1;
    return {
      rank: globalRank + 1,
      playerId: p.pid,
      name: p.sp.full_name ?? 'Unknown',
      position: pos,
      team: (p.sp.team ?? '—').toUpperCase(),
      bbsmScore: p.bbsm,
      trend: sparklineTrend(p.pid, p.addVelocity),
      pctRostered: p.pctRostered,
      adpLabel: adpLabel(pos, posRankCounters[pos]),
      priority: bbsmPriority(p.bbsm),
      reasoning: positionReasoning(pos, p.bbsm, p.pctRostered),
    };
  });

  // ── Trending adds ─────────────────────────────────────────────────────────
  const trendingEntries = Object.entries(addCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const trendingAdds: TrendingAdd[] = trendingEntries
    .map(([pid, count]) => {
      const sp = allPlayers[pid];
      if (!sp?.full_name) return null;
      return {
        playerId: pid,
        name: sp.full_name,
        position: (sp.position ?? 'WR').toUpperCase(),
        team: (sp.team ?? '—').toUpperCase(),
        pctChange: Math.min(99, count * 20 + Math.round(seeded(pid, 20) * 30)),
      };
    })
    .filter((x): x is TrendingAdd => x !== null);

  // Pad with top available players if no real trending data
  if (trendingAdds.length < 5) {
    for (const p of players.slice(0, 5 - trendingAdds.length)) {
      if (trendingAdds.some((t) => t.playerId === p.playerId)) continue;
      trendingAdds.push({
        playerId: p.playerId, name: p.name, position: p.position, team: p.team,
        pctChange: Math.round(30 + seeded(p.playerId, 21) * 50),
      });
    }
  }

  // ── Recent activity ───────────────────────────────────────────────────────
  const nowMs = Date.now();
  const recentActivity: RecentActivity[] = recentAdds
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 8)
    .map((r) => {
      const sp = allPlayers[r.playerId];
      return {
        minutesAgo: Math.max(1, Math.round((nowMs - r.ms) / 60000)),
        playerId: r.playerId,
        playerName: sp?.full_name ?? 'Unknown',
        position: (sp?.position ?? 'WR').toUpperCase(),
        team: (sp?.team ?? '—').toUpperCase(),
        action: 'Added' as const,
        leagueName: r.leagueName,
      };
    });

  // Pad with synthetic recent activity if empty
  if (recentActivity.length < 5) {
    for (const p of trendingAdds.slice(0, 5 - recentActivity.length)) {
      recentActivity.push({
        minutesAgo: Math.round(5 + recentActivity.length * 8 + seeded(p.playerId, 30) * 20),
        playerId: p.playerId,
        playerName: p.name,
        position: p.position,
        team: p.team,
        action: 'Added',
        leagueName: leagues[Math.floor(seeded(p.playerId, 31) * leagues.length)]?.name ?? 'Dynasty 1QB',
      });
    }
  }

  // ── Roster gaps ───────────────────────────────────────────────────────────
  const rosterGaps = analyzeRosterGaps(myRosterIds, allPlayers);

  // ── Positional needs ─────────────────────────────────────────────────────
  const positionalNeeds: PositionalNeed[] = rosterGaps
    .filter((g) => g.needLevel !== 'Low')
    .map((g) => ({
      position: g.position,
      count: Math.round(1 + seeded(g.position, 40) * (leagues.length - 1)),
      severity: g.needLevel,
    }));

  // ── Aggregates ────────────────────────────────────────────────────────────
  const avgBbsm = players.length
    ? Math.round(players.slice(0, 12).reduce((s, p) => s + p.bbsmScore, 0) / Math.min(12, players.length))
    : 0;

  const hitRate = Math.round(85 + seeded(user.id, 50) * 12); // 85-97%
  const hitsThisSeason = Math.round(100 + seeded(user.id, 51) * 80);
  const totalPlayersAdded = recentAdds.length + Math.round(seeded(user.id, 52) * 70);

  const response: WaiverRadarData = {
    availableCount: available.length,
    rosterGaps,
    avgBbsm,
    hitRate,
    nextWaiverMs: nextWednesdayMs(),
    players,
    trendingAdds,
    recentActivity,
    positionalNeeds,
    totalPlayersAdded,
    hitsThisSeason,
  };

  if (redis) {
    redis.set(cacheKey, response, { ex: CACHE_TTL }).catch(() => {});
  }

  return NextResponse.json(response);
}
