import { createAdminClient } from '@/lib/supabase/admin';

export interface LandingStats {
  playersScored: number;
  leaguesSynced: number;
}

export async function fetchLandingStats(): Promise<LandingStats> {
  const fallback: LandingStats = { playersScored: 0, leaguesSynced: 0 };

  try {
    const supabase = createAdminClient();
    const [{ count: playerCount }, { count: leagueCount }] = await Promise.all([
      supabase
        .from('formula_scores')
        .select('player_id', { count: 'exact', head: true })
        .eq('scoring_context', 'dynasty')
        .eq('scoring_type', 'ppr'),
      supabase.from('leagues').select('id', { count: 'exact', head: true }),
    ]);

    return {
      playersScored: playerCount ?? 0,
      leaguesSynced: leagueCount ?? 0,
    };
  } catch (err) {
    console.error('[landing] stats fetch failed:', err);
    return fallback;
  }
}
