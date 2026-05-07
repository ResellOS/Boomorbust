import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** FantasyCalc-style blended market score: geometric mean √(KTC×BBV) when both known, else KTC/BBV fallback — fed from synced bbv_values. */
export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('bbv_values').select('player_id, ktc_value, bbv_score');
    if (error || !data) return NextResponse.json({ values: {} });

    const values: Record<string, number> = {};
    for (const row of data) {
      const k = Number(row.ktc_value) || 0;
      const b = Number(row.bbv_score) || 0;
      if (k > 0 && b > 0) values[row.player_id] = Math.round(Math.sqrt(k * b));
      else if (b > 0) values[row.player_id] = Math.round(b);
      else if (k > 0) values[row.player_id] = Math.round(k);
    }
    return NextResponse.json({ values });
  } catch {
    return NextResponse.json({ values: {} });
  }
}
