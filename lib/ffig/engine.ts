export type FFigPosition = 'QB' | 'RB' | 'WR' | 'TE';
export type FFigGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export interface FFigInput {
  player_name: string;
  position: FFigPosition;
  draft_year: number;
  draft_round?: number | null;
  draft_pick?: number | null;
  college?: string | null;
  nfl_team?: string | null;
  age_at_draft?: number | null;
  dom_score: number;       // 0–100 college dominator rating
  ras_score: number;       // 0–10 relative athletic score
  breakout_age?: number | null;
  target_share: number;    // % of team targets/opportunities

  small_school_penalty: boolean;          // -5
  committee_backfield_penalty: boolean;   // -10 (RB)
  p2s_bust_penalty: boolean;              // -15 (no path to starter, esp. QB)

  vacated_volume_mod: number;   // +0.10 if destination had >100 vacated opps
  qb_coefficient_mod: number;   // +0.10 elite QB / 0 avg / -0.10 poor QB
  scheme_proe_mod: number;      // +0.05 pass-heavy scheme

  dynasty_hit?: boolean | null;
  career_ppg?: number | null;
}

export interface FFigResult extends FFigInput {
  penalty_total: number;
  lsm_total: number;
  ffig_score: number;
  ffig_grade: FFigGrade;
}

function scoreToGrade(score: number): FFigGrade {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function computeFFig(p: FFigInput): FFigResult {
  // Base components — max 100
  const domComponent   = Math.min(p.dom_score * 0.4, 40);
  const rasComponent   = Math.min(p.ras_score * 2,   20);
  const pick           = p.draft_pick ?? 200;
  const draftComponent = Math.max(0, 20 - Math.floor(pick / 5));

  let breakoutComponent = 5;
  if (p.breakout_age != null) {
    if      (p.breakout_age < 20) breakoutComponent = 20;
    else if (p.breakout_age < 21) breakoutComponent = 16;
    else if (p.breakout_age < 22) breakoutComponent = 12;
    else if (p.breakout_age < 23) breakoutComponent = 8;
    else                          breakoutComponent = 5;
  }

  const baseScore = domComponent + rasComponent + draftComponent + breakoutComponent;

  // Penalties
  const penaltyTotal =
    (p.small_school_penalty        ?  5 : 0) +
    (p.committee_backfield_penalty ? 10 : 0) +
    (p.p2s_bust_penalty            ? 15 : 0);

  // Landing Spot Modifier
  const lsmTotal = Math.round(
    (1.0 + p.vacated_volume_mod + p.qb_coefficient_mod + p.scheme_proe_mod) * 1000
  ) / 1000;

  const preScore = Math.max(0, baseScore - penaltyTotal);
  const ffigScore = Math.round(preScore * lsmTotal * 10) / 10;

  return {
    ...p,
    penalty_total: penaltyTotal,
    lsm_total: lsmTotal,
    ffig_score: ffigScore,
    ffig_grade: scoreToGrade(ffigScore),
  };
}
