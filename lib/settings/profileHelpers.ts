import type { SupabaseClient } from '@supabase/supabase-js';

function detectPpr(scoring: Record<string, number> | null | undefined): string {
  const rec = scoring?.rec;
  if (rec === 1) return 'PPR';
  if (rec === 0.5) return '0.5 PPR';
  return 'Standard';
}

function detectSuperflex(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  if (!settings) return false;
  const positions = settings.roster_positions;
  if (Array.isArray(positions)) {
    return positions.some((p) => String(p).toUpperCase().includes('SUPER_FLEX') || String(p) === 'SF');
  }
  return Number(settings.superflex ?? 0) > 0;
}

export function formatLeagueConnection(
  league: {
    id: string;
    name: string;
    season: string | null;
    total_rosters: number | null;
    scoring_settings: Record<string, number> | null;
    settings: Record<string, unknown> | null;
  },
  sleeperUserId: string | null,
): {
  id: string;
  name: string;
  format: string;
  role: string;
  since: string;
  championships: number;
} {
  const ppr = detectPpr(league.scoring_settings);
  const sf = detectSuperflex(league.settings);
  const teams = league.total_rosters ?? 12;
  const commissionerId = String(
    (league.settings as { commissioner_id?: string } | null)?.commissioner_id ?? '',
  );
  const role =
    sleeperUserId && commissionerId && commissionerId === sleeperUserId
      ? 'Commissioner'
      : 'Owner';
  const sinceYear = league.season ? Number.parseInt(league.season, 10) : NaN;

  return {
    id: league.id,
    name: league.name,
    format: `${teams}-Team${sf ? ' SF' : ''} ${ppr}`,
    role,
    since: Number.isFinite(sinceYear) ? `Since ${sinceYear}` : 'Connected',
    championships: 0,
  };
}

export async function countDistinctFormulaPlayers(
  supabase: SupabaseClient,
  scoringContext: 'dynasty' | 'redraft' = 'dynasty',
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('formula_scores')
      .select('player_id')
      .eq('scoring_context', scoringContext)
      .eq('scoring_type', 'ppr')
      .eq('weight_set_name', 'default');
    if (error) throw error;
    return new Set((data ?? []).map((r) => String(r.player_id))).size;
  } catch {
    return 0;
  }
}

export async function avgRosterTfoScore(
  supabase: SupabaseClient,
  playerIds: string[],
): Promise<number | null> {
  if (playerIds.length === 0) return null;
  const scores: number[] = [];
  const batch = 200;
  for (let i = 0; i < playerIds.length; i += batch) {
    const slice = playerIds.slice(i, i + batch);
    const { data } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score')
      .eq('scoring_context', 'dynasty')
      .eq('scoring_type', 'ppr')
      .eq('weight_set_name', 'default')
      .in('player_id', slice);
    const latest = new Map<string, number>();
    for (const row of data ?? []) {
      const pid = String(row.player_id);
      const score = Number(row.tfo_score);
      if (!Number.isFinite(score)) continue;
      if (!latest.has(pid)) latest.set(pid, score);
    }
    for (const pid of slice) {
      const s = latest.get(pid);
      if (s != null) scores.push(s);
    }
  }
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export async function collectRosterPlayerIds(
  supabase: SupabaseClient,
  sleeperUserId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('rosters')
    .select('players')
    .eq('owner_id', sleeperUserId);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    for (const pid of (row.players as string[] | null) ?? []) {
      if (pid) ids.add(String(pid));
    }
  }
  return Array.from(ids);
}
