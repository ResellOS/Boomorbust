import { createAdminClient } from '@/lib/supabase/admin';
import type { FFigInput, FFigResult } from '@/lib/ffig/engine';
import { computeFFig } from '@/lib/ffig/engine';

export async function gradeAllProspects(): Promise<FFigResult[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from('ffig_prospects')
    .select('*')
    .order('draft_year', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const input: FFigInput = {
      player_name: row.player_name,
      position: row.position,
      draft_year: row.draft_year,
      draft_round: row.draft_round ?? null,
      draft_pick: row.draft_pick ?? null,
      college: row.college ?? null,
      nfl_team: row.nfl_team ?? null,
      age_at_draft: row.age_at_draft ?? null,
      dom_score: row.dom_score ?? 0,
      ras_score: row.ras_score ?? 5,
      breakout_age: row.breakout_age ?? null,
      target_share: row.target_share ?? 0,
      small_school_penalty: row.small_school_penalty ?? false,
      committee_backfield_penalty: row.committee_backfield_penalty ?? false,
      p2s_bust_penalty: row.p2s_bust_penalty ?? false,
      vacated_volume_mod: row.vacated_volume_mod ?? 0,
      qb_coefficient_mod: row.qb_coefficient_mod ?? 0,
      scheme_proe_mod: row.scheme_proe_mod ?? 0,
      dynasty_hit: row.dynasty_hit ?? null,
      career_ppg: row.career_ppg ?? null,
    };
    return computeFFig(input);
  });
}

export * from './rookie2025Board';
