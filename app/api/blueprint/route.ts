/**
 * Blueprint API — dynasty team strategy blueprint.
 * Gated to veteran+ (elite tier).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '@/lib/access/gates';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRecommendedTargets } from '@/lib/recommendations/targets';

export async function POST(request: NextRequest) {
  const access = await requireFeature('blueprint');
  if (access instanceof NextResponse) return access;
  const { userId } = access;

  let body: { league_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { league_id } = body;
  if (!league_id) {
    return NextResponse.json({ error: 'league_id required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get league settings for this owner
  const { data: settings } = await supabase
    .from('league_settings')
    .select('*')
    .eq('league_id', league_id)
    .eq('owner_id', userId)
    .maybeSingle();

  const [targets, dmpRow] = await Promise.all([
    getRecommendedTargets(league_id, userId),
    supabase
      .from('dmp_profiles')
      .select('title, title_display, title_description, pitch_angle, labels')
      .eq('user_id', userId)
      .eq('league_id', league_id)
      .maybeSingle(),
  ]);

  const dmp = dmpRow.data as {
    title: string;
    title_display: string;
    title_description: string;
    pitch_angle: string;
    labels: Record<string, number>;
  } | null;

  const s = settings as {
    contention_window_start?: number | null;
    contention_window_end?: number | null;
    roster_needs?: string[];
    scoring_type?: string;
    superflex?: boolean;
  } | null;

  return NextResponse.json({
    league_id,
    contention_window: {
      start: s?.contention_window_start ?? null,
      end: s?.contention_window_end ?? null,
    },
    roster_needs: s?.roster_needs ?? [],
    scoring_type: s?.scoring_type ?? 'ppr',
    superflex: s?.superflex ?? false,
    manager_profile: dmp
      ? {
          archetype: dmp.title,
          display: dmp.title_display,
          description: dmp.title_description,
          pitch: dmp.pitch_angle,
          win_now_index: dmp.labels?.win_now_index ?? null,
          rebuild_index: dmp.labels?.rebuild_index ?? null,
        }
      : null,
    recommended_targets: targets,
  });
}
