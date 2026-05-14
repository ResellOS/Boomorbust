import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('preference_data')
    .eq('id', user.id)
    .maybeSingle();

  const pref = (profile?.preference_data ?? {}) as Record<string, unknown>;
  const notif = (pref.notifications ?? {}) as Record<string, boolean>;

  return NextResponse.json({
    tradeAlerts:     notif.tradeAlerts     !== false,
    priceAlerts:     notif.priceAlerts     !== false,
    waiverAlerts:    notif.waiverAlerts    !== false,
    injuryAlerts:    notif.injuryAlerts    !== false,
    lineupReminders: notif.lineupReminders ?? false,
    newsUpdates:     notif.newsUpdates     ?? false,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<Record<string, boolean>>;

  const { data: existing } = await supabase
    .from('profiles')
    .select('preference_data')
    .eq('id', user.id)
    .maybeSingle();

  const pref = (existing?.preference_data ?? {}) as Record<string, unknown>;
  const current = (pref.notifications ?? {}) as Record<string, boolean>;
  const updated = { ...pref, notifications: { ...current, ...body } };

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, preference_data: updated }, { onConflict: 'id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
