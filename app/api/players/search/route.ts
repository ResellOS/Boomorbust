import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPlayers } from '@/lib/sleeper/players';

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '8', 10), 20);

  if (q.length < 2) return NextResponse.json([]);

  const all = await fetchAllPlayers();
  if (!all) return NextResponse.json([]);

  const results: Array<{ player_id: string; full_name: string; position: string; team: string }> = [];

  for (const [pid, p] of Object.entries(all)) {
    if (!p.full_name) continue;
    if (!SKILL_POSITIONS.has(p.position)) continue;
    if (p.status === 'Inactive') continue;
    if (!p.full_name.toLowerCase().includes(q)) continue;

    results.push({
      player_id: pid,
      full_name: p.full_name,
      position: p.position,
      team: p.team ?? 'FA',
    });

    if (results.length >= limit) break;
  }

  return NextResponse.json(results);
}
