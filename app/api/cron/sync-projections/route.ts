import { NextResponse } from 'next/server';
import { fetchNflState } from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateTFOScore } from '@/lib/tfo/formula';
import { calculateBBSM } from '@/lib/bbsm/formula';
import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const TTL = 21600; // 6 hours

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [nflState, allPlayers, ktcValues] = await Promise.all([
    fetchNflState(),
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!nflState || !allPlayers) {
    return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
  }

  const { week, season } = nflState;

  // Build KTC lookup by name
  const ktcByName: Record<string, number> = {};
  for (const v of ktcValues) ktcByName[v.player_name.toLowerCase()] = v.ktc_value;

  // Fetch prior KTC values from bbv_values for trend velocity
  const db = createAdminClient();
  const { data: bbvRows } = await db.from('bbv_values').select('player_id, ktc_value, bbv_score');
  const priorKtcById: Record<string, number> = {};
  if (bbvRows) {
    for (const row of bbvRows) priorKtcById[row.player_id] = row.ktc_value ?? 0;
  }

  const skillPlayers = Object.entries(allPlayers).filter(
    ([, p]) => SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '') && p.status === 'Active' && p.team
  );

  const projectionRows: Record<string, unknown>[] = [];
  const bbsmUpdates: { player_id: string; bbsm_score: number }[] = [];

  for (const [pid, p] of skillPlayers) {
    const ktcCurrent = ktcByName[p.full_name?.toLowerCase() ?? ''] ?? 0;
    const ktcPrior = priorKtcById[pid] ?? 0;

    // Derive opportunity score from depth chart order (1=starter=100, 2=backup=60, 3+=30)
    const depthOrder = p.depth_chart_order ?? 3;
    const opportunityScore =
      depthOrder === 1 ? 85 :
      depthOrder === 2 ? 55 :
      30;

    const tfoResult = calculateTFOScore({
      playerId: pid,
      position: p.position?.toUpperCase() as 'QB' | 'RB' | 'WR' | 'TE',
      age: p.age ?? 25,
      team: p.team ?? 'UNK',
      ocScheme: 'default',
      opportunityScore,
      olGrade: 65,
      wrCastGrade: 65,
      redZoneShare: depthOrder === 1 ? 25 : 10,
      ktcValue: ktcCurrent,
    });

    const bbsmResult = calculateBBSM({
      tfoScore: tfoResult.tfoScore,
      ktcCurrent,
      ktcPrior,
    });

    projectionRows.push({
      player_id: pid,
      player_name: p.full_name,
      position: p.position,
      team: p.team,
      week,
      season,
      tfo_score: tfoResult.tfoScore,
      tfo_grade: tfoResult.grade,
      bbsm_score: bbsmResult.bbsmScore,
      bbsm_grade: bbsmResult.grade,
      bbsm_signal: bbsmResult.signal,
      updated_at: new Date().toISOString(),
    });

    bbsmUpdates.push({ player_id: pid, bbsm_score: bbsmResult.bbsmScore });
  }

  // Cache projections in Redis
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`projections:${season}:${week}`, projectionRows, { ex: TTL });
    } catch {}
  }

  // Update bbsm_score in bbv_values (batched)
  const BATCH = 100;
  for (let i = 0; i < bbsmUpdates.length; i += BATCH) {
    const chunk = bbsmUpdates.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(({ player_id, bbsm_score }) =>
        db.from('bbv_values').update({ bbsm_score }).eq('player_id', player_id)
      )
    );
  }

  return NextResponse.json({ ok: true, processed: projectionRows.length, week, season });
}

/*
-- Run once in Supabase SQL Editor to create the projections table:
create table if not exists public.projections (
  id           uuid primary key default gen_random_uuid(),
  player_id    text not null,
  player_name  text,
  position     text,
  team         text,
  week         integer not null,
  season       text not null,
  tfo_score    numeric,
  tfo_grade    text,
  bbsm_score   numeric,
  bbsm_grade   text,
  bbsm_signal  text,
  updated_at   timestamptz default now(),
  unique(player_id, week, season)
);
alter table public.projections enable row level security;
create policy "Public read on projections"
  on public.projections for select using (true);
*/
