/** Defensive rank vs position (1 = toughest, 32 = easiest). */
type DefProfile = { pass: number; run: number; te: number };

const DEF_RANK: Record<string, DefProfile> = {
  ARI: { pass: 28, run: 26, te: 24 },
  ATL: { pass: 22, run: 20, te: 18 },
  BAL: { pass: 8, run: 6, te: 10 },
  BUF: { pass: 12, run: 14, te: 16 },
  CAR: { pass: 30, run: 29, te: 27 },
  CHI: { pass: 14, run: 16, te: 15 },
  CIN: { pass: 18, run: 19, te: 17 },
  CLE: { pass: 6, run: 5, te: 8 },
  DAL: { pass: 16, run: 18, te: 14 },
  DEN: { pass: 4, run: 10, te: 6 },
  DET: { pass: 24, run: 22, te: 20 },
  GB: { pass: 10, run: 12, te: 11 },
  HOU: { pass: 20, run: 21, te: 19 },
  IND: { pass: 19, run: 17, te: 18 },
  JAX: { pass: 27, run: 25, te: 26 },
  KC: { pass: 11, run: 13, te: 12 },
  LAC: { pass: 9, run: 11, te: 9 },
  LAR: { pass: 15, run: 16, te: 15 },
  LV: { pass: 26, run: 24, te: 23 },
  MIA: { pass: 23, run: 28, te: 22 },
  MIN: { pass: 17, run: 15, te: 16 },
  NE: { pass: 21, run: 20, te: 21 },
  NO: { pass: 25, run: 23, te: 24 },
  NYG: { pass: 29, run: 27, te: 28 },
  NYJ: { pass: 13, run: 14, te: 13 },
  PHI: { pass: 3, run: 7, te: 4 },
  PIT: { pass: 7, run: 9, te: 7 },
  SEA: { pass: 20, run: 22, te: 20 },
  SF: { pass: 5, run: 8, te: 5 },
  TB: { pass: 2, run: 4, te: 1 },
  TEN: { pass: 31, run: 30, te: 31 },
  WAS: { pass: 26, run: 25, te: 27 },
};

const DEFAULT_RANK = 16;

export function getDefensiveRank(opponent: string, position: string): number {
  const team = opponent.toUpperCase().replace(/^@/, '');
  const profile = DEF_RANK[team];
  if (!profile) return DEFAULT_RANK;
  const pos = position.toUpperCase();
  if (pos === 'RB') return profile.run;
  if (pos === 'TE') return profile.te;
  return profile.pass;
}

export function matchupScore(opponent: string, position: string): number {
  const rank = getDefensiveRank(opponent, position);
  return Math.round(100 - (rank / 32) * 100);
}

export function pointsAllowedLabel(opponent: string, position: string): number {
  const rank = getDefensiveRank(opponent, position);
  return Math.round(14 + ((32 - rank) * 0.55));
}
