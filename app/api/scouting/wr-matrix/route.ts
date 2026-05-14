import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { WRMatrixResponse } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

const DATA: WRMatrixResponse = {
  points: [
    { id: 'jj', name: 'Justin Jefferson', xPct: 85, yPct: 85, color: '#36E7A1', metricX: '85%', metricY: '85%' },
    { id: 'asb', name: 'Amon-Ra St. Brown', xPct: 65, yPct: 75, color: '#36E7A1', metricX: '65%', metricY: '75%' },
    { id: 'pn', name: 'Puka Nacua', xPct: 60, yPct: 65, color: '#22D3EE', metricX: '60%', metricY: '65%' },
    { id: 'th', name: 'Tyreek Hill', xPct: 30, yPct: 68, color: '#A78BFA', metricX: '30%', metricY: '68%' },
    { id: 'cl', name: 'CeeDee Lamb', xPct: 55, yPct: 58, color: '#36E7A1', metricX: '55%', metricY: '58%' },
    { id: 'nc', name: 'Nico Collins', xPct: 42, yPct: 48, color: '#22D3EE', metricX: '42%', metricY: '48%' },
    { id: 'gw', name: 'Garrett Wilson', xPct: 62, yPct: 52, color: '#22D3EE', metricX: '62%', metricY: '52%' },
    { id: 'dl', name: 'Drake London', xPct: 58, yPct: 42, color: '#64748B', metricX: '58%', metricY: '42%' },
    { id: 'co', name: 'Chris Olave', xPct: 38, yPct: 35, color: '#64748B', metricX: '38%', metricY: '35%' },
    { id: 'mm', name: 'Marvin Mims', xPct: 72, yPct: 22, color: '#EF4444', metricX: '72%', metricY: '22%' },
  ],
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(DATA);
}
