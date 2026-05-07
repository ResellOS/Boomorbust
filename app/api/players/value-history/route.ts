import { NextRequest, NextResponse } from 'next/server';
import { getPlayerValueHistory } from '@/lib/playerValueHistory';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json([]);
  const arr = await getPlayerValueHistory(id);
  return NextResponse.json(arr);
}
