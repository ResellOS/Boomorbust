import type { PlayerSubScores } from '@/lib/players/types';
import { pointsAllowedLabel } from './matchupRankings';

export function generateStartSitReasoning(
  subScores: PlayerSubScores,
  opponent: string,
  position: string,
  team: string,
  startScore: number,
): string {
  const entries: { key: keyof PlayerSubScores; label: string }[] = [
    { key: 'opportunity', label: 'target share' },
    { key: 'situation', label: 'game script' },
    { key: 'ageCurve', label: 'usage trend' },
    { key: 'iq', label: 'route efficiency' },
    { key: 'upside', label: 'ceiling' },
  ];

  const ranked = entries
    .map((e) => ({ ...e, value: subScores[e.key] }))
    .sort((a, b) => b.value - a.value);

  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const pos = position.toUpperCase();
  const opp = opponent.replace('@', '');

  if (top && top.value > 85) {
    const pts = pointsAllowedLabel(opp, pos);
    return `${team} faces ${opp} allowing ${pts}+ pts to ${pos}s this season`;
  }

  if (low && low.value < 60) {
    if (low.key === 'ageCurve') return 'Snap count risk, declining usage';
    if (low.key === 'opportunity') return 'Volume capped — limited weekly touches expected';
    return `${low.label} flagging below league average`;
  }

  if (startScore >= 75) {
    return `Elite ${pos} profile with ${top?.label ?? 'volume'} driving weekly floor`;
  }

  if (startScore < 50) {
    const rank = pointsAllowedLabel(opp, pos);
    return `${opp} limiting ${pos} production — ${rank} pts allowed trend`;
  }

  return `Matchup-neutral week — lean on ${top?.label ?? 'usage'} for edge`;
}
