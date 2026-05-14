import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProcessEdgeResponse } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

const DATA: ProcessEdgeResponse = {
  processEdge: 18.3,
  processLabel: 'Process Edge',
  processPct: 'Top 6%',
  narrativeTitle: "You're winning the long game.",
  narrativeBody: 'Your process is leading to positive regression across your roster.',
  expectedWins: 10.2,
  actualWins: 7.1,
  winDifference: 3.1,
  takeawayTitle: 'Key Takeaway',
  takeawayBody: 'Your team is unlucky. Stay aggressive.',
  progressPct: 75,
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(DATA);
}
