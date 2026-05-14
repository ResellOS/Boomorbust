import { NextResponse, type NextRequest } from 'next/server';
import type { SmartCounterApiResponse, SmartCounterCardDto } from '@/components/trade-hub/types';
import { requireFeature } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

/** Placeholder TRE counter payloads until TRE engine is wired. */
function countersForOffer(offerId: string): SmartCounterCardDto[] {
  void offerId;
  return [
    {
      tier: 'aggressive',
      label: 'RESPONSE 1 · AGGRESSIVE',
      title: 'Counter with Confidence',
      description: 'Keep your stars, add value',
      modification: '✦ Add: 2nd Round Pick',
      treScoreDisplay: '+15.2',
    },
    {
      tier: 'balanced',
      label: 'RESPONSE 2 · BALANCED',
      title: 'Fair Counter',
      description: 'Adjust value slightly',
      modification: '✦ Remove: 2nd Round Pick',
      treScoreDisplay: '+7.8',
    },
    {
      tier: 'conservative',
      label: 'RESPONSE 3 · CONSERVATIVE',
      title: 'Protect Assets',
      description: 'Minimize risk, maintain depth',
      modification: '✦ Tighten picks to protect downside',
      treScoreDisplay: '+3.1',
    },
  ];
}

export async function POST(req: NextRequest) {
  const gate = await requireFeature('smart_counter');
  if (gate instanceof NextResponse) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const offer = (body as { offer?: unknown }).offer;
  if (!offer || typeof offer !== 'object') {
    return NextResponse.json({ error: 'offer object is required' }, { status: 400 });
  }

  const id = (offer as { id?: unknown }).id;
  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json({ error: 'offer.id is required' }, { status: 400 });
  }

  const offerId = id.trim();
  const bodyOut: SmartCounterApiResponse = {
    offerId,
    responses: countersForOffer(offerId),
  };

  return NextResponse.json(bodyOut);
}
