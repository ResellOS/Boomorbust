/**
 * TFO (Team Fit / Opportunity) formula engine — deterministic 0–100 score,
 * grades, verdicts, and narrative hooks from structural inputs.
 */

export type TFOPosition = 'QB' | 'RB' | 'WR' | 'TE';

export type TFOGrade = 'ELITE' | 'HIGH_VALUE' | 'VIABLE' | 'SPECULATIVE' | 'AVOID';

export type TFOVerdict = 'BOOM' | 'LEAN_BOOM' | 'NEUTRAL' | 'LEAN_BUST' | 'BUST';

export type TFOConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type RBUsageStyle = 'POWER' | 'RECEIVING';

export type WRDeployment = 'SLOT' | 'WR1';

export type CalculateTFOScoreInput = {
  playerId: string;
  position: TFOPosition;
  age: number;
  team: string;
  /** Offensive coordinator scheme family key (see normalizeOcScheme). */
  ocScheme: string;
  opportunityScore: number;
  olGrade: number;
  wrCastGrade: number;
  redZoneShare: number;
  ktcValue: number;
  weeklyPPG?: number;
  snapShare?: number;
  /** WR/TE target share (0–100). */
  targetShare?: number;
  /**
   * OC tenure in seasons with this team (1 = first year).
   * Drives NEW_OC flag and tenure modifiers on scheme score.
   */
  ocYear?: number;
  /** When `position !== 'QB'`, whether the starting QB is considered “young” for Year‑1 OC penalties. */
  teamQbIsYoung?: boolean;
  /** Explicit scheme‑fit mismatch (worst Year‑1 OC penalty). */
  schemeMismatch?: boolean;
  /** RB age‑curve track; defaults to POWER. */
  rbUsageStyle?: RBUsageStyle;
  /** Slot vs X/WR1 for scheme tables that differentiate (McVay, Air Raid, Norv). */
  wrDeployment?: WRDeployment;
};

export type CalculateTFOScoreResult = {
  tfoScore: number;
  grade: TFOGrade;
  verdict: TFOVerdict;
  projectedYards: { low: number; high: number };
  projectedTDs: { low: number; high: number };
  confidence: TFOConfidence;
  flags: string[];
  reasoning: string;
};

type OcSchemeKey =
  | 'reid_tree'
  | 'mcvay_tree'
  | 'shanahan_tree'
  | 'lafleur'
  | 'air_raid'
  | 'run_first'
  | 'norv_tree'
  | 'belichick'
  | 'default';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeOcScheme(raw: string): OcSchemeKey {
  const s = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (s.includes('reid')) return 'reid_tree';
  if (s.includes('mcvay')) return 'mcvay_tree';
  if (s.includes('shanahan')) return 'shanahan_tree';
  if (s.includes('lafleur') || s.includes('la_fleur')) return 'lafleur';
  if (s.includes('air') && s.includes('raid')) return 'air_raid';
  if (s.includes('run_first') || s.includes('runfirst')) return 'run_first';
  if (s.includes('norv')) return 'norv_tree';
  if (s.includes('belichick')) return 'belichick';
  return 'default';
}

/**
 * Trajectory / portfolio charts — same curve as {@link ageCurveMultiplier},
 * default POWER RB track (pass explicit style when modeling receiving backs).
 */
export function getAgeCurveMultiplier(position: TFOPosition, age: number): number {
  return ageCurveMultiplier(position, age, 'POWER');
}

/** Age curve multiplier by position (spec tables). */
export function ageCurveMultiplier(
  position: TFOPosition,
  age: number,
  rbUsageStyle: RBUsageStyle = 'POWER',
): number {
  const a = age;
  if (position === 'QB') {
    if (a >= 22 && a <= 32) return 1.0;
    if (a >= 33 && a <= 35) return 0.95;
    if (a >= 36 && a <= 38) return 0.82;
    return 0.7;
  }
  if (position === 'RB') {
    if (rbUsageStyle === 'RECEIVING') {
      if (a >= 22 && a <= 26) return 1.0;
      if (a === 27) return 0.9;
      if (a === 28) return 0.8;
      if (a === 29) return 0.68;
      return a >= 30 ? 0.55 : 1.0;
    }
    if (a >= 22 && a <= 25) return 1.0;
    if (a === 26) return 0.88;
    if (a === 27) return 0.78;
    if (a === 28) return 0.65;
    return 0.48;
  }
  if (position === 'WR') {
    if (a >= 22 && a <= 24) return 0.92;
    if (a >= 25 && a <= 28) return 1.0;
    if (a >= 29 && a <= 30) return 0.93;
    if (a >= 31 && a <= 32) return 0.84;
    return 0.72;
  }
  // TE
  if (a >= 22 && a <= 24) return 0.9;
  if (a >= 25 && a <= 28) return 1.0;
  if (a >= 29 && a <= 31) return 0.93;
  if (a >= 32 && a <= 33) return 0.82;
  return 0.68;
}

