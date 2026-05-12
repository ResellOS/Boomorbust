import { computeFFig, type FFigInput, type FFigResult, type FFigPosition } from '@/lib/ffig/engine';
import { calculateTFOScore, type CalculateTFOScoreInput } from '@/lib/tfo/formula';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';

/** Same tuple shape as lib/ffig/seed-data RAW rows. */
export type RookieFfigSeedTuple = [
  string,
  FFigPosition,
  number,
  number,
  number,
  string,
  string,
  number,
  number,
  number,
  number | null,
  number,
  boolean,
  boolean,
  boolean,
  number,
  number,
  number,
  boolean | null,
  number | null,
];

/** April 2025 NFL draft class — single source for rookies UI + FFIG seed-data. */
export const ROOKIE_2025_FFIG_SEEDS: RookieFfigSeedTuple[] = [
  // name, pos, year, round, overall_pick, college, nfl_team, age, dom, ras, breakout, tgt%, small, committee, p2s, vvm, qcm, scheme, hit, ppg
  ['Cam Ward', 'QB', 2025, 1, 1, 'Miami FL', 'TEN', 23, 88, 7.8, 21, 0, false, false, false, 0, 0, 0.05, null, null],
  ['Tyler Warren', 'TE', 2025, 1, 15, 'Penn State', 'IND', 23, 86, 8.4, 21, 38, false, false, false, 0.1, 0, 0.05, null, null],
  ['Ashton Jeanty', 'RB', 2025, 1, 6, 'Boise State', 'LV', 21, 94, 8.9, 20, 62, false, false, false, 0.1, -0.1, 0, null, null],
  ['Tetairoa McMillan', 'WR', 2025, 1, 8, 'Arizona', 'ARI', 21, 90, 9.1, 20, 42, false, false, false, 0.1, 0, 0.05, null, null],
  ['Matthew Golden', 'WR', 2025, 1, 25, 'Texas', 'GB', 21, 84, 8.8, 21, 36, false, false, false, 0, 0.1, 0.05, null, null],
  ['Jayden Higgins', 'WR', 2025, 2, 34, 'Clemson', 'HOU', 22, 82, 8.6, 21, 34, false, false, false, 0.1, -0.1, 0, null, null],
  ['TreVeyon Henderson', 'RB', 2025, 2, 38, 'Ohio State', 'NE', 22, 86, 8.9, 21, 52, false, false, false, 0, 0.1, 0.05, null, null],
  ['Luther Burden III', 'WR', 2025, 2, 39, 'Missouri', 'CHI', 21, 86, 9.0, 21, 40, false, false, false, 0.1, 0, 0.05, null, null],
  ['Emeka Egbuka', 'WR', 2025, 2, 54, 'Ohio State', 'TB', 22, 84, 8.7, 21, 38, false, false, false, 0.1, -0.1, 0, null, null],
  ['Harold Fannin Jr', 'TE', 2025, 2, 55, 'Bowling Green', 'CLE', 21, 80, 8.2, 20, 36, false, false, false, 0, 0, 0.05, null, null],
  ['Jack Bech', 'WR', 2025, 2, 58, 'TCU', 'LV', 22, 78, 8.5, 21, 34, false, false, false, 0.1, -0.1, 0, null, null],
  ['Kaleb Johnson', 'RB', 2025, 3, 83, 'Iowa', 'PIT', 21, 82, 8.3, 21, 48, false, true, false, 0, 0, 0, null, null],
  ['Elijah Arroyo', 'TE', 2025, 3, 88, 'Miami FL', 'MIA', 22, 76, 8.0, 21, 28, false, false, false, 0.1, -0.1, 0, null, null],
  ['Dillon Gabriel', 'QB', 2025, 3, 94, 'Oregon', 'CLE', 24, 80, 7.4, 22, 0, false, false, false, 0, 0, 0.05, null, null],
  ['Terrance Ferguson', 'TE', 2025, 4, 104, 'Oregon', 'LAR', 22, 74, 8.5, 21, 30, false, false, false, 0.1, 0.1, 0.05, null, null],
  ['Quinshon Judkins', 'RB', 2025, 4, 120, 'Ohio State', 'CLE', 22, 88, 8.6, 21, 54, false, false, false, 0.1, 0, 0, null, null],
  ['Dylan Sampson', 'RB', 2025, 4, 126, 'Tennessee', 'TEN', 22, 84, 8.4, 21, 48, false, false, false, 0.1, -0.1, 0, null, null],
  ['Shedeur Sanders', 'QB', 2025, 5, 144, 'Colorado', 'CLE', 23, 82, 7.2, 21, 0, false, false, false, 0, -0.1, 0, null, null],
  ["Dont'e Thornton", 'WR', 2025, 6, 173, 'Tennessee', 'NE', 22, 74, 8.6, 21, 30, false, false, false, 0, 0.1, 0.05, null, null],
  ['Savion Williams', 'WR', 2025, 6, 195, 'TCU', 'PIT', 22, 76, 8.8, 22, 32, false, false, false, 0, -0.1, 0, null, null],
  ['Bhayshul Tuten', 'RB', 2025, 6, 190, 'Virginia Tech', 'JAX', 22, 78, 8.2, 21, 46, false, true, false, 0.1, 0, 0.05, null, null],
  ['Tyler Shough', 'QB', 2025, 8, 225, 'Texas Tech', 'NO', 25, 72, 6.9, 23, 0, false, false, false, 0, 0, 0, null, null],
];

