import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeFFig } from '@/lib/ffig/engine';
import { HISTORICAL_PROSPECTS } from '@/lib/ffig/seed-data';

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createAdminClient();

  const rows = HISTORICAL_PROSPECTS.map((p) => {
    const result = computeFFig(p);
    return {
      player_name:                result.player_name,
      position:                   result.position,
      draft_year:                 result.draft_year,
      draft_round:                result.draft_round ?? null,
      draft_pick:                 result.draft_pick ?? null,
      college:                    result.college ?? null,
      nfl_team:                   result.nfl_team ?? null,
      age_at_draft:               result.age_at_draft ?? null,
      dom_score:                  result.dom_score,
      ras_score:                  result.ras_score,
      breakout_age:               result.breakout_age ?? null,
      target_share:               result.target_share,
      small_school_penalty:       result.small_school_penalty,
      committee_backfield_penalty:result.committee_backfield_penalty,
      p2s_bust_penalty:           result.p2s_bust_penalty,
      penalty_total:              result.penalty_total,
      vacated_volume_mod:         result.vacated_volume_mod,
      qb_coefficient_mod:         result.qb_coefficient_mod,
      scheme_proe_mod:            result.scheme_proe_mod,
      lsm_total:                  result.lsm_total,
      ffig_score:                 result.ffig_score,
      ffig_grade:                 result.ffig_grade,
      dynasty_hit:                result.dynasty_hit ?? null,
      career_ppg:                 result.career_ppg ?? null,
    };
  });

  const { error } = await db
    .from('ffig_prospects')
    .upsert(rows, { onConflict: 'player_name,draft_year' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `✓ Seeded ${rows.length} F-FIG prospects (2000–2025)` });
}
