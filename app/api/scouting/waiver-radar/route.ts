import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { WaiverRadarRow } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

const ROWS: WaiverRadarRow[] = [
  { rank: 1, playerName: 'Isaiah Likely', position: 'TE', team: 'BAL', pctRostered: 32, trendUp: true, pctFaab: 24, priority: 'HIGH', opportunityScore: 89 },
  { rank: 2, playerName: 'Jaxon Smith-Njigba', position: 'WR', team: 'SEA', pctRostered: 45, trendUp: true, pctFaab: 32, priority: 'HIGH', opportunityScore: 87 },
  { rank: 3, playerName: 'Jaylen Wright', position: 'RB', team: 'MIA', pctRostered: 18, trendUp: true, pctFaab: 18, priority: 'HIGH', opportunityScore: 83 },
  { rank: 4, playerName: 'Tucker Kraft', position: 'TE', team: 'GB', pctRostered: 27, trendUp: true, pctFaab: 16, priority: 'MEDIUM', opportunityScore: 79 },
  { rank: 5, playerName: 'Rasheen Ali', position: 'RB', team: 'TB', pctRostered: 12, trendUp: true, pctFaab: 14, priority: 'MEDIUM', opportunityScore: 76 },
  { rank: 6, playerName: 'Mason Tipton', position: 'WR', team: 'NO', pctRostered: 7, trendUp: true, pctFaab: 9, priority: 'MEDIUM', opportunityScore: 72 },
  { rank: 7, playerName: 'Cedric Tillman', position: 'WR', team: 'CLE', pctRostered: 10, trendUp: true, pctFaab: 8, priority: 'LOW', opportunityScore: 69 },
  { rank: 8, playerName: 'Evan Hull', position: 'RB', team: 'IND', pctRostered: 6, trendUp: true, pctFaab: 6, priority: 'LOW', opportunityScore: 64 },
];

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? 'all';
  return NextResponse.json({ leagueId, rows: ROWS });
}
