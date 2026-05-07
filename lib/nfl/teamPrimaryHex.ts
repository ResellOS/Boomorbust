/** Primary brand colors for NFL team abbreviations (HUD accents). */
const TEAM_HEX: Record<string, string> = {
  ARI: '#97233F',
  ATL: '#A71930',
  BAL: '#241773',
  BUF: '#00338D',
  CAR: '#0085CA',
  CHI: '#0B162A',
  CIN: '#FB4F14',
  CLE: '#311D00',
  DAL: '#003594',
  DEN: '#FB4F14',
  DET: '#0076B6',
  GB: '#203731',
  HOU: '#03202F',
  IND: '#002C5F',
  JAX: '#006778',
  KC: '#E31837',
  LAC: '#0080C6',
  LAR: '#003594',
  LV: '#000000',
  MIA: '#008E97',
  MIN: '#4F2683',
  NE: '#002244',
  NO: '#D3BC8D',
  NYG: '#0B2265',
  NYJ: '#125740',
  PHI: '#004C54',
  PIT: '#FFB612',
  SF: '#AA0000',
  SEA: '#002244',
  TB: '#D50A0A',
  TEN: '#0C2340',
  WSH: '#5A1414',
  WAS: '#5A1414',
  LA: '#003594',
  JAC: '#006778',
};

export function nflTeamPrimaryHex(abbr: string | null | undefined): string {
  if (!abbr) return '#1e293b';
  const k = abbr.toUpperCase().trim();
  return TEAM_HEX[k] ?? '#334155';
}
