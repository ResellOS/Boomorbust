/** Deterministic ESPN team logo slug from any string key (stable per league/card). */
const NFL_ABBR_ORDER = [
  'kc',
  'buf',
  'cin',
  'bal',
  'pit',
  'cle',
  'hou',
  'ind',
  'jax',
  'ten',
  'den',
  'lac',
  'lv',
  'dal',
  'phi',
  'nyg',
  'was',
  'atl',
  'car',
  'tb',
  'no',
  'sf',
  'lar',
  'sea',
  'ari',
  'chi',
  'det',
  'gb',
  'min',
  'ne',
  'mia',
  'nyj',
] as const;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function nflLogoUrl(leagueOrCardKey: string): string {
  const slug = NFL_ABBR_ORDER[hashSeed(leagueOrCardKey) % NFL_ABBR_ORDER.length]!;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}
