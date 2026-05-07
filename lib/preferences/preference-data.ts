/**
 * Canonical shape for profiles.preference_data (JSON column).
 * There is no separate user_preferences table; all user prefs persist here or on columns like risk_tolerance.
 */

export type PositionPriority = 'rb_first' | 'wr_first' | 'bpa';

export type RebuildPhilosophy = 'patient' | 'opportunistic' | 'aggressive';

export type ContentionWindow = '1' | '2' | '3' | 'forever';

export type DefaultValueSystem = 'ktc' | 'bbv' | 'fantasycalc';

export interface UserPreferenceData {
  /** Legacy drag-order positional ranking — derived from position_priority when missing */
  positionalRanking?: ('QB' | 'RB' | 'WR' | 'TE')[];
  hiddenLeagues?: string[];
  /** elite vs pro entitlement (also uses is_paid heuristic in layout when unset) */
  subscription_tier?: 'pro' | 'elite';
  digest_enabled?: boolean;
  notify_injury_email?: boolean;
  notify_price_email?: boolean;
  notify_trade_email?: boolean;
  notify_push_injury?: boolean;
  notify_push_trade?: boolean;
  push_enabled?: boolean;

  /** Dynasty strategy — stored in preference_data */
  position_priority?: PositionPriority;
  rebuild_philosophy?: RebuildPhilosophy;
  contention_window?: ContentionWindow;

  /** UI */
  default_value_system?: DefaultValueSystem;
  theme?: 'dark';
  show_player_photos?: boolean;
  compact_mode?: boolean;
}

export function mergePreferenceData(
  existing: Record<string, unknown> | null | undefined,
  patch: Partial<UserPreferenceData>
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && existing !== null && !Array.isArray(existing)
      ? { ...existing }
      : {};
  return { ...base, ...patch };
}

export function rankingFromPositionPriority(
  p: PositionPriority | undefined,
  legacy: ('QB' | 'RB' | 'WR' | 'TE')[] | undefined
): ('QB' | 'RB' | 'WR' | 'TE')[] {
  if (p === 'rb_first') return ['RB', 'WR', 'TE', 'QB'];
  if (p === 'wr_first') return ['WR', 'RB', 'TE', 'QB'];
  if (p === 'bpa') return ['QB', 'RB', 'WR', 'TE'];
  return legacy?.length ? legacy : ['QB', 'RB', 'WR', 'TE'];
}

export function inferPositionPriorityFromRanking(
  rank: ('QB' | 'RB' | 'WR' | 'TE')[]
): PositionPriority | undefined {
  const first = rank[0];
  if (first === 'RB') return 'rb_first';
  if (first === 'WR') return 'wr_first';
  return 'bpa';
}
