import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchNflState,
  tryGlobalLeagueSearch,
  filterUserLeaguesByName,
  formatLeagueScoringLabel,
  type SleeperLeague,
} from '@/lib/sleeper';

export const dynamic = 'force-dynamic';

function toHit(l: SleeperLeague) {
  return {
    league_id: l.league_id,
    name: l.name,
    total_rosters: l.total_rosters ?? 0,
    season: l.season ?? '',
    scoring_settings: l.scoring_settings ?? {},
    scoring_label: formatLeagueScoringLabel(l.scoring_settings),
    status: l.status ?? '',
  };
}

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', leagues: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name')?.trim() ?? '';
  if (name.length < 2) {
    return NextResponse.json(
      { error: 'Query "name" must be at least 2 characters', leagues: [] },
      { status: 400 },
    );
  }

  const global = await tryGlobalLeagueSearch(name);
  if (global !== null && global.length > 0) {
    return NextResponse.json({
      leagues: global.map(toHit),
      source: 'global' as const,
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.sleeper_user_id) {
    if (global === null) {
      return NextResponse.json(
        {
          leagues: [] as ReturnType<typeof toHit>[],
          source: 'account' as const,
          error:
            'League search is unavailable and no Sleeper account is linked. Save your Sleeper username first.',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      leagues: [] as ReturnType<typeof toHit>[],
      source: 'account' as const,
    });
  }

  const state = await fetchNflState();
  const season = state?.season ?? '2025';
  const filtered = await filterUserLeaguesByName(String(profile.sleeper_user_id), season, name);

  return NextResponse.json({
    leagues: filtered.map(toHit),
    source: 'account' as const,
  });
}
