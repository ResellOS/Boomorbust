/**
 * MRS (Medical Risk Score) engine — expanded model.
 * Replaces the basic IRS. Combines injury-type risk weights,
 * position-specific multipliers, and age × injury compound scaling.
 *
 * Base: 15%  |  Cap: 95%
 * Risk tiers: GREEN < 20%  |  YELLOW 20–35%  |  RED > 35%
 *
 * Also absorbs IRS positional-age thresholds:
 *   RB ≥ 28  +12%  |  QB ≥ 35  +12%  |  QB 32–34  +6%
 *   Clean 5-year history  −3%
 *
 * Exports: calculateMRS(playerId, position?, age?)
 *          getMRSBadge(playerId, position?, age?)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MRSRiskTier = 'GREEN' | 'YELLOW' | 'RED';
export type MRSBadgeColor = '#22c55e' | '#FBBF24' | '#EF4444';

export interface MRSResult {
  player_id: string;
  /** Risk percentage 0–95 */
  mrs_score: number;
  risk_tier: MRSRiskTier;
  /**
   * Array of specific risk flag strings. Concussion warnings always first.
   * Examples: "MULTI_CONCUSSION_WARNING", "RECURRING_HAMSTRING", "ACL_YEAR1_RETURN"
   */
  flags: string[];
  badge_color: MRSBadgeColor;
  display_label: string;
}

export interface MRSBadge {
  color: MRSBadgeColor;
  label: string;
  score: number;
  flags: string[];
}

// ─── Injury base risk additions (percentage points) ───────────────────────────

const INJURY_BASE_RISK: Record<string, number> = {
  hamstring_recurring: 18,   // 2+ occurrences — soft tissue explosion risk
  hamstring_single: 8,
  concussion_multiple: 25,   // multiple in same season — career risk
  concussion_single: 10,
  acl_year1: 20,             // Year 1 return: highest re-tear risk
  acl_year2: 10,             // Year 2: still elevated
  acl_year3plus: 5,          // Year 3+: residual only
  mcl_year1: 20,
  mcl_year2: 10,
  mcl_year3plus: 5,
  high_ankle_recurring: 15,  // notoriously slow full recovery
  high_ankle_single: 7,
  foot_ankle_chronic: 12,    // route runners specifically
  turf_toe: 8,               // WR/RB cut-move risk
  shoulder_qb: 15,
  back_chronic: 20,          // disc/spine: progressive condition
};

// ─── Position multipliers per injury class ────────────────────────────────────

function positionMultiplier(injuryKey: string, position: string): number {
  const pos = position.toUpperCase();

  if (injuryKey.startsWith('hamstring')) {
    if (pos === 'WR') return 1.4;  // speed-dependent route running
    if (pos === 'RB') return 1.2;  // explosion and cut moves
    if (pos === 'QB') return 0.8;  // less reliant on top-end speed
    if (pos === 'TE') return 1.1;
    return 1.0;
  }

  if (injuryKey === 'turf_toe') {
    // Primarily hurts WR/RB cut ability
    return pos === 'WR' || pos === 'RB' ? 1.0 : 0.5;
  }

  if (injuryKey === 'shoulder_qb') {
    return pos === 'QB' ? 1.0 : 0.4;
  }

  if (injuryKey === 'foot_ankle_chronic') {
    // Route runners hit hardest
    return pos === 'WR' || pos === 'TE' ? 1.3 : 1.0;
  }

  return 1.0;
}

// ─── Age × injury compound multiplier ────────────────────────────────────────
// Anchored to spec: age 24 = ×1.0, 27 = ×1.2, 29 = ×1.5, 31+ = ×2.0
// Interpolated for intervening ages.

