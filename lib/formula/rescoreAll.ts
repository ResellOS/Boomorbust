import { createAdminClient } from '@/lib/supabase/admin';
import { calculateTFOScore, type CalculateTFOScoreInput } from '@/lib/tfo/formula';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
const BATCH = 100;

export interface RescoreResult {
  ok: boolean;
  scored: number;
  errors: number;
  calculated_at: string;
}

/** Full formula_scores rescore for dynasty / ppr / default weights. */
export async function rescoreAllPlayers(): Promise<RescoreResult> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  let scored = 0;
  let errors = 0;

  const { data: bbvRows, error: bbvErr } = await db
    .from('bbv_values')
    .select(
      'player_id, player_name, position, team, age, depth_order, ktc_value, bbv_score',
    );

  if (bbvErr) throw new Error(bbvErr.message);

  const [allPlayers, ktcList] = await Promise.all([fetchAllPlayers(), getKTCValues()]);
  const ktcByName = new Map(
    (ktcList ?? []).map((k) => [k.player_name.toLowerCase(), k.ktc_value]),
  );

  const rows: Record<string, unknown>[] = [];

  for (const raw of bbvRows ?? []) {
    const playerId = String(raw.player_id ?? '');
    if (!playerId) continue;
    const position = String(raw.position ?? '').toUpperCase();
    if (!SKILL.has(position)) continue;

    const sleeper = allPlayers?.[playerId as keyof typeof allPlayers] as
      | { full_name?: string; age?: number; team?: string; depth_chart_order?: number | null }
      | undefined;

    const name = String(raw.player_name ?? sleeper?.full_name ?? '');
    const ktcValue =
      Number(raw.ktc_value) ||
      ktcByName.get(name.toLowerCase()) ||
      0;
    const depth = Number(raw.depth_order ?? sleeper?.depth_chart_order ?? 3);
    const opportunityScore = depth === 1 ? 85 : depth === 2 ? 55 : 35;

    const input: CalculateTFOScoreInput = {
      playerId,
      position: position as CalculateTFOScoreInput['position'],
      age: Number(raw.age ?? sleeper?.age ?? 26),
      team: String(raw.team ?? sleeper?.team ?? 'FA'),
      ocScheme: 'default',
      opportunityScore,
      olGrade: 60,
      wrCastGrade: 60,
      redZoneShare: depth === 1 ? 22 : 10,
      ktcValue,
    };

    try {
      const result = calculateTFOScore(input);
      rows.push({
        player_id: playerId,
        scoring_context: 'dynasty',
        scoring_type: 'ppr',
        weight_set_name: 'default',
        tfo_score: result.tfoScore,
        verdict: result.verdict,
        ops_score: opportunityScore,
        sfs_score: 55,
        yoysi_score: 50,
        sit_score: 50,
        confidence_tier: result.confidence,
        calculated_at: now,
      });
    } catch {
      errors++;
    }
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db
      .from('formula_scores')
      .upsert(chunk, {
        onConflict: 'player_id,scoring_context,scoring_type,weight_set_name',
      });
    if (error) {
      // Fallback without explicit conflict target if schema differs
      const { error: err2 } = await db.from('formula_scores').upsert(chunk);
      if (err2) {
        errors += chunk.length;
        continue;
      }
    }
    scored += chunk.length;
  }

  return { ok: true, scored, errors, calculated_at: now };
}

export async function fetchEngineStatus(): Promise<{
  online: boolean;
  lastRun: string | null;
  dynastyCount: number;
}> {
  const db = createAdminClient();
  let lastRun: string | null = null;
  let dynastyCount = 0;

  try {
    const { data } = await db
      .from('formula_scores')
      .select('calculated_at')
      .eq('scoring_context', 'dynasty')
      .not('calculated_at', 'is', null)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastRun = (data?.calculated_at as string | null) ?? null;
  } catch {
    /* table may be empty */
  }

  try {
    const { count } = await db
      .from('formula_scores')
      .select('player_id', { count: 'exact', head: true })
      .eq('scoring_context', 'dynasty')
      .eq('scoring_type', 'ppr')
      .eq('weight_set_name', 'default');
    dynastyCount = count ?? 0;
  } catch {
    dynastyCount = 0;
  }

  return {
    online: dynastyCount > 0,
    lastRun,
    dynastyCount,
  };
}