function baseSchemeScore(
  scheme: OcSchemeKey,
  position: TFOPosition,
  wrDeployment: WRDeployment,
  rbUsageStyle: RBUsageStyle,
): number {
  switch (scheme) {
    case 'reid_tree':
      return position === 'RB' ? 72 : 88;
    case 'mcvay_tree':
      if (position === 'QB') return 80;
      if (position === 'RB') return 70;
      return wrDeployment === 'SLOT' ? 85 : 80;
    case 'shanahan_tree':
      if (position === 'RB') return 90;
      if (position === 'WR') return 65;
      return 60;
    case 'lafleur':
      if (position === 'WR') return 82;
      if (position === 'RB') return 80;
      return 78;
    case 'air_raid':
      if (position === 'QB') return 88;
      if (position === 'WR') return (wrDeployment === 'SLOT' ? 85 : 78);
      if (position === 'RB') return rbUsageStyle === 'POWER' ? 60 : 72;
      return 82;
    case 'run_first':
      if (position === 'RB') return 85;
      if (position === 'WR') return 60;
      return 55;
    case 'norv_tree':
      if (position === 'QB') return 80;
      if (position === 'RB') return 65;
      return wrDeployment === 'WR1' ? 88 : 82;
    case 'belichick':
      return 70;
    default:
      return 70;
  }
}

function ocTenureModifier(
  ocYear: number | undefined,
  schemeMismatch: boolean,
  youngQbForPenalty: boolean,
): number {
  if (ocYear === undefined) return 0;
  if (ocYear <= 1) {
    if (schemeMismatch) return -14;
    return youngQbForPenalty ? -12 : -10;
  }
  // Year 2: +5; Year 3+: ramps toward cap (+12 total positive tenure modifier).
  return Math.min(12, 5 + (ocYear - 2) * 5);
}

function youngQbContext(input: CalculateTFOScoreInput): boolean {
  if (input.position === 'QB') return input.age < 26;
  return input.teamQbIsYoung === true;
}

export function normalizeKtcTo100(ktcValue: number): number {
  return clamp(((ktcValue - 1500) / 7500) * 100, 0, 100);
}

/** Final scheme score (0–100) after OC tenure modifiers — shared by TFO score and radar. */
export function computeSchemeScore(input: CalculateTFOScoreInput): number {
  const rbStyle = input.rbUsageStyle ?? 'POWER';
  const wrDep = input.wrDeployment ?? 'SLOT';
  const schemeKey = normalizeOcScheme(input.ocScheme);
  const baseScheme = baseSchemeScore(schemeKey, input.position, wrDep, rbStyle);
  const youngPen = youngQbContext(input);
  const ocMod = ocTenureModifier(input.ocYear, input.schemeMismatch === true, youngPen);
  return clamp(baseScheme + ocMod, 0, 100);
}

