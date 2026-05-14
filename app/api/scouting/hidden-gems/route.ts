import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { HiddenGemRow } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

const ROWS: HiddenGemRow[] = [
  { rank: 1, playerName: 'Marvin Mims Jr.', position: 'WR', team: 'DEN', pctRostered: 12, trend7d: 34, opportunityScore: 91 },
  { rank: 2, playerName: 'Jalen Tolbert', position: 'WR', team: 'DAL', pctRostered: 9, trend7d: 28, opportunityScore: 86 },
  { rank: 3, playerName: 'Tank Bigsby', position: 'RB', team: 'JAX', pctRostered: 11, trend7d: 26, opportunityScore: 82 },
  { rank: 4, playerName: 'Trey Palmer', position: 'WR', team: 'TB', pctRostered: 7, trend7d: 24, opportunityScore: 79 },
  { rank: 5, playerName: 'Elijah Mitchell', position: 'RB', team: 'SF', pctRostered: 6, trend7d: 22, opportunityScore: 76 },
];

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ rows: ROWS });
}
