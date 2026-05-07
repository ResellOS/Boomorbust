export function getPlayerPhotoUrl(player_id: string): string {
  return `https://sleepercdn.com/content/nfl/players/${player_id}.jpg`;
}

export function getAvatarUrl(avatar_id: string): string {
  return `https://sleepercdn.com/avatars/${avatar_id}`;
}

export function getPlayerInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const POSITION_COLORS = {
  QB: { bg: '#4C1D95', text: '#A78BFA', border: '#A78BFA' },
  RB: { bg: '#064E3B', text: '#34D399', border: '#34D399' },
  WR: { bg: '#1E3A8A', text: '#60A5FA', border: '#60A5FA' },
  TE: { bg: '#78350F', text: '#FBBF24', border: '#FBBF24' },
  K: { bg: '#1F2937', text: '#9CA3AF', border: '#9CA3AF' },
  DEF: { bg: '#7F1D1D', text: '#FCA5A5', border: '#FCA5A5' },
} as const;

export type PositionKey = keyof typeof POSITION_COLORS;

export function normalizePosition(pos: string): keyof typeof POSITION_COLORS {
  const p = pos.toUpperCase();
  if (p in POSITION_COLORS) return p as keyof typeof POSITION_COLORS;
  if (['DST', 'DEF'].includes(p)) return 'DEF';
  return 'WR';
}
