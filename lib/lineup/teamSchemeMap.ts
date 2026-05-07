/** Team abbreviation → TFO OC scheme family (offensive identity). */
export const TEAM_SCHEME_MAP: Record<string, string> = {
  KC: 'reid_tree',
  PHI: 'mcvay_tree',
  SF: 'shanahan_tree',
  DET: 'mcvay_tree',
  BAL: 'run_first',
  BUF: 'default',
  CIN: 'default',
  DAL: 'norv_tree',
  GB: 'lafleur',
  MIA: 'mcvay_tree',
  NYJ: 'default',
  LAR: 'mcvay_tree',
  HOU: 'mcvay_tree',
  JAX: 'reid_tree',
  MIN: 'mcvay_tree',
  NO: 'run_first',
  ATL: 'mcvay_tree',
  CAR: 'default',
  TB: 'default',
  SEA: 'shanahan_tree',
  ARI: 'air_raid',
  LAC: 'default',
  DEN: 'run_first',
  LV: 'default',
  NE: 'belichick',
  NYG: 'default',
  WSH: 'air_raid',
  IND: 'reid_tree',
  TEN: 'run_first',
  PIT: 'default',
  CLE: 'run_first',
  CHI: 'default',
};

export function schemeForTeam(team: string | null | undefined): string {
  if (!team) return 'default';
  const t = team.toUpperCase();
  const key = t === 'WAS' ? 'WSH' : t;
  return TEAM_SCHEME_MAP[key] ?? 'default';
}
