/**
 * Lightweight endpoint: returns the current user's subscription tier.
 * Used by AdSlot and any client component that needs tier awareness.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserTier } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ tier: 'free' });
  }

  const tier = await getUserTier(user.id);
  return NextResponse.json({ tier });
}
