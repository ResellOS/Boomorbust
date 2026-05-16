import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 120;

const RELEVANT_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

interface SleeperRawPlayer {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  age?: number | null;
  status?: string;
  depth_chart_order?: number | null;
  depth_chart_position?: string | null;
  injury_status?: string | null;
  search_rank?: number | null;
  years_exp?: number | null;
  college?: string | null;
  active?: boolean;
}

export async function GET() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const errors: string[] = [];
  let count = 0;

  // Fetch all NFL players from Sleeper
  let raw: Record<string, SleeperRawPlayer>;
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      headers: { 'User-Agent': 'BoomOrBust/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Sleeper returned ${res.status}`);
    raw = (await res.json()) as Record<string, SleeperRawPlayer>;
  } catch (err) {
    return NextResponse.json({ success: false, error: `Sleeper fetch failed: ${String(err)}` }, { status: 502 });
  }

  // Filter to skill + special teams positions with a real name
  const players = Object.entries(raw)
    .filter(([, p]) => {
      if (!p.full_name?.trim()) return false;
      const pos = (p.position ?? '').toUpperCase();
      return RELEVANT_POSITIONS.has(pos);
    })
    .map(([pid, p]) => ({
      player_id: pid,
      full_name: p.full_name!.trim(),
      first_name: p.first_name?.trim() ?? null,
      last_name: p.last_name?.trim() ?? null,
      position: (p.position ?? 'WR').toUpperCase(),
      team: p.team ?? null,
      age: p.age ?? null,
      status: p.status ?? null,
      depth_chart_order: p.depth_chart_order ?? null,
      depth_chart_position: p.depth_chart_position ?? null,
      injury_status: p.injury_status ?? null,
      search_rank: p.search_rank ?? null,
      years_exp: p.years_exp ?? null,
      college: p.college ?? null,
      updated_at: new Date().toISOString(),
    }));

  const total = players.length;
  const BATCH = 250;

  for (let i = 0; i < players.length; i += BATCH) {
    const batch = players.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;

    const { error } = await db
      .from('players')
      .upsert(batch, { onConflict: 'player_id' });

    if (error) {
      errors.push(`batch ${batchNum}: ${error.message}`);
      void db.from('error_logs').insert({
        source: 'seed-players',
        message: `Batch ${batchNum} failed: ${error.message}`,
        user_id: session.user.id,
        metadata: { batch: batchNum, batch_size: batch.length, code: error.code },
      });
    } else {
      count += batch.length;
      // Progress log every 500 players
      if (count % 500 === 0 || i + BATCH >= players.length) {
        void db.from('error_logs').insert({
          source: 'seed-progress',
          message: `Seeded ${count}/${total} players`,
          user_id: session.user.id,
          metadata: { count, total },
        });
      }
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    count,
    total,
    errors: errors.slice(0, 10),
  });
}
