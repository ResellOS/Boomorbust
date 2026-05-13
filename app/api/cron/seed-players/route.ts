import { NextResponse } from 'next/server';
import { seedPlayers } from '@/lib/sleeper/seedPlayers';

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await seedPlayers();

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
