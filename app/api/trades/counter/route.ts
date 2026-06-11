import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SmartCounterResponse } from '@/lib/trade/types';

export const dynamic = 'force-dynamic';

interface CounterBody {
  offered_players?: string[];
  your_players?: string[];
  league_id?: string;
  offer_id?: string | null;
  offer?: { id?: string };
}

async function tfoScoresForPlayers(
  playerIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!playerIds.length) return map;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score, calculated_at')
      .in('player_id', playerIds)
      .order('calculated_at', { ascending: false });

    if (error) throw error;
    for (const row of data ?? []) {
      const pid = row.player_id as string;
      if (!map.has(pid) && typeof row.tfo_score === 'number') {
        map.set(pid, row.tfo_score);
      }
    }
  } catch (err) {
    console.error('[counter] tfo fetch failed:', err);
  }

  for (const pid of playerIds) {
    if (!map.has(pid)) map.set(pid, 50);
  }
  return map;
}

function sumScores(ids: string[], scores: Map<string, number>): number {
  return ids.reduce((s, id) => s + (scores.get(id) ?? 50), 0);
}

function buildCounters(
  offered: string[],
  yours: string[],
  scores: Map<string, number>,
): SmartCounterResponse[] {
  const receiveTotal = sumScores(offered, scores);
  const giveTotal = sumScores(yours, scores);
  const gap = receiveTotal - giveTotal;

  const aggressiveEdge = Math.round((gap + 12) * 10) / 10;
  const balancedEdge = Math.round((gap + 4) * 10) / 10;
  const conservativeEdge = Math.round((gap - 2) * 10) / 10;

  const weakest =
    yours.length > 0
      ? yours.reduce((min, id) =>
          (scores.get(id) ?? 50) < (scores.get(min) ?? 50) ? id : min,
        yours[0])
      : null;

  return [
    {
      tier: 'aggressive',
      title: 'Counter with Confidence',
      description: 'Keep your stars, add value',
      adjustment: 'Add 2nd Round Pick',
      adjustmentType: 'add',
      edgeScore: aggressiveEdge,
      copyText: `BOB Smart Counter (Aggressive): Request a 2nd round pick added to balance this deal. Target +${aggressiveEdge.toFixed(1)} dynasty edge.`,
    },
    {
      tier: 'balanced',
      title: 'Fair Counter',
      description: 'Adjust value slightly',
      adjustment: gap > 0 ? 'Remove 2nd Round Pick' : 'Swap equivalent pick',
      adjustmentType: gap > 0 ? 'remove' : 'neutral',
      edgeScore: balancedEdge,
      copyText: `BOB Smart Counter (Balanced): Minor pick adjustment to even out value. Target +${balancedEdge.toFixed(1)} dynasty edge.`,
    },
    {
      tier: 'conservative',
      title: 'Protect Assets',
      description: 'Minimize risk, maintain depth',
      adjustment: weakest ? `Remove player ${weakest} from give side` : 'Reduce give package',
      adjustmentType: 'remove',
      edgeScore: conservativeEdge,
      copyText: `BOB Smart Counter (Conservative): Trim the give side to protect core assets. Target +${conservativeEdge.toFixed(1)} dynasty edge.`,
    },
  ];
}

export async function POST(req: NextRequest) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: CounterBody;
  try {
    body = (await req.json()) as CounterBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const offered = Array.isArray(body.offered_players) ? body.offered_players : [];
  const yours = Array.isArray(body.your_players) ? body.your_players : [];
  const leagueId = body.league_id ?? '';

  if (!leagueId && !body.offer?.id && offered.length === 0 && yours.length === 0) {
    return NextResponse.json({ error: 'league_id and players required' }, { status: 400 });
  }

  try {
    const scores = await tfoScoresForPlayers([...offered, ...yours]);
    const counters = buildCounters(offered, yours, scores);

    return NextResponse.json({
      offerId: body.offer_id ?? body.offer?.id ?? null,
      leagueId,
      counters,
    });
  } catch (err) {
    console.error('[counter] failed:', err);
    return NextResponse.json({ error: 'Counter generation failed' }, { status: 500 });
  }
}