export function opportunityScoreFromDraft(overallPick: number, round: number): number {
  if (overallPick <= 10) return 85;
  if (round === 1) return 78;
  if (round === 2) return 68;
  return 55;
}

export function ktcValueFromDraft(round: number, overallPick: number): number {
  if (overallPick <= 10) return 5000;
  if (round === 1) return 4300;
  if (round === 2) return 3500;
  if (round === 3) return 2900;
  if (round <= 5) return 2400;
  return 2000;
}

export function buildTfoInputFor2025Rookie(row: RookieFfigSeedTuple): CalculateTFOScoreInput {
  const [player_name, position, , draft_round, overall, , nfl_team, age] = row;
  const slug = player_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const team = (nfl_team || 'FA').toUpperCase();
  const opportunityScore = opportunityScoreFromDraft(overall, draft_round);
  const ktcValue = ktcValueFromDraft(draft_round, overall);
  return {
    playerId: `rookie-2025-${slug}`,
    position,
    age,
    team,
    ocScheme: schemeForTeam(nfl_team),
    opportunityScore,
    olGrade: 70,
    wrCastGrade: 70,
    redZoneShare: 55,
    ktcValue,
    ocYear: 3,
    rbUsageStyle: position === 'RB' ? 'POWER' : undefined,
    wrDeployment: position === 'WR' ? 'SLOT' : undefined,
  };
}

function tupleToFFigInput(t: RookieFfigSeedTuple): FFigInput {
  const [
    player_name,
    position,
    draft_year,
    draft_round,
    draft_pick,
    college,
    nfl_team,
    age_at_draft,
    dom_score,
    ras_score,
    breakout_age,
    target_share,
    small_school_penalty,
    committee_backfield_penalty,
    p2s_bust_penalty,
    vacated_volume_mod,
    qb_coefficient_mod,
    scheme_proe_mod,
    dynasty_hit,
    career_ppg,
  ] = t;
  return {
    player_name,
    position,
    draft_year,
    draft_round,
    draft_pick,
    college,
    nfl_team,
    age_at_draft,
    dom_score,
    ras_score,
    breakout_age,
    target_share,
    small_school_penalty,
    committee_backfield_penalty,
    p2s_bust_penalty,
    vacated_volume_mod,
    qb_coefficient_mod,
    scheme_proe_mod,
    dynasty_hit,
    career_ppg,
  };
}

