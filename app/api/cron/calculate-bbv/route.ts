import { NextResponse } from 'next/server';
import Fuse from 'fuse.js';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateBBVScore } from '@/lib/values/bbv';
import { createAdminClient } from '@/lib/supabase/admin';

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const BATCH = 100;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [allPlayers, ktcValues] = await Promise.all([fetchAllPlayers(), getKTCValues()]);

  if (!allPlayers) {
    return NextResponse.json({ error: 'Failed to fetch Sleeper players' }, { status: 500 });
  }

  // Build fuzzy KTC name lookup
  const fuse = ktcValues?.length
    ? new Fuse(ktcValues, { keys: ['player_name'], threshold: 0.35 })
    : null;

  const ktcExact = new Map<string, number>(
    (ktcValues ?? []).map((p) => [p.player_name.toLowerCase(), p.ktc_value])
  );

  function lookupKTC(name: string): number {
    const exact = ktcExact.get(name.toLowerCase());
    if (exact != null) return exact;
    const hit = fuse?.search(name, { limit: 1 })[0];
    return hit?.item.ktc_value ?? 0;
  }

  const rows: Array<{
    player_id: string;
    player_name: string;
    position: string;
    team: string | null;
    age: number | null;
    bbv_score: number;
    depth_order: number | null;
    ktc_value: number;
    updated_at: string;
  }> = [];

  for (const [id, player] of Object.entries(allPlayers)) {
    if (!SKILL_POSITIONS.has(player.position)) continue;
    if (!player.full_name) continue;
    if (!player.team) continue; // skip free agents / unsigned

    const result = calculateBBVScore({
      player_id: id,
      player_name: player.full_name,
      position: player.position,
      team: player.team,
      age: player.age,
      depth_chart_order: player.depth_chart_order ?? null,
      injury_status: player.injury_status,
      ktc_value: lookupKTC(player.full_name),
    });

    rows.push({
      player_id: result.player_id,
      player_name: result.player_name,
      position: result.position,
      team: result.team,
      age: result.age,
      bbv_score: result.bbv_score,
      depth_order: result.depth_order,
      ktc_value: result.ktc_value,
      updated_at: new Date().toISOString(),
    });
  }

  const db = createAdminClient();
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db
      .from('bbv_values')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'player_id' });
    if (!error) upserted += Math.min(BATCH, rows.length - i);
  }

  return NextResponse.json({ calculated: rows.length, upserted });
}
