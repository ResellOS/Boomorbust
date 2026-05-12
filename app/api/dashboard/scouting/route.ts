import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface WaiverRadarPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  bbsm_score: number;
  p3w_projected: number;
  trend_velocity: number;
  roster_need_weight: number;
  trend: 'up' | 'down' | 'flat';
  verdict: string | null;
  grade: string | null;
}

export interface ProcessResultsPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  process_score: number;
  results_score: number;
  divergence: number;
  divergence_type: 'hidden_gem' | 'regression_risk' | 'aligned';
  verdict: string | null;
  tfo_trend: 'rising' | 'falling' | 'neutral';
}

export interface HiddenGem {
  player_id: string;
  name: string;
  position: string;
  team: string;
  bvi_score: number;
  ktc_value: number;
  delta: number;
  verdict: string | null;
  process_score: number;
  results_score: number;
  reasoning: string;
}

export interface WREfficiencyPlayer {
  player_id: string;
  name: string;
  team: string;
  /** All axes 0-100 */
  separation_grade: number;
  routes_run_pct: number;
  tprr: number;
  matchup_multiplier: number;
  depth_chart_priority: number;
  boom_bust_risk: number;
}

export interface ScoutingData {
  waiverRadar: WaiverRadarPlayer[];
  processResults: ProcessResultsPlayer[];
  hiddenGems: HiddenGem[];
  wrEfficiency: WREfficiencyPlayer[];
  activeLeagueId: string | null;
  activeLeagueName: string;
  gapPositions: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function gemReasoning(
  name: string,
  position: string,
  delta: number,
  divergence: number,
): string {
  const signal = delta > 1500 ? 'significantly' : delta > 800 ? 'notably' : 'slightly';
  const proc = divergence > 15 ? 'structural metrics are well ahead of their current fantasy output' : 'process scores outpace results';
  return `${name} is ${signal} undervalued by the market — BVI delta +${delta.toLocaleString()}. Their ${proc}, suggesting a buy window before the market adjusts.`;
}

// ─── GET /api/dashboard/scouting ─────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const requestedLeagueId = searchParams.get('leagueId');

  // ── Load player DB + user leagues ──────────────────────────────────────────
  const [playerDbRaw, leaguesResult, profileResult] = await Promise.all([
    fetchAllPlayers(),
    admin.from('leagues').select('id, name').eq('user_id', user.id),
    admin.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
  ]);

  const playerDb = playerDbRaw ?? {};
  const leagues = (leaguesResult.data ?? []) as Array<{ id: string; name: string }>;
  const sleeperSid = (profileResult.data as { sleeper_user_id?: string | null } | null)?.sleeper_user_id ?? null;

  const activeLeague = requestedLeagueId
    ? leagues.find(l => l.id === requestedLeagueId) ?? leagues[0]
    : leagues[0];
  const activeLeagueId = activeLeague?.id ?? null;
  const activeLeagueName = activeLeague?.name ?? 'Your League';

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [tfoResult, pvResult, rostersResult] = await Promise.all([
    admin.from('tfo_cache')
      .select('player_id, league_id, tfo_score, ops_score, sfs_score, ffig_score, sit_score, irs_score, grade, verdict')
      .eq('league_id', activeLeagueId ?? '')
      .order('tfo_score', { ascending: false }),
    admin.from('player_values').select('player_id, bvi_score, ktc_value, delta, trend, scoring_type'),
    activeLeagueId
      ? admin.from('rosters').select('owner_id, players').eq('league_id', activeLeagueId)
      : Promise.resolve({ data: [] }),
  ]);

  type TfoRow = {
    player_id: string; league_id: string | null;
    tfo_score: number; ops_score: number | null; sfs_score: number | null;
    ffig_score: number | null; sit_score: number | null; irs_score: number | null;
    grade: string | null; verdict: string | null;
  };
  type PvRow = {
    player_id: string; bvi_score: number; ktc_value: number;
    delta: number; trend: string; scoring_type: string;
  };
  type RosterRow = { owner_id: string | null; players: string[] | null };

  const tfoRows  = (tfoResult.data  ?? []) as TfoRow[];
  const pvRows   = (pvResult.data   ?? []) as PvRow[];
  const rosters  = (rostersResult.data ?? []) as RosterRow[];

