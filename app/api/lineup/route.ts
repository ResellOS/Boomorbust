import { NextRequest, NextResponse } from 'next/server';
import { generateLineupRecommendations } from '@/lib/sitstart/engine';

export async function POST(request: NextRequest) {
  try {
    const { roster, league, week } = await request.json();
    if (!roster || !week) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const recs = await generateLineupRecommendations(roster, league, week);
    return NextResponse.json(recs);
  } catch (err) {
    console.error('Lineup engine error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
