import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';

export const dynamic = 'force-dynamic';

// GET ?ids=a,b,c → current market data (KTC + verdict) for the given players, so
// the watchlist page can show current value vs value-at-add. The watch list
// itself lives in localStorage; this endpoint only enriches it with live values.
export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ players: [] });

  try {
    const supabase = createAdminClient();
    const verdicts = await fetchMarketVerdicts(supabase, 'dynasty');
    const players = ids.map((id) => {
      const mv = verdicts.get(id);
      return {
        playerId: id,
        ktcValue: mv && !mv.noMarketData ? mv.ktcValue : null,
        verdict: mv && !mv.noMarketData ? mv.verdict : null,
      };
    });
    return NextResponse.json({ players });
  } catch (err) {
    console.error('[watchlist] market lookup failed:', err);
    return NextResponse.json({ players: [] });
  }
}

// POST body: watch entry → best-effort persist to player_watchlist (cross-device).
// Silently no-ops if the table isn't migrated yet — localStorage is the fallback.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const playerId = body.playerId;
  if (typeof playerId !== 'string') return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase.from('player_watchlist').upsert(
    {
      user_id: user.id,
      player_id: playerId,
      player_name: String(body.playerName ?? playerId),
      position: (body.position as string) ?? null,
      team: (body.team as string) ?? null,
      ktc_value_at_add: typeof body.ktcAtAdd === 'number' ? body.ktcAtAdd : null,
      tfo_at_add: typeof body.tfoAtAdd === 'number' ? body.tfoAtAdd : null,
    },
    { onConflict: 'user_id,player_id' },
  );
  if (error) return NextResponse.json({ ok: false, note: 'not-persisted' });
  return NextResponse.json({ ok: true });
}

// DELETE ?player_id= → best-effort removal from player_watchlist.
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const playerId = req.nextUrl.searchParams.get('player_id');
  if (!playerId) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase
    .from('player_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('player_id', playerId);
  if (error) return NextResponse.json({ ok: false, note: 'not-persisted' });
  return NextResponse.json({ ok: true });
}
