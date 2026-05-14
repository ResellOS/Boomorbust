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
      modification: '✦ Remove: Amon-Ra St. Brown',
      treScoreDisplay: '+3.1',
    },
  ];
}

export async function GET(req: NextRequest) {
  const gate = await requireFeature('smart_counter');
  if (gate instanceof NextResponse) return gate;

  const offerId = req.nextUrl.searchParams.get('offer_id')?.trim();
  if (!offerId) {
    return NextResponse.json({ error: 'offer_id is required' }, { status: 400 });
  }

  const body: SmartCounterApiResponse = {
    offerId,
    responses: countersForOffer(offerId),
  };

  return NextResponse.json(body);
}
