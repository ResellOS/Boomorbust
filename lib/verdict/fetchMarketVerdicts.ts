import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeMarketVerdicts,
  NO_MARKET_DATA_FLAG,
  type MarketVerdict,
  type MarketVerdictInput,
} from './marketVerdict';

/** Display-ready market verdict attached to players across surfaces. */
export interface MarketVerdictDisplay {
  verdict: MarketVerdict;
  color: string;
  rankDelta: number | null;
  noMarketData: boolean;
}

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

function safeScore(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Compute market verdicts MARKET-WIDE across the full scored skill pool so a
 * player's BUY/SELL signal is league-relative, not roster-relative. Shared by
 * the dashboard and the player hub so both surfaces stay consistent.
 *
 * Skill-scoped (QB/RB/WR/TE in formula_scores); KTC market value from bbv_values.
 */
export async function fetchMarketVerdicts(
  supabase: SupabaseClient,
  scoringContext: 'dynasty' | 'redraft' = 'dynasty',
): Promise<Map<string, MarketVerdictDisplay>> {
  const out = new Map<string, MarketVerdictDisplay>();
  try {
    const { data: poolScores } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score')
      .eq('scoring_context', scoringContext)
      .eq('scoring_type', 'ppr')
      .eq('weight_set_name', 'default');

    const poolIds = Array.from(new Set((poolScores ?? []).map((r) => String(r.player_id))));
    if (poolIds.length === 0) return out;

    const posById = new Map<string, string>();
    for (let i = 0; i < poolIds.length; i += 200) {
      const { data } = await supabase
        .from('players')
        .select('id, position')
        .in('id', poolIds.slice(i, i + 200));
      for (const p of data ?? []) posById.set(String(p.id), (p.position ?? '—').toUpperCase());
    }

    const ktcById = new Map<string, number>();
    for (let i = 0; i < poolIds.length; i += 200) {
      const { data } = await supabase
        .from('bbv_values')
        .select('player_id, ktc_value')
        .in('player_id', poolIds.slice(i, i + 200));
      for (const r of data ?? []) ktcById.set(String(r.player_id), Number(r.ktc_value) || 0);
    }

    const tfoById = new Map(
      (poolScores ?? []).map((r) => [String(r.player_id), safeScore(r.tfo_score)]),
    );

    const inputs: MarketVerdictInput[] = poolIds
      .filter((id) => SKILL.has(posById.get(id) ?? ''))
      .map((id) => ({
        playerId: id,
        tfoScore: tfoById.get(id) ?? 0,
        ktcValue: ktcById.get(id) ?? 0,
      }));

    for (const [id, r] of Array.from(computeMarketVerdicts(inputs))) {
      out.set(id, {
        verdict: r.verdict,
        color: r.color,
        rankDelta: r.rankDelta,
        noMarketData: r.flags.includes(NO_MARKET_DATA_FLAG),
      });
    }
  } catch (err) {
    console.error('[marketVerdicts] compute failed:', err);
  }
  return out;
}