  // Identify rostered player IDs in this league
  const rosteredIds = new Set<string>();
  for (const r of rosters) {
    for (const pid of (r.players ?? [])) rosteredIds.add(pid);
  }

  // My roster (by sleeper_user_id)
  const myRoster = sleeperSid
    ? rosters.find(r => r.owner_id === sleeperSid)
    : null;
  const myPlayerIds = new Set(myRoster?.players ?? []);

  // BVI map by player_id (prefer ppr scoring_type)
  const bviMap = new Map<string, PvRow>();
  for (const r of pvRows) {
    if (!bviMap.has(r.player_id) || r.scoring_type === 'ppr') bviMap.set(r.player_id, r);
  }

  // ── Gap positions for waiver need weight ──────────────────────────────────
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  const gapPositions: string[] = [];
  if (myPlayerIds.size > 0) {
    const posTfoSums: Record<string, number[]> = {};
    for (const pid of Array.from(myPlayerIds)) {
      const p = playerDb[pid as keyof typeof playerDb] as { position?: string } | undefined;
      const pos = (p?.position ?? '').toUpperCase();
      if (!SKILL.has(pos)) continue;
      const row = tfoRows.find(r => r.player_id === pid);
      if (!posTfoSums[pos]) posTfoSums[pos] = [];
      posTfoSums[pos]!.push(row?.tfo_score != null ? Number(row.tfo_score) : 55);
    }
    const posAvg: Record<string, number> = {};
    for (const [pos, scores] of Object.entries(posTfoSums)) {
      posAvg[pos] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    const sorted = Object.entries(posAvg).sort(([, a], [, b]) => a - b);
    gapPositions.push(...sorted.slice(0, 2).map(([pos]) => pos));
  }

  // ── 1. Waiver Radar ────────────────────────────────────────────────────────
  const waiverRadar: WaiverRadarPlayer[] = [];
  for (const row of tfoRows) {
    if (rosteredIds.has(row.player_id)) continue; // skip rostered players
    const p = playerDb[row.player_id as keyof typeof playerDb] as
      | { full_name?: string; position?: string; team?: string }
      | undefined;
    if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;

    const opsScore = Number(row.ops_score ?? 50);
    const pv = bviMap.get(row.player_id);
    const tfoTrend = (pv?.trend ?? 'neutral') as string;

    const trendVelocity = tfoTrend === 'rising' ? 80 : tfoTrend === 'falling' ? 20 : 50;
    const rosterNeedWeight = gapPositions.includes((p.position ?? '').toUpperCase()) ? 85 : 35;

    const bbsmScore = Math.round(clamp(opsScore * 0.45 + trendVelocity * 0.30 + rosterNeedWeight * 0.25) * 10) / 10;
    const trend: WaiverRadarPlayer['trend'] =
      tfoTrend === 'rising' ? 'up' : tfoTrend === 'falling' ? 'down' : 'flat';

    waiverRadar.push({
      player_id: row.player_id,
      name: p.full_name ?? row.player_id,
      position: (p.position ?? 'WR').toUpperCase(),
      team: p.team ?? '',
      bbsm_score: bbsmScore,
      p3w_projected: Math.round(opsScore * 10) / 10,
      trend_velocity: trendVelocity,
      roster_need_weight: rosterNeedWeight,
      trend,
      verdict: row.verdict,
      grade: row.grade,
    });
  }
  waiverRadar.sort((a, b) => b.bbsm_score - a.bbsm_score);

  // ── 2. Process vs Results ─────────────────────────────────────────────────
  const SKILL_POS = ['QB', 'RB', 'WR', 'TE'];
  const processResults: ProcessResultsPlayer[] = [];
  for (const row of tfoRows.slice(0, 60)) {
    const p = playerDb[row.player_id as keyof typeof playerDb] as
      | { full_name?: string; position?: string; team?: string }
      | undefined;
    if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;

    const sfs = Number(row.sfs_score ?? 68);
    const ops = Number(row.ops_score ?? 55);
    // Age curve approximation from grade
    const ageCurveProxy = row.grade === 'ELITE' ? 90 : row.grade === 'HIGH VALUE' ? 78 : row.grade === 'VIABLE' ? 65 : 50;
    // Process: structural inputs (scheme fit + opportunity + age curve)
    const processScore = clamp(sfs * 0.40 + ops * 0.35 + ageCurveProxy * 0.25);
    // Results: actual TFO (includes in-season performance adjustments)
    const resultsScore = Number(row.tfo_score);
    const divergence = Math.round((processScore - resultsScore) * 10) / 10;

    const divergenceType: ProcessResultsPlayer['divergence_type'] =
      divergence > 8 ? 'hidden_gem' : divergence < -8 ? 'regression_risk' : 'aligned';

    const pv = bviMap.get(row.player_id);
    const tfoTrend = ((pv?.trend ?? 'neutral') as string) as 'rising' | 'falling' | 'neutral';

    processResults.push({
      player_id: row.player_id,
      name: p.full_name ?? row.player_id,
      position: (p.position ?? 'WR').toUpperCase(),
      team: p.team ?? '',
      process_score: Math.round(processScore * 10) / 10,
      results_score: Math.round(resultsScore * 10) / 10,
      divergence,
      divergence_type: divergenceType,
      verdict: row.verdict,
      tfo_trend: tfoTrend,
    });
  }
  // Sort by absolute divergence descending
  processResults.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

  // ── 3. Hidden Gems ────────────────────────────────────────────────────────
  const hiddenGems: HiddenGem[] = [];
  const HIDDEN_GEM_THRESHOLD = 600;
  for (const row of tfoRows) {
    const pv = bviMap.get(row.player_id);
    if (!pv || pv.delta < HIDDEN_GEM_THRESHOLD) continue;

    const p = playerDb[row.player_id as keyof typeof playerDb] as
      | { full_name?: string; position?: string; team?: string }
      | undefined;
    if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;

    const pr = processResults.find(r => r.player_id === row.player_id);
    const divergence = pr?.divergence ?? 0;
    if (divergence < 5) continue; // must have process > results

    hiddenGems.push({
      player_id: row.player_id,
      name: p.full_name ?? row.player_id,
      position: (p.position ?? 'WR').toUpperCase(),
      team: p.team ?? '',
      bvi_score: pv.bvi_score,
      ktc_value: pv.ktc_value,
      delta: pv.delta,
      verdict: row.verdict,
      process_score: pr?.process_score ?? 0,
      results_score: pr?.results_score ?? 0,
      reasoning: gemReasoning(p.full_name ?? row.player_id, (p.position ?? 'WR').toUpperCase(), pv.delta, divergence),
    });
  }
  hiddenGems.sort((a, b) => b.delta - a.delta);

  // ── 4. WR Efficiency Matrix ───────────────────────────────────────────────
  const wrRows = tfoRows.filter(r => {
    const p = playerDb[r.player_id as keyof typeof playerDb] as { position?: string } | undefined;
    return (p?.position ?? '').toUpperCase() === 'WR';
  }).slice(0, 12);

  const wrEfficiency: WREfficiencyPlayer[] = wrRows.map(row => {
    const p = playerDb[row.player_id as keyof typeof playerDb] as
      | { full_name?: string; team?: string }
      | undefined;
    const tfoScore = Number(row.tfo_score);
    const sfs = Number(row.sfs_score ?? 68);
    const ops = Number(row.ops_score ?? 55);
    const ffig = Number(row.ffig_score ?? 55);
    const sit = Number(row.sit_score ?? 55);
    const irs = Number(row.irs_score ?? 20);

    // Derive 6 WR-specific axes from available tfo_cache data
    return {
      player_id: row.player_id,
      name: p?.full_name ?? row.player_id,
      team: p?.team ?? '',
      separation_grade:     clamp(sfs),                // scheme fit → route separation proxy
      routes_run_pct:       clamp(ops),                // opportunity score → routes run share
      tprr:                 clamp(ffig),               // F-FIG → target efficiency
      matchup_multiplier:   clamp(sit),                // situational score → matchup advantage
      depth_chart_priority: clamp(tfoScore),           // overall TFO → depth chart signal
      boom_bust_risk:       clamp(100 - irs),          // inverted IRS (high IRS = risky = low score)
    };
  });

  void SKILL_POS; // used above, silence unused warning

  return NextResponse.json({
    waiverRadar: waiverRadar.slice(0, 30),
    processResults: processResults.slice(0, 20),
    hiddenGems: hiddenGems.slice(0, 5),
    wrEfficiency,
    activeLeagueId,
    activeLeagueName,
    gapPositions,
  } satisfies ScoutingData);
}
