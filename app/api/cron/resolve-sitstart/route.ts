import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LineupOptimizeResponse } from '@/app/api/lineup/optimize/route';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { fetchLeagueMatchups, fetchLeagueRosters, fetchNflState, type SleeperMatchup } from '@/lib/sleeper';

const USER_CONCURRENCY = 10;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function normalizePosition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u === 'DST') return 'DEF';
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(u)) return u;
  return null;
}

function buildLeaguePositionAverages(matchups: SleeperMatchup[], allPlayers: PlayerMap): Map<string, number> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const m of matchups) {
    const pp = m.players_points ?? {};
    for (const [pid, pts] of Object.entries(pp)) {
      if (typeof pts !== 'number' || Number.isNaN(pts)) continue;
      const pos = normalizePosition(allPlayers[pid]?.position ?? null);
      if (!pos) continue;
      sums.set(pos, (sums.get(pos) ?? 0) + pts);
      counts.set(pos, (counts.get(pos) ?? 0) + 1);
    }
  }

  const avgs = new Map<string, number>();
  sums.forEach((sum, pos) => {
    const c = counts.get(pos) ?? 1;
    avgs.set(pos, sum / c);
  });
  return avgs;
}

/**
 * START: correct if actual ≥ position league average.
 * SIT: correct if actual < position league average.
 * FLEX: correct if actual is within a reasonable band around the average (borderline weeks).
 */
function recommendationMatchesOutcome(verdict: string, actual: number, posAvg: number): boolean {
  const v = verdict.trim().toUpperCase();
  if (v === 'START') return actual >= posAvg;
  if (v === 'SIT') return actual < posAvg;
  if (v === 'FLEX') {
    const band = Math.max(2, posAvg * 0.2);
    return Math.abs(actual - posAvg) <= band;
  }
  return false;
}

