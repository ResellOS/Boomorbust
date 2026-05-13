import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkCounterRateLimit, rateLimitExceededResponse } from '@/lib/rateLimit/ai';
import { generateCounters } from '@/lib/counter/engine';
import type { TREOffer } from '@/lib/tre/engine';

function tierFromProfile(
  pref: Record<string, unknown> | null | undefined,
  isPaid: boolean,
): string {
  const t = pref?.subscription_tier;
  if (t === 'all_pro_terminal') return 'all_pro_terminal';
  if (t === 'elite') return 'elite';
  if (t === 'veteran') return 'veteran';
  if (isPaid) return 'veteran';
  return 'free';
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('preference_data, is_paid')
    .eq('id', user.id)
    .maybeSingle();

  const tier = tierFromProfile(
    profile?.preference_data as Record<string, unknown> | undefined,
    (profile as { is_paid?: boolean } | null)?.is_paid ?? false,
  );

  // Smart Counter requires VETERAN+
  const rateCheck = await checkCounterRateLimit(user.id, tier);
  if (!rateCheck.allowed) {
    if (tier === 'free' || tier === 'pro' || tier === 'rookie') {
      return NextResponse.json(
        { error: 'Smart Counter requires Veteran or All-Pro tier.', code: 'TIER_REQUIRED' },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ...rateLimitExceededResponse(rateCheck, tier), code: 'RATE_LIMITED' },
      { status: 429 },
    );
  }

  let body: {
    offer: { assets_out: unknown[]; assets_in: unknown[] };
    leagueId: string;
    opponentUserId?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.offer?.assets_out || !body.offer?.assets_in || !body.leagueId) {
    return NextResponse.json({ error: 'offer and leagueId required' }, { status: 400 });
  }

  const db = createAdminClient();

  // Get DMP for personalisation
  if (body.opponentUserId) {
    await db
      .from('dmp_profiles')
      .select('title')
      .eq('user_id', body.opponentUserId)
      .eq('league_id', body.leagueId)
      .maybeSingle();
  }

  try {
    const counters = await generateCounters(
      body.offer as TREOffer,
      body.leagueId,
      user.id,
      body.opponentUserId,
    );

    return NextResponse.json({
      counters,
      remaining: rateCheck.remaining,
      tier,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
