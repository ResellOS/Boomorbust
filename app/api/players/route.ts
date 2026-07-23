import { NextRequest, NextResponse } from 'next/server';
import { getPlayersByIds } from '@/lib/sleeper/players';

// Player metadata is not user-specific and changes slowly — cache 1h at the edge.
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' };

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({}, { headers: CACHE_HEADERS });

  const playerIds = ids.split(',').filter(Boolean).slice(0, 200);
  const players = await getPlayersByIds(playerIds);
  return NextResponse.json(players, { headers: CACHE_HEADERS });
}
