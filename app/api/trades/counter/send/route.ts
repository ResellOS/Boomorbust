import { NextResponse, type NextRequest } from 'next/server';
import type { SmartCounterTierKey } from '@/components/trade-hub/types';
import { requireFeature } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

const TIERS: SmartCounterTierKey[] = ['aggressive', 'balanced', 'conservative'];

export async function POST(req: NextRequest) {
  const gate = await requireFeature('smart_counter');
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const offerId = typeof (body as { offerId?: unknown }).offerId === 'string'
    ? (body as { offerId: string }).offerId.trim()
    : '';
  const tier = (body as { tier?: unknown }).tier;

  if (!offerId) {
    return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
  }
  if (typeof tier !== 'string' || !TIERS.includes(tier as SmartCounterTierKey)) {
    return NextResponse.json({ error: 'tier must be aggressive | balanced | conservative' }, { status: 400 });
  }

  // Placeholder: Sleeper has no public "send counter" API — acknowledged server-side for UX.
  return NextResponse.json({ ok: true as const, offerId, tier });
}
