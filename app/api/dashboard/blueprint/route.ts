import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Public types ─────────────────────────────────────────────────────────────

export type TeamGrade =
  | 'DYNASTY ELITE'
  | 'CONTENDER'
  | 'TRANSITIONING'
  | 'REBUILDING'
  | 'RELOAD';

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface RosterRisk {
  player_id: string;
  name: string;
  position: string;
  risk_type: 'AGE_CLIFF' | 'INJURY_HISTORY' | 'SCHEME_INSTABILITY' | 'DECLINING_TFO';
  risk_label: string;
  severity: RiskSeverity;
  age: number | null;
  mrs_score: number | null;
}

export interface RosterStrength {
  player_id: string;
  name: string;
  position: string;
  team: string;
  why: string;
  tfo_grade: string | null;
  tfo_score: number | null;
}

export interface YearOutlook {
  year: number;
  strength_score: number;
  key_risks: string[];
  key_strengths: string[];
  verdict: string;
}

export interface Recommendation {
  action: 'SELL' | 'TARGET' | 'HOLD' | 'EXTEND';
  player_name?: string;
  position?: string;
  reasoning: string;
  link_type: 'trade_finder' | 'waiver';
  link_query?: string;
}

export interface TradeTarget {
  player_id: string;
  name: string;
  position: string;
  team: string;
  tfo_score: number | null;
  tfo_grade: string | null;
  bvi_delta: number | null;
  why: string;
}