function ageMultiplier(age: number): number {
  if (age <= 24) return 1.0;
  if (age <= 26) return 1.1;   // interpolated between 24 (1.0) and 27 (1.2)
  if (age <= 28) return 1.2;   // anchored at 27
  if (age <= 30) return 1.5;   // anchored at 29
  return 2.0;                  // 31+
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
  if (t.includes('acl') || t.includes('anterior_cruciate')) {
    if (yearsAgo <= 1) return 'acl_year1';
    if (yearsAgo <= 2) return 'acl_year2';
    return 'acl_year3plus';
  }
  if (t.includes('mcl') || t.includes('medial_collateral')) {
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
  // Regular foot/ankle (not high ankle) — chronic route-runner concern
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

// ─── Flag generation per injury ───────────────────────────────────────────────
// Concussion flags are marked HIGH_PRIORITY to ensure they surface first.

interface InjuryFlag {
  flag: string;
  highPriority: boolean;
}

function generateInjuryFlags(
  injuryKey: string,
  recurrenceCount: number,
  gamesMissed: number,
  severity: string | null,
): InjuryFlag[] {
  const flags: InjuryFlag[] = [];

  switch (injuryKey) {
    case 'concussion_multiple':
      flags.push({ flag: 'MULTI_CONCUSSION_WARNING', highPriority: true });
      flags.push({ flag: 'CAREER_RISK_FLAG', highPriority: true });
      break;
    case 'concussion_single':
      flags.push({ flag: 'CONCUSSION_HISTORY', highPriority: true });
      break;
    case 'hamstring_recurring':
      flags.push({ flag: 'RECURRING_HAMSTRING', highPriority: false });
      if (recurrenceCount >= 3) flags.push({ flag: 'CHRONIC_SOFT_TISSUE', highPriority: false });
      break;
    case 'acl_year1':
      flags.push({ flag: 'ACL_YEAR1_RETURN', highPriority: false });
      break;
    case 'acl_year2':
      flags.push({ flag: 'ACL_YEAR2', highPriority: false });
      break;
    case 'back_chronic':
      if (recurrenceCount >= 2) flags.push({ flag: 'CHRONIC_BACK', highPriority: false });
      break;
    case 'high_ankle_recurring':
      flags.push({ flag: 'CHRONIC_HIGH_ANKLE', highPriority: false });
      break;
    case 'mcl_year1':
      flags.push({ flag: 'MCL_YEAR1_RETURN', highPriority: false });
      break;
  }

  if (gamesMissed >= 8) flags.push({ flag: 'MISSED_HALF_SEASON', highPriority: false });
  if (severity === 'season_ending') flags.push({ flag: 'PRIOR_SEASON_ENDING', highPriority: false });

  return flags;
}

// ─── Positional age thresholds (absorbed from IRS) ───────────────────────────

function positionalAgeRisk(position: string, age: number): { risk: number; flag: string | null } {
  const pos = position.toUpperCase();
  if (pos === 'RB' && age >= 28) return { risk: 12, flag: 'RB_AGE_DECLINE' };
  if (pos === 'QB' && age >= 35) return { risk: 12, flag: 'QB_ADVANCED_AGE' };
  if (pos === 'QB' && age >= 32) return { risk: 6, flag: 'QB_AGE_WATCH' };
  return { risk: 0, flag: null };
}

// ─── Result builder ────────────────────────────────────────────────────────────

function buildResult(playerId: string, rawScore: number, flags: InjuryFlag[]): MRSResult {
  const mrs_score = Math.round(Math.min(95, Math.max(0, rawScore)) * 10) / 10;
  const risk_tier: MRSRiskTier = mrs_score < 20 ? 'GREEN' : mrs_score <= 35 ? 'YELLOW' : 'RED';

  const badge_color: MRSBadgeColor =
    risk_tier === 'GREEN' ? '#22c55e' : risk_tier === 'YELLOW' ? '#FBBF24' : '#EF4444';

  const display_label =
    risk_tier === 'GREEN' ? 'LOW RISK' : risk_tier === 'YELLOW' ? 'MONITOR' : 'HIGH RISK';

  // Surface concussion warnings first — career-risk flags above all others
  const sorted = [
    ...flags.filter((f) => f.highPriority).map((f) => f.flag),
    ...flags.filter((f) => !f.highPriority).map((f) => f.flag),
  ];

  return {
    player_id: playerId,
    mrs_score,
    risk_tier,
    flags: Array.from(new Set(sorted)),
    badge_color,
    display_label,
  };
}

// ─── calculateMRS ─────────────────────────────────────────────────────────────

type MedicalRow = {
  injury_type: string;
  season: number;
  games_missed: number;
  recurrence_count: number;
  severity: string | null;
};

export async function calculateMRS(
  playerId: string,
  playerPosition?: string,
  playerAge?: number,
): Promise<MRSResult> {
  const supabase = createAdminClient();
  const currentSeason = new Date().getFullYear();

  // Resolve position + age — prefer caller-supplied, fall back to Sleeper player DB
  let position = (playerPosition ?? '').toUpperCase();
  let age = playerAge ?? 0;

  if (!position || !age) {
    const allPlayers = await fetchAllPlayers();
    const p = allPlayers?.[playerId as keyof typeof allPlayers] as
      | { position?: string; age?: number }
      | undefined;

    if (p) {
      if (!position && p.position) position = p.position.toUpperCase();
      if (!age && p.age) age = p.age;
    }
  }

  if (!position) position = 'WR';
  if (!age) age = 26;

  // Pull complete injury history for this player
  const { data: injuries } = await supabase
    .from('medical_history')
    .select('injury_type, season, games_missed, recurrence_count, severity')
    .eq('player_id', playerId)
    .order('season', { ascending: false });

  // No injury history — base risk + positional age risk
  if (!injuries || injuries.length === 0) {
    let baseTotal = 15;
    const baseFlags: InjuryFlag[] = [];

    const { risk: posAgeRisk, flag: posAgeFlag } = positionalAgeRisk(position, age);
    if (posAgeRisk > 0) baseTotal += posAgeRisk;
    if (posAgeFlag) baseFlags.push({ flag: posAgeFlag, highPriority: false });

    // Clean history bonus
    baseTotal -= 3;

    return buildResult(playerId, baseTotal, baseFlags);
  }

  const typedInjuries = injuries as MedicalRow[];
  const ageMult = ageMultiplier(age);
  const allFlags: InjuryFlag[] = [];
  let totalRisk = 15; // base

  for (const inj of typedInjuries) {
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

    const flags = generateInjuryFlags(
      key,
      inj.recurrence_count,
      inj.games_missed,
      inj.severity,
    );
    allFlags.push(...flags);
  }

  // Positional age risk (IRS layer — position × age threshold modifiers)
  const { risk: posAgeRisk, flag: posAgeFlag } = positionalAgeRisk(position, age);
  if (posAgeRisk > 0) {
    totalRisk += posAgeRisk;
    if (posAgeFlag) allFlags.push({ flag: posAgeFlag, highPriority: false });
  }

  // Clean history bonus: no injuries in the last 5 seasons
  const recentInjuries = typedInjuries.filter((i) => currentSeason - i.season <= 5);
  if (recentInjuries.length === 0) {
    totalRisk -= 3;
    allFlags.push({ flag: 'CLEAN_5YR_HISTORY', highPriority: false });
  }

  // Two or more injury seasons in last 4 years → additional risk flag
  const injurySeasons = new Set(
    typedInjuries
      .filter((i) => currentSeason - i.season <= 4)
      .map((i) => i.season),
  );
  if (injurySeasons.size >= 2) {
    totalRisk += 8;
    allFlags.push({ flag: 'MULTI_INJURY_SEASONS', highPriority: false });
  }

  return buildResult(playerId, totalRisk, allFlags);
}

// ─── getMRSBadge ──────────────────────────────────────────────────────────────
// Runs calculateMRS internally — callers pass only the player ID.

export async function getMRSBadge(
  playerId: string,
  playerPosition?: string,
  playerAge?: number,
): Promise<MRSBadge> {
  const result = await calculateMRS(playerId, playerPosition, playerAge);
  return {
    color: result.badge_color,
    label: result.display_label,
    score: result.mrs_score,
    flags: result.flags,
  };
}

// ─── getMRSBadgeFromResult ────────────────────────────────────────────────────
// Synchronous convenience when you already have an MRSResult.

export function getMRSBadgeFromResult(result: MRSResult): MRSBadge {
  return {
    color: result.badge_color,
    label: result.display_label,
    score: result.mrs_score,
    flags: result.flags,
  };
}

// ─── Risk tier CSS class helpers ──────────────────────────────────────────────

export function mrsTierClass(tier: MRSRiskTier): string {
  if (tier === 'GREEN') return 'text-[#22c55e]';
  if (tier === 'YELLOW') return 'text-[#FBBF24]';
  return 'text-[#EF4444]';
}

export function mrsTierGlow(tier: MRSRiskTier): string {
  if (tier === 'GREEN') return '0 0 8px rgba(34,197,94,0.45)';
  if (tier === 'YELLOW') return '0 0 8px rgba(251,191,36,0.45)';
  return '0 0 8px rgba(239,68,68,0.55)';
}
