/** Map common Sleeper/NFL abbreviations to ESPN logo slugs (a.espncdn.com lowercase). */

const NFL_ABBR_TO_ESPN: Record<string, string> = {
  ARI: 'ari',
  ATL: 'atl',
  BAL: 'bal',
  BUF: 'buf',
  CAR: 'car',
  CHI: 'chi',
  CIN: 'cin',
  CLE: 'cle',
  DAL: 'dal',
  DEN: 'den',
  DET: 'det',
  GB: 'gb',
  HOU: 'hou',
  IND: 'ind',
  JAX: 'jax',
  JAC: 'jax',
  KC: 'kc',
  LAC: 'lac',
  LAR: 'lar',
  LV: 'lv',
  LA: 'lar',
  MIA: 'mia',
  MIN: 'min',
  NE: 'ne',
  NO: 'no',
  NYG: 'nyg',
  NYJ: 'nyj',
  PHI: 'phi',
  PIT: 'pit',
  SF: 'sf',
  SEA: 'sea',
  TB: 'tb',
  TEN: 'ten',
  WSH: 'wsh',
  WAS: 'wsh',
};

const NFL_FULL_NAMES: Record<string, string> = {
  KC: 'Chiefs',
  BUF: 'Bills',
  BAL: 'Ravens',
  CIN: 'Bengals',
  CLE: 'Browns',
  PIT: 'Steelers',
  HOU: 'Texans',
  IND: 'Colts',
  JAX: 'Jaguars',
  TEN: 'Titans',
  DEN: 'Broncos',
  LAC: 'Chargers',
  LV: 'Raiders',
  DAL: 'Cowboys',
  PHI: 'Eagles',
  NYG: 'Giants',
  WAS: 'Commanders',
  WSH: 'Commanders',
  ATL: 'Falcons',
  CAR: 'Panthers',
  TB: 'Buccaneers',
  NO: 'Saints',
  SF: '49ers',
  SEA: 'Seahawks',
  LAR: 'Rams',
  ARI: 'Cardinals',
  CHI: 'Bears',
  DET: 'Lions',
  GB: 'Packers',
  MIN: 'Vikings',
  NE: 'Patriots',
  MIA: 'Dolphins',
  NYJ: 'Jets',
  LA: 'Rams',
  JAC: 'Jaguars',
};

export function espnNflLogoUrl(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  const slug = NFL_ABBR_TO_ESPN[abbr.toUpperCase().trim()];
  if (!slug) return null;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

export function nflTeamDisplayName(abbr: string | null | undefined): string {
  if (!abbr) return '—';
  return NFL_FULL_NAMES[abbr.toUpperCase().trim()] ?? abbr;
}