export interface BlueprintData {
  leagueId: string;
  leagueName: string;
  teamName: string | null;
  managerTitle: string | null;
  teamGrade: TeamGrade;
  contentionWindow: { start: number; end: number; label: string };
  yearOutlook: YearOutlook[];
  risks: RosterRisk[];
  strengths: RosterStrength[];
  recommendations: Recommendation[];
  tradeTargets: TradeTarget[];
  avgTFO: number | null;
  avgAge: number | null;
  scoringType: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const CURRENT_YEAR = new Date().getFullYear();

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function toTFOPos(pos: string): TFOPosition {
  const p = pos.toUpperCase() as TFOPosition;
  return SKILL_POSITIONS.has(p) ? p : 'WR';
}

function tfoGrade(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

function strengthScoreForYear(
  baseTFO: number,
  avgAge: number,
  yearsFromNow: number,
  ktcTrend: 'RISING' | 'STABLE' | 'FALLING',
): number {
  // Age drift: most positions decay ~1-2 pts TFO per year past peak
  const ageDrift = avgAge >= 28 ? -3 * yearsFromNow : avgAge >= 25 ? -1.5 * yearsFromNow : 1 * yearsFromNow;
  const trendMod = ktcTrend === 'RISING' ? 2 : ktcTrend === 'FALLING' ? -3 : 0;
  return clamp(Math.round(baseTFO + ageDrift + trendMod * (yearsFromNow + 1)));
}

function deriveTeamGrade(
  avgTFO: number | null,
  status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING',
  avgAge: number,
): TeamGrade {
  if (avgTFO == null) return 'TRANSITIONING';
  if (avgTFO >= 78 && status === 'CONTENDING') return 'DYNASTY ELITE';
  if (avgTFO >= 65 && status === 'CONTENDING') return 'CONTENDER';
  if (status === 'REBUILDING' && avgAge <= 25) return 'RELOAD';
  if (status === 'REBUILDING') return 'REBUILDING';
  return 'TRANSITIONING';
}

function computeContentionWindow(avgAge: number, ktcTrend: 'RISING' | 'STABLE' | 'FALLING'): {
  start: number;
  end: number;
  label: string;
  status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING';
} {
  let yearsToBase: number;
  if (avgAge < 23) yearsToBase = 4;
  else if (avgAge < 25) yearsToBase = 3;
  else if (avgAge < 27) yearsToBase = 1;
  else if (avgAge < 29) yearsToBase = 0;
  else yearsToBase = -1;

  if (ktcTrend === 'RISING') yearsToBase = Math.max(-1, yearsToBase - 1);
  if (ktcTrend === 'FALLING') yearsToBase = Math.min(5, yearsToBase + 1);

  const start = CURRENT_YEAR + Math.max(0, yearsToBase);
  const end = start + (avgAge >= 28 ? 1 : avgAge >= 25 ? 2 : 3);
  const label = `Peak Window: ${start}–${end}`;

  const status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING' =
    start <= CURRENT_YEAR && end >= CURRENT_YEAR
      ? 'CONTENDING'
      : start > CURRENT_YEAR + 1
        ? 'REBUILDING'
        : 'TRANSITIONING';

  return { start, end, label, status };
}

// ─── Claude AI verdict generation ─────────────────────────────────────────────

interface AIInsightInput {
  teamGrade: TeamGrade;
  avgTFO: number;
  avgAge: number;
  status: string;
  contentionLabel: string;
  topStrengths: string[];
  topRisks: string[];
  managerTitle: string | null;
  scoringType: string;
}

interface AIInsights {
  year1Verdict: string;
  year2Verdict: string;
  year3Verdict: string;
  year1Strengths: string[];
  year1Risks: string[];
  year2Strengths: string[];
  year2Risks: string[];
  year3Strengths: string[];
  year3Risks: string[];
}

async function generateAIInsights(input: AIInsightInput): Promise<AIInsights> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const prompt = `You are a dynasty fantasy football analyst. Provide a 3-year outlook for this team.

Team Data:
- Grade: ${input.teamGrade}
- Contention Window: ${input.contentionLabel}
- Avg TFO Score: ${input.avgTFO}
- Avg Roster Age: ${input.avgAge}
- Status: ${input.status}
- Manager Profile: ${input.managerTitle ?? 'Unknown'}
- Scoring: ${input.scoringType.toUpperCase()}
- Top Strengths: ${input.topStrengths.join(', ')}
- Top Risks: ${input.topRisks.join(', ')}

Respond with ONLY valid JSON matching exactly this shape:
{
  "year1Verdict": "1-2 sentence confident verdict in present tense",
  "year2Verdict": "1-2 sentence confident verdict",
  "year3Verdict": "1-2 sentence confident verdict",
  "year1Strengths": ["brief strength 1", "brief strength 2"],
  "year1Risks": ["brief risk 1"],
  "year2Strengths": ["brief strength"],
  "year2Risks": ["brief risk 1", "brief risk 2"],
  "year3Strengths": ["brief strength"],
  "year3Risks": ["brief risk"]
}

Rules:
- Sound like a confident insider, not a robot
- Reference specific traits (age curve, scoring type, TFO trend)
- Never say "it remains to be seen" or generic phrases
- Year verdicts should track the contention arc (rising/plateauing/declining)
- Max 20 words per item in arrays`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]) as AIInsights;
  } catch {
    // Deterministic fallback — never break the page
    return {
      year1Verdict:
        `${input.status === 'CONTENDING' ? 'Push now' : 'Build the foundation'} — avg TFO ${input.avgTFO} with ${input.avgAge < 26 ? 'a young, ascending core' : 'prime-age contributors'}.`,
      year2Verdict:
        input.avgAge >= 29
          ? 'Aging curve accelerates — window narrows, asset movement is critical before value erodes.'
          : `${input.avgTFO >= 70 ? 'Peak production window' : 'Development cycle matures'} — target the missing piece that flips contention.`,
      year3Verdict:
        input.avgAge >= 30
          ? 'Reload mode likely — proactive sell-high on aging vets preserves long-term leverage.'
          : 'The core still has legs — dynasty upside intact if youth assets translate.',
      year1Strengths: input.topStrengths.slice(0, 2),
      year1Risks: input.topRisks.slice(0, 1),
      year2Strengths: ['Value trajectory holds if starters stay healthy'],
      year2Risks: input.topRisks.slice(0, 2),
      year3Strengths: ['Dynasty capital still deployable'],
      year3Risks: ['Age curve compression accelerates at peak'],
    };
  }
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const leagueIdParam = url.searchParams.get('league_id');

  const supabase = createAdminClient();

  // Fetch user leagues + profile
  const [leaguesResult, profileResult] = await Promise.all([
    supabase.from('leagues').select('league_id, name, season, wins, losses, ties, team_name, scoring_type').eq('user_id', user.id),
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
  ]);

  const leagues = leaguesResult.data ?? [];
  if (!leagues.length) {
    return NextResponse.json({ error: 'No leagues found' }, { status: 404 });
  }

  const sleeperUserId = profileResult.data?.sleeper_user_id ?? null;

  // Determine active league
  const activeLeague = leagueIdParam
    ? (leagues.find((l) => l.league_id === leagueIdParam) ?? leagues[0]!)
    : leagues[0]!;

  const leagueId = activeLeague.league_id as string;
  const scoringType = (activeLeague.scoring_type as string | null) ?? 'ppr';

  // Parallel fetches
  const [playerDbRaw, tfoRows, pvRows, mrsRows, dmpRow, rosterResult] = await Promise.all([
    fetchAllPlayers(),
    supabase
      .from('tfo_cache')
      .select('player_id, tfo_score, grade, verdict, ops_score, sfs_score, ffig_score, sit_score, irs_score, tfo_trend, calculated_at')
      .eq('league_id', leagueId)
      .order('calculated_at', { ascending: false }),
    supabase
      .from('player_values')
      .select('player_id, bvi_score, ktc_value, delta, trend, signal, scoring_type')
      .eq('scoring_type', scoringType),
    supabase
      .from('medical_history')
      .select('player_id, injury_type, recurrence_count, risk_flag')
      .not('risk_flag', 'is', null),
    supabase
      .from('dmp_profiles')
      .select('title')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .maybeSingle(),
    supabase
      .from('rosters')
      .select('owner_id, player_ids')
      .eq('league_id', leagueId),
  ]);

  const playerDb = playerDbRaw ?? {};

  // Identify user's roster
  const myOwnerId = sleeperUserId;
  const rosterRows = rosterResult.data ?? [];
  let myPlayerIds: string[] = [];
  for (const row of rosterRows) {
    if (row.owner_id === myOwnerId) {
      myPlayerIds = (row.player_ids as string[] | null) ?? [];
      break;
    }
  }

  // Build TFO lookup (most recent per player)
  const tfoMap = new Map<string, typeof tfoRows.data extends (infer T)[] | null ? T : never>();
  for (const row of tfoRows.data ?? []) {
    if (!tfoMap.has(row.player_id)) tfoMap.set(row.player_id, row);
  }

  // BVI lookup
  const pvMap = new Map<string, { bvi_score: number; ktc_value: number; delta: number; trend: string; signal: string }>();
  for (const row of pvRows.data ?? []) {
    pvMap.set(row.player_id, row as { bvi_score: number; ktc_value: number; delta: number; trend: string; signal: string });
  }

  // MRS lookup
  const mrsMap = new Map<string, number>();
  for (const row of mrsRows.data ?? []) {
    const pid = row.player_id as string;
    // Estimate MRS score from flags — base 15% + risk weights
    const recurrence = (row.recurrence_count as number | null) ?? 0;
    let score = 15;
    const injType = ((row.injury_type as string | null) ?? '').toLowerCase();
    if (injType.includes('acl') || injType.includes('mcl')) score += 20;
    else if (injType.includes('hamstring') && recurrence >= 2) score += 18;
    else if (injType.includes('hamstring')) score += 8;
    else if (injType.includes('concussion') && recurrence >= 2) score += 25;
    else if (injType.includes('concussion')) score += 10;
    else if (injType.includes('shoulder')) score += 15;
    else if (injType.includes('back') || injType.includes('ankle')) score += 12;
    mrsMap.set(pid, Math.min(95, score));
  }

  // ─── Build roster player list ─────────────────────────────────────────────

  interface BlueprintPlayer {
    player_id: string;
    name: string;
    position: string;
    team: string;
    age: number | null;
    tfoScore: number | null;
    tfoGrade: string | null;
    verdict: string | null;
    sfsScore: number | null;
    opsScore: number | null;
    irsScore: number | null;
    bviDelta: number | null;
    bviScore: number | null;
    ktcValue: number;
    mrsScore: number | null;
    trend: string | null;
  }

  const myPlayers: BlueprintPlayer[] = [];
  for (const pid of myPlayerIds) {
    const p = (playerDb as Record<string, { full_name?: string; position?: string; team?: string; age?: number }>)[pid];
    if (!p) continue;
    const pos = (p.position ?? 'WR').toUpperCase();
    if (!SKILL_POSITIONS.has(pos)) continue;

    const tfo = tfoMap.get(pid);
    const pv = pvMap.get(pid);
    const age = p.age ?? null;

    myPlayers.push({
      player_id: pid,
      name: p.full_name ?? pid,
      position: pos,
      team: p.team ?? 'FA',
      age,
      tfoScore: tfo?.tfo_score ?? null,
      tfoGrade: tfoGrade(tfo?.tfo_score ?? null),
      verdict: tfo?.verdict ?? null,
      sfsScore: tfo?.sfs_score ?? null,
      opsScore: tfo?.ops_score ?? null,
      irsScore: tfo?.irs_score ?? null,
      bviDelta: pv?.delta ?? null,
      bviScore: pv?.bvi_score ?? null,
      ktcValue: pv?.ktc_value ?? 0,
      mrsScore: mrsMap.get(pid) ?? null,
      trend: pv?.trend ?? tfo?.tfo_trend ?? null,
    });
  }

  // Averages
  const skillPlayers = myPlayers.filter((p) => SKILL_POSITIONS.has(p.position));
  const withAge = skillPlayers.filter((p) => p.age != null);
  const avgAge = withAge.length ? withAge.reduce((s, p) => s + p.age!, 0) / withAge.length : 26;
  const withTFO = skillPlayers.filter((p) => p.tfoScore != null);
  const avgTFO = withTFO.length ? withTFO.reduce((s, p) => s + p.tfoScore!, 0) / withTFO.length : null;
  const withDelta = skillPlayers.filter((p) => p.bviDelta != null);
  const avgDelta = withDelta.length ? withDelta.reduce((s, p) => s + p.bviDelta!, 0) / withDelta.length : 0;
  const ktcTrend: 'RISING' | 'STABLE' | 'FALLING' =
    avgDelta > 300 ? 'RISING' : avgDelta < -300 ? 'FALLING' : 'STABLE';

  const cw = computeContentionWindow(avgAge, ktcTrend);
  const teamGrade = deriveTeamGrade(avgTFO, cw.status, avgAge);

  // ─── Risks (top 3) ───────────────────────────────────────────────────────

  const risks: RosterRisk[] = [];

  // Age cliff — players 30+ at skill positions
  const ageRisk = skillPlayers
    .filter((p) => p.age != null && p.age >= 29)
    .sort((a, b) => b.ktcValue - a.ktcValue);

  for (const p of ageRisk.slice(0, 2)) {
    const ageMult = ageCurveMultiplier(toTFOPos(p.position), p.age!);
    risks.push({
      player_id: p.player_id,
      name: p.name,
      position: p.position,
      risk_type: 'AGE_CLIFF',
      risk_label: `Age ${p.age} — curve multiplier ${(ageMult * 100).toFixed(0)}%`,
      severity: p.age! >= 32 ? 'CRITICAL' : p.age! >= 30 ? 'HIGH' : 'MEDIUM',
      age: p.age,
      mrs_score: p.mrsScore,
    });
  }

  // Injury history — MRS >= 40
  const injRisk = skillPlayers
    .filter((p) => p.mrsScore != null && p.mrsScore >= 35)
    .sort((a, b) => (b.mrsScore ?? 0) - (a.mrsScore ?? 0));

  for (const p of injRisk.slice(0, 1)) {
    if (risks.find((r) => r.player_id === p.player_id)) continue;
    risks.push({
      player_id: p.player_id,
      name: p.name,
      position: p.position,
      risk_type: 'INJURY_HISTORY',
      risk_label: `MRS ${p.mrsScore}% — elevated medical risk flag`,
      severity: (p.mrsScore ?? 0) >= 60 ? 'CRITICAL' : (p.mrsScore ?? 0) >= 40 ? 'HIGH' : 'MEDIUM',
      age: p.age,
      mrs_score: p.mrsScore,
    });
  }

  // Scheme instability — low SFS score
  const schemeRisk = skillPlayers
    .filter((p) => p.sfsScore != null && p.sfsScore < 40)
    .sort((a, b) => (a.sfsScore ?? 0) - (b.sfsScore ?? 0));

  for (const p of schemeRisk.slice(0, 1)) {
    if (risks.find((r) => r.player_id === p.player_id)) continue;
    risks.push({
      player_id: p.player_id,
      name: p.name,
      position: p.position,
      risk_type: 'SCHEME_INSTABILITY',
      risk_label: `SFS ${p.sfsScore?.toFixed(0)} — scheme fit concern`,
      severity: (p.sfsScore ?? 50) < 25 ? 'HIGH' : 'MEDIUM',
      age: p.age,
      mrs_score: p.mrsScore,
    });
  }

  // Declining TFO — fill up to 3 risks
  if (risks.length < 3) {
    const decliningRisk = skillPlayers
      .filter((p) => p.trend === 'FALLING' || p.trend === 'falling')
      .filter((p) => !risks.find((r) => r.player_id === p.player_id))
      .sort((a, b) => b.ktcValue - a.ktcValue);

    for (const p of decliningRisk) {
      if (risks.length >= 3) break;
      risks.push({
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        risk_type: 'DECLINING_TFO',
        risk_label: `TFO trend falling — sell window open`,
        severity: 'MEDIUM',
        age: p.age,
        mrs_score: p.mrsScore,
      });
    }
  }

  // ─── Strengths (top 3) ───────────────────────────────────────────────────

  const strengthCandidates = skillPlayers
    .filter((p) => p.tfoScore != null && p.tfoScore >= 65)
    .sort((a, b) => (b.tfoScore ?? 0) - (a.tfoScore ?? 0));

  const strengthReasons: Record<string, string> = {
    ELITE: 'elite TFO output with scheme stability',
    'HIGH VALUE': 'high-value contributor with rising trajectory',
    VIABLE: 'solid starter with positive BVI delta',
  };

  const strengths: RosterStrength[] = strengthCandidates.slice(0, 3).map((p) => ({
    player_id: p.player_id,
    name: p.name,
    position: p.position,
    team: p.team,
    why:
      p.bviDelta != null && p.bviDelta > 500
        ? `BVI ${p.bviScore?.toFixed(0)} vs KTC — undervalued asset, buy-window open`
        : (strengthReasons[p.tfoGrade ?? ''] ?? 'top TFO contributor on roster'),
    tfo_grade: p.tfoGrade,
    tfo_score: p.tfoScore,
  }));

  // ─── Recommendations ─────────────────────────────────────────────────────

  const recommendations: Recommendation[] = [];

  // Sell aging high-KTC assets
  const sellCandidates = skillPlayers
    .filter((p) => p.age != null && p.age >= 29 && p.ktcValue >= 3000)
    .sort((a, b) => b.ktcValue - a.ktcValue);

  if (sellCandidates[0]) {
    const p = sellCandidates[0];
    recommendations.push({
      action: 'SELL',
      player_name: p.name,
      reasoning: `${p.name} — peak value now, age cliff accelerates year ${CURRENT_YEAR + 1}`,
      link_type: 'trade_finder',
      link_query: `player=${encodeURIComponent(p.name)}`,
    });
  }

  // Target gap positions
  const posCounts: Record<string, number> = {};
  for (const p of skillPlayers) {
    posCounts[p.position] = (posCounts[p.position] ?? 0) + 1;
  }
  const allPos = ['QB', 'RB', 'WR', 'TE'];
  const gapPos = allPos.find((pos) => (posCounts[pos] ?? 0) < 2);
  if (gapPos) {
    recommendations.push({
      action: 'TARGET',
      position: gapPos,
      reasoning: `${gapPos} depth is thin — critical gap for contention window`,
      link_type: 'waiver',
    });
  }

  // Hold undervalued young assets
  const holdCandidates = skillPlayers
    .filter((p) => p.bviDelta != null && p.bviDelta > 600 && (p.age ?? 30) < 27)
    .sort((a, b) => (b.bviDelta ?? 0) - (a.bviDelta ?? 0));

  if (holdCandidates[0] && recommendations.length < 3) {
    const p = holdCandidates[0];
    recommendations.push({
      action: 'HOLD',
      player_name: p.name,
      reasoning: `${p.name} — BVI delta +${p.bviDelta?.toFixed(0)} signals peak value hasn't arrived yet`,
      link_type: 'trade_finder',
      link_query: `player=${encodeURIComponent(p.name)}`,
    });
  }

  // Fill to 3
  if (recommendations.length < 3) {
    recommendations.push({
      action: 'TARGET',
      position: 'WR',
      reasoning: `WR depth across the league is scarce — target undervalued assets now before the market moves`,
      link_type: 'waiver',
    });
  }

  // ─── Trade Targets (top 3 players available in league) ───────────────────

  // Players NOT on user's roster but in tfo_cache for this league
  const myPidSet = new Set(myPlayerIds);

  // Build all owner roster pids
  const allOtherPids: string[] = [];
  for (const row of rosterRows) {
    if (row.owner_id === myOwnerId) continue;
    const pids = (row.player_ids as string[] | null) ?? [];
    for (const pid of pids) allOtherPids.push(pid);
  }

  const tradeTargets: TradeTarget[] = allOtherPids
    .filter((pid) => {
      if (myPidSet.has(pid)) return false;
      const tfo = tfoMap.get(pid);
      if (!tfo || tfo.tfo_score == null) return false;
      const pv = pvMap.get(pid);
      // Target: gap position + BVI undervalued or high TFO
      const p = (playerDb as Record<string, { position?: string }>)[pid];
      if (!p) return false;
      const pos = (p.position ?? '').toUpperCase();
      if (!SKILL_POSITIONS.has(pos)) return false;
      const isGapPos = gapPos === pos;
      const isUndervalued = pv != null && pv.delta > 400;
      return isGapPos || isUndervalued || tfo.tfo_score >= 75;
    })
    .sort((a, b) => {
      const tA = tfoMap.get(a)?.tfo_score ?? 0;
      const tB = tfoMap.get(b)?.tfo_score ?? 0;
      return tB - tA;
    })
    .slice(0, 3)
    .map((pid) => {
      const p = (playerDb as Record<string, { full_name?: string; position?: string; team?: string }>)[pid];
      const tfo = tfoMap.get(pid)!;
      const pv = pvMap.get(pid);
      const isGap = gapPos === (p?.position ?? '').toUpperCase();
      const isUnder = pv != null && pv.delta > 400;
      const why = isGap
        ? `Fills your ${gapPos} gap — TFO ${tfo.tfo_score?.toFixed(0)}, strong fit for contention window`
        : isUnder
          ? `BVI delta +${pv!.delta.toFixed(0)} — market undervaluing this asset`
          : `Elite TFO ${tfo.tfo_score?.toFixed(0)} output makes this a priority target`;

      return {
        player_id: pid,
        name: p?.full_name ?? pid,
        position: (p?.position ?? 'WR').toUpperCase(),
        team: p?.team ?? 'FA',
        tfo_score: tfo.tfo_score,
        tfo_grade: tfoGrade(tfo.tfo_score),
        bvi_delta: pv?.delta ?? null,
        why,
      };
    });

  // ─── Year outlook (AI-augmented) ─────────────────────────────────────────

  const baseTFO = avgTFO ?? 60;
  const topStrengthNames = strengths.map((s) => `${s.name} (${s.position}, ${s.tfo_grade})`);
  const topRiskDescs = risks.map((r) => r.risk_label);

  const aiInsights = await generateAIInsights({
    teamGrade,
    avgTFO: Math.round(baseTFO),
    avgAge: Math.round(avgAge * 10) / 10,
    status: cw.status,
    contentionLabel: cw.label,
    topStrengths: topStrengthNames,
    topRisks: topRiskDescs,
    managerTitle: dmpRow.data?.title ?? null,
    scoringType,
  });

  const yearOutlook: YearOutlook[] = [1, 2, 3].map((offset) => {
    const year = CURRENT_YEAR + offset - 1;
    const score = strengthScoreForYear(baseTFO, avgAge, offset - 1, ktcTrend);
    return {
      year,
      strength_score: score,
      key_risks: offset === 1 ? aiInsights.year1Risks : offset === 2 ? aiInsights.year2Risks : aiInsights.year3Risks,
      key_strengths: offset === 1 ? aiInsights.year1Strengths : offset === 2 ? aiInsights.year2Strengths : aiInsights.year3Strengths,
      verdict: offset === 1 ? aiInsights.year1Verdict : offset === 2 ? aiInsights.year2Verdict : aiInsights.year3Verdict,
    };
  });

  // ─── Response ─────────────────────────────────────────────────────────────

  const payload: BlueprintData = {
    leagueId,
    leagueName: activeLeague.name as string,
    teamName: (activeLeague.team_name as string | null) ?? null,
    managerTitle: dmpRow.data?.title ?? null,
    teamGrade,
    contentionWindow: { start: cw.start, end: cw.end, label: cw.label },
    yearOutlook,
    risks: risks.slice(0, 3),
    strengths,
    recommendations: recommendations.slice(0, 3),
    tradeTargets,
    avgTFO: avgTFO != null ? Math.round(avgTFO) : null,
    avgAge: Math.round(avgAge * 10) / 10,
    scoringType,
  };

  return NextResponse.json(payload);
}
