import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TradeHistoryApiResponse, TradeHistoryRowDto } from '@/components/trade-hub/types';

export const dynamic = 'force-dynamic';

const MOCK_TRADES: TradeHistoryRowDto[] = [
  {
    id: 'hist-1',
    timeLabel: '2d ago',
    givenPlayerId: '6786',
    givenName: 'Justin Jefferson',
    receivedPlayerId: '7547',
    receivedDisplay: 'Amon-Ra St. Brown + 1st',
    verdict: 'SMASH',
    scoreDisplay: '+18.4',
  },
  {
    id: 'hist-2',
    timeLabel: '5d ago',
    givenPlayerId: '9509',
    givenName: 'Bijan Robinson',
    receivedPlayerId: '4018',
    receivedDisplay: 'Breece Hall + 2nd',
    verdict: 'SMASH',
    scoreDisplay: '+15.7',
  },
  {
    id: 'hist-3',
    timeLabel: '1w ago',
    givenPlayerId: '4217',
    givenName: 'CeeDee Lamb',
    receivedPlayerId: '7526',
    receivedDisplay: 'Garrett Wilson + 1st',
    verdict: 'SMASH',
    scoreDisplay: '+12.3',
  },
  {
    id: 'hist-4',
    timeLabel: '2w ago',
    givenPlayerId: '1166',
    givenName: 'Travis Kelce',
    givenWarning: true,
    receivedPlayerId: '1179',
    receivedDisplay: 'Mark Andrews + 2nd',
    verdict: 'FAIR',
    scoreDisplay: '+2.1',
  },
  {
    id: 'hist-5',
    timeLabel: '3w ago',
    givenPlayerId: '4034',
    givenName: 'Jonathan Taylor',
    receivedPlayerId: '3198',
    receivedDisplay: 'Derrick Henry',
    verdict: 'MISS',
    scoreDisplay: '-8.4',
  },
];

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('limit');
  const parsed = raw ? parseInt(raw, 10) : 5;
  const limit = Number.isFinite(parsed) ? Math.min(50, Math.max(1, parsed)) : 5;

  const trades = MOCK_TRADES.slice(0, limit);
  const body: TradeHistoryApiResponse = { trades };
  return NextResponse.json(body);
}
