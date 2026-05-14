import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { IncomingOfferApi, IncomingOffersResponse } from '@/components/trade-hub/types';

export const dynamic = 'force-dynamic';

const MOCK_OFFERS: IncomingOfferApi[] = [
  {
    id: 'mock-1',
    leagueLetter: 'D',
    leagueIconBg: '#EF4444',
    leagueName: 'Dynasty 1QB',
    timeAgo: '10m ago',
    isNew: true,
    proposerTeam: 'Team Alpha',
    proposerHandle: '@AlphaManager',
    proposerReceives: [
      {
        kind: 'player',
        name: 'Justin Jefferson',
        position: 'WR',
        team: 'MIN',
        playerId: '6786',
      },
    ],
    recipientTeam: 'Team You',
    recipientHandle: '@YourTeam',
    recipientReceives: [
      { kind: 'pick', label: '1st Round Pick (2025)' },
      { kind: 'pick', label: '2026 1st Round Pick' },
      {
        kind: 'player',
        name: 'Amon-Ra St. Brown',
        position: 'WR',
        team: 'DET',
        playerId: '7547',
      },
    ],
    treEdge: '+18.4',
  },
  {
    id: 'mock-2',
    leagueLetter: 'R',
    leagueIconBg: '#EF4444',
    leagueName: 'Redraft Main',
    timeAgo: '25m ago',
    isNew: false,
    proposerTeam: 'Team Beta',
    proposerHandle: '@BetaManager',
    proposerReceives: [
      {
        kind: 'player',
        name: 'Bijan Robinson',
        position: 'RB',
        team: 'ATL',
        playerId: '9509',
      },
    ],
    recipientTeam: 'Team You',
    recipientHandle: '@YourTeam',
    recipientReceives: [
      {
        kind: 'player',
        name: 'Jonathan Taylor',
        position: 'RB',
        team: 'IND',
        playerId: '4034',
      },
      { kind: 'pick', label: '2nd Round Pick' },
    ],
    treEdge: '+12.7',
  },
  {
    id: 'mock-3',
    leagueLetter: 'D',
    leagueIconBg: '#EF4444',
    leagueName: 'Dynasty SF',
    timeAgo: '45m ago',
    isNew: false,
    proposerTeam: 'Team Gamma',
    proposerHandle: '@GammaManager',
    proposerReceives: [
      {
        kind: 'player',
        name: 'CeeDee Lamb',
        position: 'WR',
        team: 'DAL',
        playerId: '5012',
      },
    ],
    recipientTeam: 'Team You',
    recipientHandle: '@YourTeam',
    recipientReceives: [
      { kind: 'pick', label: '1st Round Pick (2025)' },
      { kind: 'pick', label: '2nd Round Pick (2025)' },
    ],
    treEdge: '+8.9',
  },
];

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload: IncomingOffersResponse = {
    offers: MOCK_OFFERS,
    totalCount: 24,
  };

  return NextResponse.json(payload);
}
