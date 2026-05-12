/**
 * Proactive trades API — returns personalized buy/sell alerts for a user.
 * Gated to all_pro_terminal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '@/lib/access/gates';
import { createAdminClient } from '@/lib/supabase/admin';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export async function GET(request: NextRequest) {
  const access = await requireFeature('proactive_trades');
  if (access instanceof NextResponse) return access;
  const { userId } = access;

  const url = new URL(request.url);
  const limit = Math.min(20, parseInt(url.searchParams.get('limit') ?? '10', 10));

  const supabase = createAdminClient();

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, metadata, created_at, read_at')
    .eq('user_id', userId)
    .in('type', ['sell_high', 'buy_low'])
    .order('created_at', { ascending: false })
    .limit(limit);

  return NextResponse.json({
    notifications: (notifications as NotificationRow[] | null) ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const access = await requireFeature('proactive_trades');
  if (access instanceof NextResponse) return access;
  const { userId } = access;

  let body: { notification_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', body.notification_id)
    .eq('user_id', userId);

  return NextResponse.json({ ok: true });
}
