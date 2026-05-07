import { NextResponse } from 'next/server';
import { getEnrichedRankings } from '@/lib/rankings/dynasty2026';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const players = await getEnrichedRankings();
    return NextResponse.json(players);
  } catch (e) {
    console.error('dynasty-enriched:', e);
    return NextResponse.json({ error: 'Failed to load rankings' }, { status: 500 });
  }
}
