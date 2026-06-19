import type { PlayerSubScores } from './types';

const SUB_KEYS: { key: keyof PlayerSubScores; label: string }[] = [
  { key: 'opportunity', label: 'Opportunity' },
  { key: 'situation', label: 'Situation' },
  { key: 'ageCurve', label: 'Age Curve' },
  { key: 'iq', label: 'IQ' },
  { key: 'upside', label: 'Upside' },
];

function topTwo(subScores: PlayerSubScores): [string, string] {
  const ranked = SUB_KEYS.map(({ key, label }) => ({
    label,
    value: subScores[key],
  })).sort((a, b) => b.value - a.value);
  return [ranked[0]?.label ?? 'Opportunity', ranked[1]?.label ?? 'Upside'];
}

export function generateBobVerdict(
  fullName: string,
  position: string,
  tfoScore: number,
  subScores: PlayerSubScores,
): { headline: string; description: string } {
  const [first, second] = topTwo(subScores);
  const pos = position.toUpperCase();

  if (tfoScore > 85) {
    return {
      headline: 'Buy Now',
      description: `Elite ${pos} with ${first.toLowerCase()} and ${second.toLowerCase()} driving weekly ceiling — ${fullName} profiles as a cornerstone dynasty asset.`,
    };
  }

  if (tfoScore >= 70) {
    return {
      headline: 'SOLID',
      description: `Solid dynasty asset with ${first.toLowerCase()} and ${second.toLowerCase()} supporting a stable weekly floor — ${fullName} belongs in win-now builds.`,
    };
  }

  return {
    headline: 'MONITOR',
    description: `Monitor closely — ${first.toLowerCase()} is the lone bright spot while ${second.toLowerCase()} and overall profile cap long-term upside.`,
  };
}
