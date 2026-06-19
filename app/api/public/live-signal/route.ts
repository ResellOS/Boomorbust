import { NextResponse } from 'next/server';
import { fetchLiveSignals } from '@/lib/public/liveSignal';

export const revalidate = 300;

export async function GET() {
  const data = await fetchLiveSignals();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
