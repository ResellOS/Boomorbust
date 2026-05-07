import { NextRequest, NextResponse } from 'next/server';
import { resolveSleeperIdsByFullNames } from '@/lib/sleeper/players';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ id: null });

  const map = await resolveSleeperIdsByFullNames([q]);
  const id = map.get(q) ?? null;
  return NextResponse.json({ id });
}
