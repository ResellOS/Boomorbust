import type { SupabaseClient } from '@supabase/supabase-js';

/** Latest formula_scores.calculated_at for a scoring context (most recent rescore). */
export async function fetchLatestFormulaCalculatedAt(
  supabase: SupabaseClient,
  scoringContext: 'dynasty' | 'redraft' = 'dynasty',
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select('calculated_at')
      .eq('scoring_context', scoringContext)
      .not('calculated_at', 'is', null)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data?.calculated_at as string | null) ?? null;
  } catch (err) {
    console.error('[formula] latest calculated_at fetch failed:', err);
    return null;
  }
}
