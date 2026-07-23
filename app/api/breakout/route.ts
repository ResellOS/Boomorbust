import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/breakout?minScore=5 — breakout candidates above a match-score floor,
// highest probability first. Reads the shared `breakout_profiles` table populated
// by the engine's breakout scan. (Note: the table is `breakout_profiles`, not
// `breakout_matches`.) Degrades to empty (never 500).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const minScore = Number(url.searchParams.get('minScore') ?? '5');

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('breakout_profiles')
      .select('*')
      .gt('match_score', Number.isFinite(minScore) ? minScore : 5)
      .order('breakout_probability', { ascending: false })
      .order('match_score', { ascending: false })
      .limit(30);
    if (error) return NextResponse.json({ count: 0, candidates: [], note: error.message });
    // Breakout candidates are not user-specific and change slowly — cache 1h.
    return NextResponse.json(
      { count: data?.length ?? 0, candidates: data ?? [] },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
  } catch (e) {
    return NextResponse.json({ count: 0, candidates: [], note: e instanceof Error ? e.message : 'error' });
  }
}