export function gradeFromScore(score: number): TFOGrade {
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH_VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

function verdictFromScore(score: number): TFOVerdict {
  if (score >= 85) return 'BOOM';
  if (score >= 72) return 'LEAN_BOOM';
  if (score >= 58) return 'NEUTRAL';
  if (score >= 44) return 'LEAN_BUST';
  return 'BUST';
}

function inSeasonAdjustment(input: CalculateTFOScoreInput): number {
  let adj = 0;
  const { position, weeklyPPG, snapShare, targetShare } = input;

  if (typeof snapShare === 'number') {
    if (snapShare < 45) adj -= 4;
    else if (snapShare < 55) adj -= 2;
    else if (snapShare > 88) adj += 3;
    else if (snapShare > 78) adj += 1;
  }

  if ((position === 'WR' || position === 'TE') && typeof targetShare === 'number') {
    if (targetShare >= 26) adj += 3;
    else if (targetShare <= 14) adj -= 3;
  }

  if (typeof weeklyPPG === 'number') {
    const baseline = position === 'QB' ? 18 : position === 'RB' ? 14 : position === 'WR' ? 12 : 10;
    const delta = weeklyPPG - baseline;
    adj += clamp(delta * 0.8, -4, 5);
  }

  return clamp(adj, -10, 10);
}

function projectionBands(
  position: TFOPosition,
  score01: number,
): {
  projectedYards: { low: number; high: number };
  projectedTDs: { low: number; high: number };
} {
  const s = score01;
  switch (position) {
    case 'QB':
      return {
        projectedYards: {
          low: Math.round(2800 + 900 * s),
          high: Math.round(3800 + 1200 * s),
        },
        projectedTDs: {
          low: Math.round(18 + 10 * s),
          high: Math.round(28 + 14 * s),
        },
      };
    case 'RB':
      return {
        projectedYards: {
          low: Math.round(650 + 450 * s),
          high: Math.round(1100 + 500 * s),
        },
        projectedTDs: {
          low: Math.round(4 + 6 * s),
          high: Math.round(8 + 10 * s),
        },
      };
    case 'WR':
      return {
        projectedYards: {
          low: Math.round(680 + 520 * s),
          high: Math.round(980 + 650 * s),
        },
        projectedTDs: {
          low: Math.round(4 + 7 * s),
          high: Math.round(7 + 11 * s),
        },
      };
    case 'TE':
    default:
      return {
        projectedYards: {
          low: Math.round(420 + 380 * s),
          high: Math.round(620 + 480 * s),
        },
        projectedTDs: {
          low: Math.round(3 + 5 * s),
          high: Math.round(5 + 8 * s),
        },
      };
  }
}

function confidenceLevel(input: CalculateTFOScoreInput, schemeScorePreWeight: number): TFOConfidence {
  let pts = 1;
  if (input.ocYear !== undefined) pts++;
  if (typeof input.snapShare === 'number') pts++;
  if (typeof input.weeklyPPG === 'number') pts++;
  if (input.position === 'WR' || input.position === 'TE') {
    if (typeof input.targetShare === 'number') pts++;
  }
  if (schemeScorePreWeight >= 55 && schemeScorePreWeight <= 95) pts++;
  if (pts >= 5) return 'HIGH';
  if (pts >= 3) return 'MEDIUM';
  return 'LOW';
}

function buildReasoning(verdict: TFOVerdict, flags: string[]): string {
  const has = (f: string) => flags.includes(f);
  if (verdict === 'BOOM') {
    return 'Elite opportunity in a scheme that maximizes this profile — buy window is open.';
  }
  if (verdict === 'LEAN_BOOM') {
    return 'Strong structural setup with room left for deployment to fully unlock the ceiling.';
  }
  if (verdict === 'NEUTRAL') {
    return 'Role is real but ceiling depends on scheme deployment.';
  }
  if (verdict === 'LEAN_BUST') {
    if (has('AGE_CLIFF') || has('SCHEME_MISMATCH')) {
      return 'Age curve and scheme friction chip away at the realistic ceiling this year.';
    }
    return 'Several situational drags suggest uneven weekly reliability.';
  }
  return 'Age curve and scheme mismatch create real floor risk this season.';
}

export function calculateTFOScore(input: CalculateTFOScoreInput): CalculateTFOScoreResult {
  const rbStyle = input.rbUsageStyle ?? 'POWER';
  const ageM = ageCurveMultiplier(input.position, input.age, rbStyle);

  const schemeScore = computeSchemeScore(input);

  const ol = clamp(input.olGrade, 0, 100);
  const cast = clamp(input.wrCastGrade, 0, 100);
  const opp = clamp(input.opportunityScore, 0, 100);
  const rz = clamp(input.redZoneShare, 0, 100);

  const profileBlend = (ol + cast) / 2;
  const profileScore = clamp(profileBlend * ageM, 0, 100);

  const ktcN = normalizeKtcTo100(input.ktcValue);
  const situationScore = clamp(rz * 0.62 + ktcN * 0.38, 0, 100);

  let core =
    opp * 0.35 + schemeScore * 0.25 + profileScore * 0.25 + situationScore * 0.15;

  core += inSeasonAdjustment(input);
  const tfoScore = Math.round(clamp(core, 0, 100) * 10) / 10;

  const grade = gradeFromScore(tfoScore);
  const verdict = verdictFromScore(tfoScore);

  const flags: string[] = [];
  if (ageM < 0.8) flags.push('AGE_CLIFF');
  if (schemeScore < 60) flags.push('SCHEME_MISMATCH');
  if (input.ocYear === 1) flags.push('NEW_OC');
  if (opp > 85) flags.push('ELITE_OPPORTUNITY');
  if (cast < 40) flags.push('WEAK_SUPPORT');
  if (rz > 75) flags.push('RZ_MONSTER');

  const score01 = tfoScore / 100;
  const { projectedYards, projectedTDs } = projectionBands(input.position, score01);
  const confidence = confidenceLevel(input, schemeScore);
  const reasoning = buildReasoning(verdict, flags);

  return {
    tfoScore,
    grade,
    verdict,
    projectedYards,
    projectedTDs,
    confidence,
    flags,
    reasoning,
  };
}

export default calculateTFOScore;
