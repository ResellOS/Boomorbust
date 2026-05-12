/**
 * MRS (Medical Risk Score) engine — expanded model.
 *
 * Base: 15%. Cap: 95%.
 * Each injury type contributes an additive risk percentage, modified by
 * position multipliers and an age × injury compound multiplier.
 *
 * Risk tiers: GREEN < 20% | YELLOW 20-35% | RED > 35%
 */

import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MRSRiskTier = 'GREEN' | 'YELLOW' | 'RED';
export type MRSBadgeColor = '#22c55e' | '#FBBF24' | '#EF4444';

export interface MRSResult {
  player_id: string;
  mrs_score: number;
  risk_tier: MRSRiskTier;
  flags: string[];
  badge_color: MRSBadgeColor;
  display_label: string;
}

export interface MRSBadge {
  color: MRSBadgeColor;
  label: string;
  score: number;
}

// ─── Injury base risk additions (percentage points) ───────────────────────────

const INJURY_BASE_RISK: Record<string, number> = {
  hamstring_recurring: 18,
  hamstring_single: 8,
  concussion_multiple: 25,
  concussion_single: 10,
  acl_year1: 20,
  acl_year2: 10,
  acl_year3plus: 5,
  mcl_year1: 20,
  mcl_year2: 10,
  mcl_year3plus: 5,
  high_ankle_recurring: 15,
  high_ankle_single: 7,
  foot_ankle_chronic: 12,
  turf_toe: 8,
  shoulder_qb: 15,
  back_chronic: 20,
};

// ─── Position multipliers per injury type ─────────────────────────────────────

function positionMultiplier(injuryKey: string, position: string): number {
  const pos = position.toUpperCase();

  if (injuryKey.startsWith('hamstring')) {
    if (pos === 'WR') return 1.4;   // speed-dependent route running
    if (pos === 'RB') return 1.2;   // explosion moves
    if (pos === 'QB') return 0.8;   // less dependent on pure speed
    if (pos === 'TE') return 1.1;
    return 1.0;
  }

  // Turf toe: primarily affects WR/RB cut-moves
  if (injuryKey === 'turf_toe') {
    if (pos === 'WR' || pos === 'RB') return 1.0;
    return 0.5;
  }

  // Shoulder: QB-specific weighting
  if (injuryKey === 'shoulder_qb') {
    if (pos === 'QB') return 1.0;
    return 0.4;
  }

  // Foot/ankle: route runners hit harder
  if (injuryKey === 'foot_ankle_chronic') {
    if (pos === 'WR' || pos === 'TE') return 1.3;
    return 1.0;
  }

  return 1.0;
}

// ─── Age × injury compound multiplier ────────────────────────────────────────

function ageMultiplier(age: number): number {
  if (age <= 24) return 1.0;
  if (age <= 26) return 1.1;
  if (age <= 28) return 1.2;
  if (age <= 30) return 1.5;
  return 2.0;  // 31+
}

// ─── Injury record → classification key ───────────────────────────────────────

function classifyInjury(
  injuryType: string,
  recurrenceCount: number,
  season: number,
  currentSeason: number,
): string {
  const t = injuryType.toLowerCase().replace(/[-\s]+/g, '_');
  const yearsAgo = currentSeason - season;

  if (t.includes('hamstring')) {
    return recurrenceCount >= 2 ? 'hamstring_recurring' : 'hamstring_single';
  }
  if (t.includes('concussion') || t.includes('tbi') || t.includes('head')) {
    return recurrenceCount >= 2 ? 'concussion_multiple' : 'concussion_single';
  }
  if (t.includes('acl') || t.includes('anterior_cruciate') || t.includes('anterior cruciate')) {
    if (yearsAgo <= 1) return 'acl_year1';
    if (yearsAgo <= 2) return 'acl_year2';
    return 'acl_year3plus';
  }
  if (t.includes('mcl') || t.includes('medial_collateral') || t.includes('medial collateral')) {
    if (yearsAgo <= 1) return 'mcl_year1';
    if (yearsAgo <= 2) return 'mcl_year2';
    return 'mcl_year3plus';
  }
  if (t.includes('high_ankle') || (t.includes('high') && t.includes('ankle'))) {
    return recurrenceCount >= 2 ? 'high_ankle_recurring' : 'high_ankle_single';
  }
  if (t.includes('turf_toe') || (t.includes('turf') && t.includes('toe'))) {
    return 'turf_toe';
  }
  if (t.includes('foot') || (t.includes('ankle') && !t.includes('high'))) {
    return 'foot_ankle_chronic';
  }
  if (t.includes('shoulder') || t.includes('rotator') || t.includes('labrum')) {
    return 'shoulder_qb';
  }
  if (t.includes('back') || t.includes('lumbar') || t.includes('spine') || t.includes('disk')) {
    return 'back_chronic';
  }
  return '';
}

