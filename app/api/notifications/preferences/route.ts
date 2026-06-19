import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NOTIF_KEYS = [
  'tradeAlerts',
  'priceAlerts',
  'waiverAlerts',
  'injuryAlerts',
  'lineupReminders',
  'newsUpdates',
] as const;

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;

  const { data: existing } = await supabase
    .from('profiles')
    .select('preference_data')
    .eq('id', user.id)
    .maybeSingle();

  const pref = (existing?.preference_data ?? {}) as Record<string, unknown>;
  const notifications = (pref.notifications ?? {}) as Record<string, boolean>;

  for (const key of NOTIF_KEYS) {
    if (key in body && typeof body[key] === 'boolean') {
      notifications[key] = body[key] as boolean;
    }
  }

  const updated = { ...pref, notifications };

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, preference_data: updated, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notifications });
}
