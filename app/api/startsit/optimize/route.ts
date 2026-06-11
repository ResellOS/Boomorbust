import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchStartSitData } from '@/lib/startsit/fetchStartSitData';
import { resolveNflWeek } from '@/lib/startsit/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.sleeper_user_id) {
      return NextResponse.json({ error: 'Sleeper not linked' }, { status: 400 });
    }

    let week: number | undefined;
    try {
      const body = (await request.json()) as { week?: number };
      week = body.week;
    } catch {
      // no body
    }

    const { week: currentWeek, season } = await resolveNflWeek();
    const targetWeek = week ?? currentWeek;

    const data = await fetchStartSitData(userId, profile.sleeper_user_id, targetWeek);

    const starters = data.startThese.slice(0, 9).map((p) => ({
      playerId: p.playerId,
      name: p.fullName,
      position: p.position,
      startScore: p.startScore,
    }));

    for (const rec of data.allRecommendations) {
      try {
        await admin.from('startsit_history').insert({
          user_id: userId,
          player_id: rec.playerId,
          league_id: rec.leagueIds[0] ?? null,
          week: targetWeek,
          season,
          recommendation: rec.startScore >= 50 ? 'START' : 'SIT',
          confidence: rec.confidence,
          projected_points: rec.projectedPoints,
          result: 'PENDING',
        });
      } catch {
        // table may not exist yet — non-fatal
      }
    }

    return NextResponse.json({
      message: `Optimized ${starters.length} starters across ${data.leagueCount} leagues for Week ${targetWeek}`,
      starters,
      leagueCount: data.leagueCount,
    });
  } catch (err) {
    console.error('[startsit/optimize] failed:', err);
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
  }
}
