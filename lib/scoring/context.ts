/**
 * Per-league scoring context layer.
 *
 * Resolves a league's scoring type, positional multipliers, and roster format
 * from Sleeper league settings, then exposes helpers used by TFO/BVI/TRE
 * to weight their calculations correctly.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { BVIScoringType } from '@/lib/bvi/engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringContext {
  league_id: string;
  scoring_type: BVIScoringType;
  /** PPR value (0 = standard, 0.5 = half, 1 = full). */
  ppr: number;
  /** TEP (TE premium) bonus per reception. */
  tep: number;
  /** SF (superflex) — second QB slot. */
  superflex: boolean;
  /** Roster size total. */
  roster_size: number;
  /** Starter slots by position. */
  starter_slots: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
    SUPERFLEX: number;
  };
  /** Number of teams in the league. */
  team_count: number;
}

export interface PositionValueMultiplier {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONTEXT: Omit<ScoringContext, 'league_id'> = {
  scoring_type: 'ppr',
  ppr: 1,
  tep: 0,
  superflex: false,
  roster_size: 23,
  starter_slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0 },
  team_count: 12,
};

// ─── Sleeper settings → ScoringContext ───────────────────────────────────────

function sleeperSettingsToContext(
  leagueId: string,
  settings: Record<string, unknown>,
  rosterPositions: string[],
): ScoringContext {
  const rec = (settings['rec'] as number) ?? 1;
  const tepBonus = (settings['bonus_rec_te'] as number) ?? 0;

  let scoring_type: BVIScoringType = 'ppr';
  if (rec === 0) scoring_type = 'standard';
  else if (rec === 0.5) scoring_type = 'half_ppr';
  else scoring_type = 'ppr';

  const slots = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0 };
  for (const pos of rosterPositions) {
    const p = pos.toUpperCase();
    if (p === 'QB') slots.QB++;
    else if (p === 'RB') slots.RB++;
    else if (p === 'WR') slots.WR++;
    else if (p === 'TE') slots.TE++;
    else if (p === 'FLEX' || p === 'WR/RB/TE' || p === 'W/R/T') slots.FLEX++;
    else if (p === 'SUPERFLEX' || p === 'QB/WR/RB/TE' || p === 'Q/W/R/T') slots.SUPERFLEX++;
  }

  const superflex = slots.SUPERFLEX > 0;
  if (superflex) scoring_type = 'superflex';

  return {
    league_id: leagueId,
    scoring_type,
    ppr: rec,
    tep: tepBonus,
    superflex,
    roster_size: rosterPositions.length,
    starter_slots: slots,
    team_count: (settings['num_teams'] as number) ?? 12,
  };
}

// ─── getLeagueScoringContext ──────────────────────────────────────────────────

export async function getLeagueScoringContext(
  leagueId: string,
): Promise<ScoringContext> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from('league_settings')
    .select('scoring_type, ppr, tep, superflex, roster_size, starter_slots, team_count')
    .eq('league_id', leagueId)
    .maybeSingle();

  if (row) {
    const r = row as {
      scoring_type: BVIScoringType;
      ppr: number;
      tep: number;
      superflex: boolean;
      roster_size: number;
      starter_slots: ScoringContext['starter_slots'];
      team_count: number;
    };
    return {
      league_id: leagueId,
      scoring_type: r.scoring_type ?? DEFAULT_CONTEXT.scoring_type,
      ppr: r.ppr ?? DEFAULT_CONTEXT.ppr,
      tep: r.tep ?? DEFAULT_CONTEXT.tep,
      superflex: r.superflex ?? DEFAULT_CONTEXT.superflex,
      roster_size: r.roster_size ?? DEFAULT_CONTEXT.roster_size,
      starter_slots: r.starter_slots ?? DEFAULT_CONTEXT.starter_slots,
      team_count: r.team_count ?? DEFAULT_CONTEXT.team_count,
    };
  }

  // Fallback: fetch from Sleeper API
  try {
    const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}`);
    if (res.ok) {
      const data = (await res.json()) as {
        scoring_settings?: Record<string, unknown>;
        roster_positions?: string[];
        settings?: Record<string, unknown>;
      };
      const settings = { ...(data.scoring_settings ?? {}), ...(data.settings ?? {}) };
      const rosterPositions = data.roster_positions ?? [];
      const ctx = sleeperSettingsToContext(leagueId, settings, rosterPositions);

      // Persist for next call
      await supabase.from('league_settings').upsert(
        {
          league_id: leagueId,
          scoring_type: ctx.scoring_type,
          ppr: ctx.ppr,
          tep: ctx.tep,
          superflex: ctx.superflex,
          roster_size: ctx.roster_size,
          starter_slots: ctx.starter_slots,
          team_count: ctx.team_count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'league_id' },
      );

      return ctx;
    }
  } catch {
    // Fall through to default
  }

  return { league_id: leagueId, ...DEFAULT_CONTEXT };
}

// ─── positionValueMultipliers ─────────────────────────────────────────────────
// Returns how much each position's value should be weighted in this league format.

export function positionValueMultipliers(ctx: ScoringContext): PositionValueMultiplier {
  const { ppr, tep, superflex } = ctx;

  const qbMult = superflex ? 1.5 : 1.0;
  const teMult = tep > 0 ? 1.0 + tep * 0.3 : ppr >= 1 ? 1.1 : 1.0;
  const wrMult = ppr >= 1 ? 1.1 : ppr === 0.5 ? 1.05 : 1.0;
  const rbMult = ppr === 0 ? 1.15 : 1.0;

  return { QB: qbMult, RB: rbMult, WR: wrMult, TE: teMult };
}

// ─── positionalScarcityDepth ──────────────────────────────────────────────────
// How deep does fantasy relevance extend for each position in this league?

export function positionalScarcityDepth(ctx: ScoringContext): Record<string, number> {
  const { team_count, starter_slots } = ctx;
  return {
    QB: team_count * (starter_slots.QB + starter_slots.SUPERFLEX),
    RB: team_count * (starter_slots.RB + starter_slots.FLEX),
    WR: team_count * (starter_slots.WR + starter_slots.FLEX),
    TE: team_count * (starter_slots.TE + Math.ceil(starter_slots.FLEX * 0.15)),
  };
}

// ─── applyLeagueContextToScore ────────────────────────────────────────────────
// Adjusts a 0–100 engine score by league-specific position weight.

export function applyLeagueContextToScore(
  baseScore: number,
  position: string,
  ctx: ScoringContext,
): number {
  const mults = positionValueMultipliers(ctx);
  const pos = position.toUpperCase() as keyof PositionValueMultiplier;
  const mult = mults[pos] ?? 1.0;
  return Math.round(Math.min(100, baseScore * mult) * 10) / 10;
}