// ─── Flag generator ────────────────────────────────────────────────────────────

function generateFlags(
  injuryKey: string,
  recurrenceCount: number,
  gamesMissed: number,
  severity: string | null,
): string[] {
  const flags: string[] = [];

  if (injuryKey === 'concussion_multiple') flags.push('MULTI_CONCUSSION_WARNING');
  if (injuryKey === 'hamstring_recurring') flags.push('RECURRING_HAMSTRING');
  if (injuryKey === 'acl_year1') flags.push('ACL_YEAR1_RETURN');
  if (injuryKey === 'acl_year2') flags.push('ACL_YEAR2');
  if (injuryKey === 'back_chronic' && recurrenceCount >= 2) flags.push('CHRONIC_BACK');
  if (injuryKey === 'high_ankle_recurring') flags.push('CHRONIC_HIGH_ANKLE');
  if (gamesMissed >= 8) flags.push('MISSED_HALF_SEASON');
  if (severity === 'season_ending') flags.push('PRIOR_SEASON_ENDING');

  return flags;
}

// ─── Result builder ────────────────────────────────────────────────────────────

function buildResult(playerId: string, rawScore: number, flags: string[]): MRSResult {
  const mrs_score = Math.round(Math.min(95, Math.max(0, rawScore)) * 10) / 10;
  const risk_tier: MRSRiskTier = mrs_score < 20 ? 'GREEN' : mrs_score < 35 ? 'YELLOW' : 'RED';

  const badge_color: MRSBadgeColor =
    risk_tier === 'GREEN' ? '#22c55e' : risk_tier === 'YELLOW' ? '#FBBF24' : '#EF4444';

  const display_label =
    risk_tier === 'GREEN' ? 'LOW RISK' : risk_tier === 'YELLOW' ? 'MONITOR' : 'HIGH RISK';

  return {
    player_id: playerId,
    mrs_score,
    risk_tier,
    flags: Array.from(new Set(flags)),
    badge_color,
    display_label,
  };
}

// ─── calculateMRS ─────────────────────────────────────────────────────────────

export async function calculateMRS(
  playerId: string,
  playerPosition?: string,
  playerAge?: number,
): Promise<MRSResult> {
  const supabase = createAdminClient();
  const currentSeason = new Date().getFullYear();

  // Resolve player meta
  let position = playerPosition ?? '';
  let age = playerAge ?? 26;

  if (!position || !playerAge) {
    const { data: bbv } = await supabase
      .from('bbv_values')
      .select('position, age')
      .eq('player_id', playerId)
      .maybeSingle();

    if (bbv) {
      if (!position && bbv.position) position = bbv.position as string;
      if (!playerAge && bbv.age) age = bbv.age as number;
    }
  }

  if (!position) position = 'WR';

  // Pull injury history
  const { data: injuries } = await supabase
    .from('medical_history')
    .select('injury_type, season, games_missed, recurrence_count, severity')
    .eq('player_id', playerId);

  if (!injuries || injuries.length === 0) {
    return buildResult(playerId, 15, []);
  }

  const ageMult = ageMultiplier(age);
  const allFlags: string[] = [];
  let totalRisk = 15; // base

  for (const inj of injuries as Array<{
    injury_type: string;
    season: number;
    games_missed: number;
    recurrence_count: number;
    severity: string | null;
  }>) {
    const key = classifyInjury(
      inj.injury_type,
      inj.recurrence_count,
      inj.season,
      currentSeason,
    );
    if (!key) continue;

    const baseRisk = INJURY_BASE_RISK[key] ?? 0;
    const posMult = positionMultiplier(key, position);
    totalRisk += baseRisk * posMult * ageMult;

    const flags = generateFlags(key, inj.recurrence_count, inj.games_missed, inj.severity);
    allFlags.push(...flags);
  }

  // Clean history bonus: no injuries in the last 5 seasons
  const recentInjuries = (injuries as Array<{ season: number }>).filter(
    i => currentSeason - i.season <= 5,
  );
  if (recentInjuries.length === 0) totalRisk -= 5;

  return buildResult(playerId, totalRisk, allFlags);
}

// ─── getMRSBadge ──────────────────────────────────────────────────────────────

export function getMRSBadge(result: MRSResult): MRSBadge {
  return {
    color: result.badge_color,
    label: result.display_label,
    score: result.mrs_score,
  };
}
