import { NextRequest, NextResponse } from 'next/server';
import { getPlayersByIds } from '@/lib/sleeper/players';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({});

  const playerIds = ids.split(',').filter(Boolean).slice(0, 200);
  const players = await getPlayersByIds(playerIds);
  return NextResponse.json(players);
}
