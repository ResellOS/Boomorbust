/**
 * QStash-backed BVI calculation job for a single user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBVIForRoster } from '@/lib/bvi/engine';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId: string };
  try {
    body = await request.json() as { userId: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = createAdminClient();

  const { data: profile } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  const sleeperUserId = (profile as { sleeper_user_id?: string } | null)?.sleeper_user_id;
  if (!sleeperUserId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: rosters } = await db
    .from('rosters')
    .select('league_id, players')
    .eq('owner_id', sleeperUserId)
    .limit(20);

  if (!rosters?.length) {
    return NextResponse.json({ ok: true, calculated: 0 });
  }

  let calculated = 0;
  for (const r of rosters as { league_id: string; players: string[] }[]) {
    try {
      await getBVIForRoster(r.league_id, userId);
      calculated++;
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, calculated });
}