async function runBatched<T, R>(items: T[], batchSize: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const part = await Promise.all(slice.map((item) => worker(item)));
    out.push(...part);
  }
  return out;
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedis();
  const admin = createAdminClient();

  let skipDb = false;
  {
    const probe = await admin.from('sitstart_accuracy').select('id').limit(1);
    if (probe.error && /sitstart_accuracy|schema cache|does not exist/i.test(probe.error.message ?? '')) {
      skipDb = true;
      console.warn('[resolve-sitstart] sitstart_accuracy table missing or unreachable; skipping DB writes.', probe.error.message);
    }
  }

  const nfl = await fetchNflState();
  if (!nfl) {
    return NextResponse.json({ error: 'Could not load NFL state from Sleeper' }, { status: 502 });
  }

  const completedWeek = nfl.display_week - 1;
  const season = nfl.season;

  if (completedWeek < 1) {
    return NextResponse.json({
      ok: true,
      week: completedWeek,
      usersProcessed: 0,
      totalRecommendations: 0,
      correctRecommendations: 0,
      overallAccuracy: 0,
    });
  }

  const allPlayers = await fetchAllPlayers();
  if (!allPlayers) {
    return NextResponse.json({ error: 'Could not load Sleeper player map' }, { status: 502 });
  }

  const { data: profileRows, error: profErr } = await admin
    .from('profiles')
    .select('id, sleeper_user_id')
    .not('sleeper_user_id', 'is', null);

  if (profErr) {
    console.error('[resolve-sitstart] profiles query failed:', profErr);
    return NextResponse.json({ error: 'Could not load profiles' }, { status: 500 });
  }

  const users = (profileRows ?? []).filter((r) => r.sleeper_user_id != null && String(r.sleeper_user_id).length > 0);

  let grandTotal = 0;
  let grandCorrect = 0;
  let usersProcessed = 0;

  const batchResults = await runBatched(users, USER_CONCURRENCY, async (row) => {
    const userId = row.id as string;
    const sleeperUserId = String(row.sleeper_user_id);

    let userTotal = 0;
    let userCorrect = 0;
    let ran = false;

    try {
      const { data: leagues, error: lgErr } = await admin.from('leagues').select('id').eq('user_id', userId);
      if (lgErr) {
        console.error(`[resolve-sitstart] leagues for user ${userId}:`, lgErr);
        return { ran: true, total: 0, correct: 0 };
      }
      ran = true;

      const leagueIds = (leagues ?? []).map((l) => l.id as string);
      for (const leagueId of leagueIds) {
        try {
          const rosters = await fetchLeagueRosters(leagueId);
          const userRoster = rosters?.find((r) => r.owner_id != null && String(r.owner_id) === sleeperUserId);
          if (!userRoster) continue;

          const matchups = await fetchLeagueMatchups(leagueId, completedWeek);
          if (!matchups?.length) continue;

          const userMx = matchups.find((m) => m.roster_id === userRoster.roster_id);
          const playersPoints = userMx?.players_points ?? {};

          const posAvgs = buildLeaguePositionAverages(matchups, allPlayers);

          const cacheKey = `lineup:optimize:${leagueId}:${completedWeek}:${userId}`;
          let cached: LineupOptimizeResponse | null = null;
          if (redis) {
            try {
              cached = await redis.get<LineupOptimizeResponse>(cacheKey);
            } catch (e) {
              console.error(`[resolve-sitstart] Redis get ${cacheKey}:`, e);
            }
          }

          if (!cached?.players?.length) continue;

          let total = 0;
          let correct = 0;

          for (const p of cached.players) {
            const pos = normalizePosition(p.position);
            if (!pos) continue;
            const posAvg = posAvgs.get(pos);
            if (posAvg === undefined || Number.isNaN(posAvg)) continue;

            const actual = typeof playersPoints[p.playerId] === 'number' ? playersPoints[p.playerId]! : 0;
            total++;
            if (recommendationMatchesOutcome(p.verdict, actual, posAvg)) correct++;
          }

          if (total === 0) continue;

          userTotal += total;
          userCorrect += correct;

          const accuracyPct = Math.round((correct / total) * 10000) / 100;

          if (!skipDb) {
            const { error: upErr } = await admin.from('sitstart_accuracy').upsert(
              {
                user_id: userId,
                league_id: leagueId,
                week: completedWeek,
                season,
                total_recommendations: total,
                correct_recommendations: correct,
                accuracy_pct: accuracyPct,
                created_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,league_id,week,season' },
            );
            if (upErr) {
              if (/sitstart_accuracy|schema cache|does not exist/i.test(upErr.message ?? '')) {
                console.warn('[resolve-sitstart] sitstart_accuracy upsert failed (table missing?):', upErr.message);
              } else {
                console.error(`[resolve-sitstart] upsert user=${userId} league=${leagueId}:`, upErr);
              }
            }
          }
        } catch (e) {
          console.error(`[resolve-sitstart] league ${leagueId} user ${userId}:`, e);
        }
      }
    } catch (e) {
      console.error(`[resolve-sitstart] user ${userId}:`, e);
    }

    return { ran, total: userTotal, correct: userCorrect };
  });

  for (const r of batchResults) {
    if (r.ran) usersProcessed++;
    grandTotal += r.total;
    grandCorrect += r.correct;
  }

  const overallAccuracy = grandTotal > 0 ? Math.round((grandCorrect / grandTotal) * 10000) / 100 : 0;

  return NextResponse.json({
    ok: true,
    week: completedWeek,
    usersProcessed,
    totalRecommendations: grandTotal,
    correctRecommendations: grandCorrect,
    overallAccuracy,
  });
}

/*
 * Run this in Supabase SQL editor to create the table:
 *
 * CREATE TABLE IF NOT EXISTS public.sitstart_accuracy (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 *   league_id text NOT NULL,
 *   week int NOT NULL,
 *   season text NOT NULL,
 *   total_recommendations int NOT NULL,
 *   correct_recommendations int NOT NULL,
 *   accuracy_pct double precision NOT NULL,
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   UNIQUE (user_id, league_id, week, season)
 * );
 *
 * ALTER TABLE public.sitstart_accuracy ENABLE ROW LEVEL SECURITY;
 *
 * -- Optional: service role bypasses RLS; for user reads via anon:
 * CREATE POLICY "Users read own sitstart accuracy"
 *   ON public.sitstart_accuracy FOR SELECT
 *   USING (auth.uid() = user_id);
 */
