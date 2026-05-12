/**
 * Smart Counter API — generates 3 trade response options for a given offer.
 * Calls lib/counter/engine.ts with the offer context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCounters } from '@/lib/counter/engine';
import type { TREAsset, TREOffer } from '@/lib/tre/engine';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    offer: { assets_out: TREAsset[]; assets_in: TREAsset[] };
    league_id: string;
    opponent_sleeper_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { offer, league_id, opponent_sleeper_id } = body;

  if (!offer?.assets_out?.length || !offer?.assets_in?.length) {
    return NextResponse.json({ error: 'Offer must have assets on both sides' }, { status: 400 });
  }

  const treOffer: TREOffer = {
    assets_out: offer.assets_out,
    assets_in: offer.assets_in,
  };

  // Resolve the user's Sleeper owner_id from profiles
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const ownerId = profile?.sleeper_user_id as string | undefined;

  try {
    const result = await generateCounters(
      treOffer,
      league_id,
      ownerId ?? '',
      opponent_sleeper_id,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error('Counter generation failed:', err);
    return NextResponse.json({ error: 'Counter generation failed' }, { status: 500 });
  }
}
