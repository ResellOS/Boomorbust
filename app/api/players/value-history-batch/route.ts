import { NextRequest, NextResponse } from 'next/server';
import { getPlayerValueHistory } from '@/lib/playerValueHistory';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    const ids = Array.isArray(body?.ids)
      ? (body.ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 80)
      : [];
    if (!ids.length) return NextResponse.json({ histories: {} });
    const histories: Record<string, number[]> = {};
    await Promise.all(
      ids.map(async (id) => {
        histories[id] = await getPlayerValueHistory(id);
      })
    );
    return NextResponse.json({ histories });
  } catch {
    return NextResponse.json({ histories: {} }, { status: 400 });
  }
}
