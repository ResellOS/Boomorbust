import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/players/[playerId]/intel — one Player Intel payload joining every
// source the new Trade Center panel needs. Real data where the source table is
// populated; null (never a fabricated value) where it's empty. `pending` lists the
// section keys whose source is empty/missing so the frontend can hide them instead
// of rendering zeros.
//
// Source population confirmed live (2026-07 audit still holds):
//   POPULATED: formula_scores (1079), ktc_market_values (421), sospp_scores (538),
//              player_value_history (3783), players (542)
//   EMPTY (pending): breakout_profiles, regime_change_alerts, sell_window_alerts,
//              medical_history

function gradeFromTfo(score: number): string {
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

export async function GET(_req: Request, { params }: { params: { playerId: string } }) {
  const playerId = String(params.playerId ?? '').trim();
  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 });

  const pending: string[] = [];

  try {
    const db = createAdminClient();

    const [
      playerRes,
      scoreRes,
      ktcRes,
      sosppRes,
      breakoutRes,
      regimeRes,
      sellRes,
      historyRes,
    ] = await Promise.all([
      db.from('players').select('full_name, position, team, injury_status').eq('id', playerId).maybeSingle(),
      db
        .from('formula_scores')
        .select('tfo_score, verdict, rank_delta, mrs_adjustment, confidence_tier, sospp_score, calculated_at')
        .eq('player_id', playerId)
        .eq('scoring_context', 'dynasty')
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('ktc_market_values')
        .select('ktc_value, ktc_rank, position_rank, updated_at')
        .eq('player_id', playerId)
        .maybeSingle(),
      db
        .from('sospp_scores')
        .select('sospp_score, sospp_outlook, sospp_summary, warning, calculated_at')
        .eq('player_id', playerId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('breakout_profiles').select('*').eq('player_id', playerId).maybeSingle(),
      db
        .from('regime_change_alerts')
        .select('change_type, change_description, estimated_impact_direction')
        .eq('player_id', playerId)
        .eq('acknowledged', false)
        .order('change_detected_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('sell_window_alerts')
        .select('alert_type, urgency, reason')
        .eq('player_id', playerId)
        .eq('acknowledged', false)
        .order('urgency_score', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('player_value_history')
        .select('date, tfo_score, ktc_value')
        .eq('player_id', playerId)
        .gte('date', new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
        .order('date', { ascending: true }),
    ]);

    const player = playerRes.data as { full_name?: string; position?: string; team?: string; injury_status?: string | null } | null;
    const score = scoreRes.data as
      | { tfo_score: number | null; verdict: string | null; rank_delta: number | null; mrs_adjustment: number | null; confidence_tier: string | null; sospp_score: number | null }
      | null;
    const ktc = ktcRes.data as { ktc_value: number | null; ktc_rank: number | null; position_rank: number | null } | null;
    const sospp = sosppRes.data as { sospp_score: number | null; sospp_outlook: string | null; sospp_summary: string | null; warning: string | null } | null;

    // ── BOB Value (formula_scores) ──────────────────────────────────────────
    const bobValue =
      score && typeof score.tfo_score === 'number'
        ? { tfoScore: score.tfo_score, verdict: score.verdict ?? null, grade: gradeFromTfo(score.tfo_score), confidenceTier: score.confidence_tier ?? null }
        : null;
    if (!bobValue) pending.push('bobValue');

    // ── Market Value (ktc_market_values) ────────────────────────────────────
    const marketValue =
      ktc && typeof ktc.ktc_value === 'number'
        ? { ktcValue: ktc.ktc_value, ktcRank: ktc.ktc_rank ?? null, positionRank: ktc.position_rank ?? null }
        : null;
    if (!marketValue) pending.push('marketValue');

    // ── Value Delta (derived: BOB rank vs market rank) ──────────────────────
    const rankDelta = score?.rank_delta;
    const valueDelta =
      typeof rankDelta === 'number' && rankDelta !== 0
        ? { rankDelta, direction: rankDelta < 0 ? 'BOB higher' : 'Market higher' }
        : bobValue && marketValue
          ? { rankDelta: 0, direction: 'Aligned' }
          : null;
    if (!valueDelta) pending.push('valueDelta');

    // ── Opportunity Score (derived from rank_delta magnitude, 0–100) ─────────
    const opportunityScore =
      typeof rankDelta === 'number' ? Math.min(100, Math.round(Math.abs(rankDelta) / 1.5)) : null;
    if (opportunityScore == null) pending.push('opportunityScore');

    // ── Schedule / SOSPP ────────────────────────────────────────────────────
    const schedule =
      sospp && typeof sospp.sospp_score === 'number'
        ? { sosppScore: sospp.sospp_score, outlook: sospp.sospp_outlook ?? null, summary: sospp.sospp_summary ?? null, warning: sospp.warning ?? null }
        : score && typeof score.sospp_score === 'number'
          ? { sosppScore: score.sospp_score, outlook: null, summary: null, warning: null }
          : null;
    if (!schedule) pending.push('schedule');

    // ── Injury Risk (formula_scores MRS adjustment + current status) ─────────
    const injuryRisk =
      (score && typeof score.mrs_adjustment === 'number') || (player?.injury_status && player.injury_status !== 'Healthy')
        ? { mrsAdjustment: typeof score?.mrs_adjustment === 'number' ? score.mrs_adjustment : null, status: player?.injury_status ?? null }
        : null;
    if (!injuryRisk) pending.push('injuryRisk');

    // ── EMPTY sources → pending (never fabricated) ──────────────────────────
    const breakoutScore = breakoutRes.data ? (breakoutRes.data as { match_score?: number }).match_score ?? null : null;
    if (breakoutScore == null) pending.push('breakoutScore');

    const regimeOutlook = regimeRes.data
      ? {
          changeType: (regimeRes.data as { change_type?: string }).change_type ?? null,
          description: (regimeRes.data as { change_description?: string }).change_description ?? null,
          direction: (regimeRes.data as { estimated_impact_direction?: string }).estimated_impact_direction ?? null,
        }
      : null;
    if (!regimeOutlook) pending.push('regimeOutlook');

    const sellWindow = sellRes.data
      ? {
          alertType: (sellRes.data as { alert_type?: string }).alert_type ?? null,
          urgency: (sellRes.data as { urgency?: string }).urgency ?? null,
          reason: (sellRes.data as { reason?: string }).reason ?? null,
        }
      : null;
    if (!sellWindow) pending.push('sellWindow');

    // ── 30-day BOB-vs-KTC trend ─────────────────────────────────────────────
    const historyRows = (historyRes.data ?? []) as { date: string; tfo_score: number | null; ktc_value: number | null }[];
    const valueTrend = historyRows.map((r) => ({
      date: r.date,
      bobScore: typeof r.tfo_score === 'number' ? r.tfo_score : null,
      ktcValue: typeof r.ktc_value === 'number' ? r.ktc_value : null,
    }));
    if (valueTrend.length === 0) pending.push('valueTrend');

    return NextResponse.json({
      playerId,
      name: player?.full_name ?? null,
      position: player?.position ?? null,
      team: player?.team ?? null,
      bobValue,
      marketValue,
      valueDelta,
      breakoutScore,
      opportunityScore,
      schedule,
      regimeOutlook,
      sellWindow,
      injuryRisk,
      valueTrend,
      // Section keys whose source is empty/missing — the frontend should hide these.
      pending,
    });
  } catch (e) {
    return NextResponse.json({
      playerId,
      name: null,
      position: null,
      team: null,
      bobValue: null,
      marketValue: null,
      valueDelta: null,
      breakoutScore: null,
      opportunityScore: null,
      schedule: null,
      regimeOutlook: null,
      sellWindow: null,
      injuryRisk: null,
      valueTrend: [],
      pending: [
        'bobValue', 'marketValue', 'valueDelta', 'opportunityScore', 'schedule',
        'injuryRisk', 'breakoutScore', 'regimeOutlook', 'sellWindow', 'valueTrend',
      ],
      note: e instanceof Error ? e.message : 'error',
    });
  }
}
