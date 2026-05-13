/**
 * Manual name overrides for KTC → Sleeper player resolution.
 * Add entries whenever fuzzy matching fails for a specific player.
 * Format: 'KTC display name': 'Sleeper full_name'
 */
export const NAME_OVERRIDES: Record<string, string> = {
  // Jr / Sr / III suffixes
  'Odell Beckham': 'Odell Beckham Jr.',
  'Odell Beckham Jr': 'Odell Beckham Jr.',
  'Henry Ruggs': 'Henry Ruggs III',
  'Michael Pittman': 'Michael Pittman Jr.',
  'Michael Pittman Jr': 'Michael Pittman Jr.',
  'Marvin Harrison': 'Marvin Harrison Jr.',
  'Marvin Harrison Jr': 'Marvin Harrison Jr.',
  'Brian Robinson': 'Brian Robinson Jr.',
  'Kenneth Walker': 'Kenneth Walker III',
  'Kenneth Walker III': 'Kenneth Walker III',
  'Will Fuller': 'Will Fuller V',
  'Laviska Shenault': 'Laviska Shenault Jr.',

  // Initials / punctuation
  'DJ Moore': 'D.J. Moore',
  'DK Metcalf': 'D.K. Metcalf',
  'AJ Brown': 'A.J. Brown',
  'AJ Green': 'A.J. Green',
  'TY Hilton': 'T.Y. Hilton',
  'KJ Hamler': 'K.J. Hamler',
  'KJ Osborn': 'K.J. Osborn',
  'Amon Ra St Brown': 'Amon-Ra St. Brown',
  'Amon-Ra St Brown': 'Amon-Ra St. Brown',
  'Tyrion Davis Price': 'Tyrion Davis-Price',

  // Capitalisation / spacing variants
  'Ceedee Lamb': 'CeeDee Lamb',
  'CeeDee Lamb': 'CeeDee Lamb',
  'Juju Smith Schuster': 'JuJu Smith-Schuster',
  'JuJu Smith-Schuster': 'JuJu Smith-Schuster',

  // Apostrophes
  "Wan Dale Robinson": "Wan'Dale Robinson",
  "Wan Dale": "Wan'Dale Robinson",

  // Common nicknamesaccessor
  'Hollywood Brown': 'Marquise Brown',

  // 2022–2026 rookies / common mismatches
  'Skyy Moore': 'Skyy Moore',
  'Wan\'Dale Robinson': "Wan'Dale Robinson",
};

/** Reverse map — Sleeper full_name → canonical KTC name */
export const REVERSE_OVERRIDES: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_OVERRIDES).map(([k, v]) => [v, k]),
);

/**
 * Resolve a KTC player name to a Sleeper player_id.
 * Uses NAME_OVERRIDES first, then exact match, then normalised fallback.
 */
export function resolveSleeperIdFromKTCName(
  ktcName: string,
  sleeperPlayers: Array<{ full_name: string; player_id: string }>,
): string | null {
  // 1. Override map
  const override = NAME_OVERRIDES[ktcName];
  if (override) {
    const hit = sleeperPlayers.find((p) => p.full_name === override);
    if (hit) return hit.player_id;
  }

  // 2. Exact match
  const exact = sleeperPlayers.find(
    (p) => p.full_name.toLowerCase() === ktcName.toLowerCase(),
  );
  if (exact) return exact.player_id;

  // 3. Normalised match — strip suffixes and punctuation
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v)\s*$/i, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normKTC = norm(ktcName);
  const normHit = sleeperPlayers.find((p) => norm(p.full_name) === normKTC);
  if (normHit) return normHit.player_id;

  // 4. Last-name + first-initial match
  const ktcParts = ktcName.trim().split(/\s+/);
  if (ktcParts.length >= 2) {
    const lastName = ktcParts[ktcParts.length - 1].toLowerCase();
    const firstInitial = ktcParts[0][0]?.toLowerCase();
    const liMatch = sleeperPlayers.find((p) => {
      const parts = p.full_name.split(/\s+/);
      return (
        parts[parts.length - 1].toLowerCase() === lastName &&
        parts[0]?.[0]?.toLowerCase() === firstInitial
      );
    });
    if (liMatch) return liMatch.player_id;
  }

  return null;
}
