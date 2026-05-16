export interface HandcuffAnalysis {
  starter: {
    player_id: string;
    full_name: string;
    tfo_score: number;
    team: string;
  };
  handcuff: {
    player_id: string;
    full_name: string;
    tfo_score: number;
  } | null;
  handcuff_score: number;
  user_owns_handcuff: boolean;
  recommendation: 'MUST OWN' | 'WORTH OWNING' | 'STREAM ONLY' | 'DROP';
  reasoning: string;
}

export function calcHandcuffScore(
  starterTfo: number,
  injuryStatus: string | null,
  backupTfo: number,
): number {
  // starter_usage_rate approximated from TFO score (70-100 TFO → 65-99 usage)
  const usageRate = Math.min(99, Math.max(40, (starterTfo - 70) * 1.15 + 65));

  // starter_mrs_score from injury status
  const mrsScore =
    injuryStatus === 'IR' || injuryStatus === 'PUP' ? 85
    : injuryStatus === 'Out' ? 80
    : injuryStatus === 'Doubtful' ? 65
    : injuryStatus === 'Questionable' ? 45
    : 20;

  const score = usageRate * 0.4 + mrsScore * 0.3 + backupTfo * 0.3;
  return Math.round(Math.min(99, Math.max(0, score)));
}

export function handcuffRecommendation(
  score: number,
): HandcuffAnalysis['recommendation'] {
  if (score >= 70) return 'MUST OWN';
  if (score >= 50) return 'WORTH OWNING';
  if (score >= 35) return 'STREAM ONLY';
  return 'DROP';
}

export function handcuffReasoning(
  starter: string,
  backupName: string | null,
  score: number,
  userOwns: boolean,
  injuryStatus: string | null,
): string {
  const rec = handcuffRecommendation(score);
  const backup = backupName ?? 'their backup';

  if (userOwns) {
    return `You own ${backup} — smart insurance on ${starter}${injuryStatus ? ` (currently ${injuryStatus})` : ''}.`;
  }
  if (rec === 'MUST OWN') {
    return `${backup} is a high-value handcuff for ${starter}. In a workhorse-dependent offense, this is a must-roster asset.`;
  }
  if (rec === 'WORTH OWNING') {
    return `${backup} is worth a roster spot as insurance on ${starter}. The offense heavily relies on the starter.`;
  }
  if (rec === 'STREAM ONLY') {
    return `${backup} has limited value beyond a streaming option. ${starter}'s offense doesn't make the backup a must-own.`;
  }
  return `${backup} lacks standalone value and isn't worth a dynasty roster spot behind ${starter}.`;
}
