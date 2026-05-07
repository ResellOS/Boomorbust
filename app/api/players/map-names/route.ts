import { NextRequest, NextResponse } from 'next/server';
import { resolveSleeperIdsByFullNames } from '@/lib/sleeper/players';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { names?: unknown };
    const names = Array.isArray(body?.names)
      ? (body.names as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 600)
      : [];
    if (!names.length) return NextResponse.json({ mapping: {} });
    const map = await resolveSleeperIdsByFullNames(names);
    return NextResponse.json({ mapping: Object.fromEntries(map.entries()) });
  } catch {
    return NextResponse.json({ mapping: {} }, { status: 400 });
  }
}
