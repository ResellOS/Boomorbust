import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '@/lib/access/gates';
import { generateOpponentReport } from '@/lib/scouting/opponentReport';

export async function GET(
  _request: NextRequest,
  { params }: { params: { leagueId: string; opponentRosterId: string } },
) {
  const access = await requireFeature('mrs_scores'); // VETERAN+ feature
  if (access instanceof NextResponse) return access;
  const { userId } = access;

  const { leagueId, opponentRosterId } = params;
  if (!leagueId || !opponentRosterId) {
    return NextResponse.json({ error: 'leagueId and opponentRosterId required' }, { status: 400 });
  }

  const report = await generateOpponentReport(opponentRosterId, leagueId, userId);
  return NextResponse.json(report);
}
