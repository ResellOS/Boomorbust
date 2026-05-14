import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import type { SleeperPlayer } from '@/lib/sleeper/players';
import type { PlayerDeepDive } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

function defaultDeepDive(playerId: string): PlayerDeepDive {
  const elite = '#36E7A1';
  return {
    playerId,
    name: 'Amon-Ra St. Brown',
    position: 'WR',
    team: 'Detroit Lions',
    avatarUrl: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
    age: 24,
    height: "6'0\"",
    weight: 197,
    college: 'USC',
    draft: '2021 (4.12)',
    playerScore: 91,
    scoreTier: 'Elite',
    scoreSub: 'Elite · Top 4%',
    trend30d: 6.2,
    trendSpark: [2, 3, 2.5, 4, 4.5, 5, 5.2, 6, 6.2],
    metrics: [
      { label: 'TARGET SHARE', value: '28.4%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'ROUTE RUN %', value: '87.6%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'YARDS / ROUTE RUN', value: '2.78', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'CONTESTED CATCH %', value: '76.3%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: '1ST READ %', value: '31.7%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'DPRR', value: '0.41', tier: 'Elite', valueColor: elite, tierColor: elite },
    ],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { playerId } = params;
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

  const all = await fetchAllPlayers();
  const p = all?.[playerId];
  if (!p?.full_name) {
    return NextResponse.json(defaultDeepDive(playerId));
  }

  const elite = '#36E7A1';
  const name = p.full_name ?? 'Player';
  const pos = p.position ?? '—';

  const raw = p as SleeperPlayer & { weight?: string | number };
  const w = raw.weight;
  const weightNum =
    typeof w === 'string' ? parseInt(w, 10) || 200 : typeof w === 'number' ? w : 200;

  const dive: PlayerDeepDive = {
    playerId,
    name,
    position: pos,
    team: p.team ?? 'FA',
    avatarUrl: `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`,
    age: typeof p.age === 'number' ? p.age : 24,
    height: "6'0\"",
    weight: weightNum,
    college: '—',
    draft: '—',
    playerScore: 75 + (playerId.length % 20),
    scoreTier: 'High',
    scoreSub: 'High · Top 18%',
    trend30d: 2.4,
    trendSpark: [1, 1.5, 2, 2.2, 2.4],
    metrics: [
      { label: 'TARGET SHARE', value: '22.1%', tier: 'Viable', valueColor: '#22D3EE', tierColor: '#22D3EE' },
      { label: 'ROUTE RUN %', value: '78.0%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'YARDS / ROUTE RUN', value: '2.10', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'CONTESTED CATCH %', value: '58.0%', tier: 'Viable', valueColor: '#22D3EE', tierColor: '#22D3EE' },
      { label: '1ST READ %', value: '28.0%', tier: 'Elite', valueColor: elite, tierColor: elite },
      { label: 'DPRR', value: '0.35', tier: 'Viable', valueColor: '#22D3EE', tierColor: '#22D3EE' },
    ],
  };

  return NextResponse.json(dive);
}