export type Built2025RookieProspect = {
  id: string;
  player_id: string | null;
  player_name: string;
  position: FFigPosition;
  draft_year: number;
  draft_round: number | null;
  draft_pick: number | null;
  college: string | null;
  nfl_team: string | null;
  age_at_draft: number | null;
  dom_score: number;
  ras_score: number;
  breakout_age: number | null;
  target_share: number | null;
  small_school_penalty: boolean;
  committee_backfield_penalty: boolean;
  p2s_bust_penalty: boolean;
  penalty_total: number;
  vacated_volume_mod: number;
  qb_coefficient_mod: number;
  scheme_proe_mod: number;
  lsm_total: number;
  ffig_score: number;
  ffig_grade: FFigResult['ffig_grade'];
  dynasty_hit: boolean | null;
  career_ppg: number | null;
  tfo_snapshot: number;
};

export function build2025RookieProspectRecords(): Built2025RookieProspect[] {
  return ROOKIE_2025_FFIG_SEEDS.map((tuple) => {
    const fig = computeFFig(tupleToFFigInput(tuple));
    const tfo = calculateTFOScore(buildTfoInputFor2025Rookie(tuple)).tfoScore;
    const slug = fig.player_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: `ffig-2025-${slug}`,
      player_id: null,
      player_name: fig.player_name,
      position: fig.position,
      draft_year: fig.draft_year,
      draft_round: fig.draft_round ?? null,
      draft_pick: fig.draft_pick ?? null,
      college: fig.college ?? null,
      nfl_team: fig.nfl_team ?? null,
      age_at_draft: fig.age_at_draft ?? null,
      dom_score: fig.dom_score,
      ras_score: fig.ras_score,
      breakout_age: fig.breakout_age ?? null,
      target_share: fig.target_share,
      small_school_penalty: fig.small_school_penalty,
      committee_backfield_penalty: fig.committee_backfield_penalty,
      p2s_bust_penalty: fig.p2s_bust_penalty,
      penalty_total: fig.penalty_total,
      vacated_volume_mod: fig.vacated_volume_mod,
      qb_coefficient_mod: fig.qb_coefficient_mod,
      scheme_proe_mod: fig.scheme_proe_mod,
      lsm_total: fig.lsm_total,
      ffig_score: fig.ffig_score,
      ffig_grade: fig.ffig_grade,
      dynasty_hit: fig.dynasty_hit ?? null,
      career_ppg: fig.career_ppg ?? null,
      tfo_snapshot: Math.round(tfo * 10) / 10,
    };
  });
}

export function normalizeRookieNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/ jr$/i, '')
    .replace(/ iii$/i, '')
    .replace(/ ii$/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export const NFL_2025_ROOKIE_NAME_KEYS: ReadonlySet<string> = new Set(
  ROOKIE_2025_FFIG_SEEDS.map(([n]) => normalizeRookieNameKey(n)),
);

export function is2025NflRookieClassName(displayName: string): boolean {
  return NFL_2025_ROOKIE_NAME_KEYS.has(normalizeRookieNameKey(displayName));
}

export type ScoutingRadarTabKey = 'vets' | 'rookies' | 'prospects';

export function classifyScoutingRadarTab(playerName: string, age: number): ScoutingRadarTabKey {
  if (is2025NflRookieClassName(playerName)) return 'rookies';
  if (age <= 21) return 'prospects';
  return 'vets';
}

export function roundPickSlotLabel(
  draftRound: number | null | undefined,
  overallPick: number | null | undefined,
): string {
  if (draftRound == null || overallPick == null) return '';
  const slot = overallPick - (draftRound - 1) * 32;
  const pk = slot >= 1 && slot <= 32 ? slot : overallPick;
  return `RD ${draftRound} · PK ${pk}`;
}
