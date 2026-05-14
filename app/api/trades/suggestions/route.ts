import { NextResponse } from 'next/server';
import type { TreSuggestionRowDto, TreSuggestionsApiResponse } from '@/components/trade-hub/types';
import { requireFeature } from '@/lib/access/gates';

export const dynamic = 'force-dynamic';

/** Placeholder until proactive TRE engine is wired to real leagues. */
const MOCK_SUGGESTIONS: TreSuggestionRowDto[] = [
  {
    id: 'sug-1',
    playerId: '6786',
    playerDisplayName: 'Justin Jefferson',
    headline: 'Trade Justin Jefferson for 1.5x value',
    targetName: "Ja'Marr Chase",
    treEdge: '+34.2',
  },
  {
    id: 'sug-2',
    playerId: '4984',
    playerDisplayName: 'Josh Allen',
    headline: 'Buy low on Josh Allen',
    targetName: 'Patrick Mahomes',
    treEdge: '+28.7',
  },
  {
    id: 'sug-3',
    playerId: '4039',
    playerDisplayName: 'Cooper Kupp',
    headline: 'Sell high on Cooper Kupp',
    targetName: 'Puka Nacua',
    treEdge: '+22.1',
  },
];

export async function GET() {
  const gate = await requireFeature('tre_suggestions');
  if (gate instanceof NextResponse) return gate;

  const body: TreSuggestionsApiResponse = { suggestions: MOCK_SUGGESTIONS };
  return NextResponse.json(body);
}
