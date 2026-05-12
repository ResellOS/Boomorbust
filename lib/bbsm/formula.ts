export interface BBSMInput {
  tfoScore: number;        // 0–100
  ktcCurrent: number;      // current week KTC value
  ktcPrior: number;        // prior week KTC value (0 if unknown)
  rosterNeedWeight?: number; // 0–100, default 75
}

export interface BBSMResult {
  bbsmScore: number;
  grade: string;
  signal: string;
  signalColor: string;
  components: {
    p3wProj: number;
    trendVelocity: number;
    rosterNeed: number;
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function calculateBBSM({
  tfoScore,
  ktcCurrent,
  ktcPrior,
  rosterNeedWeight = 75,
}: BBSMInput): BBSMResult {
  const p3wProj = clamp(tfoScore, 0, 100);

  const delta = ktcCurrent - ktcPrior;
  const trendVelocity = ktcPrior === 0
    ? 50
    : clamp((delta / 1000) * 50 + 50, 0, 100);

  const rosterNeed = clamp(rosterNeedWeight, 0, 100);

  const bbsmScore = Math.round(
    p3wProj * 0.40 + trendVelocity * 0.35 + rosterNeed * 0.25
  );

  let grade: string;
  let signal: string;
  let signalColor: string;

  if (bbsmScore >= 70) {
    grade = 'ELITE';
    signal = 'STRONG BUY';
    signalColor = '#36E7A1';
  } else if (bbsmScore >= 55) {
    grade = 'HIGH VALUE';
    signal = 'HIGH VALUE STASH';
    signalColor = '#6366F1';
  } else if (bbsmScore >= 40) {
    grade = 'VIABLE';
    signal = 'HOLD';
    signalColor = '#FBBF24';
  } else if (bbsmScore >= 25) {
    grade = 'SPECULATIVE';
    signal = 'MONITOR';
    signalColor = '#F97316';
  } else {
    grade = 'AVOID';
    signal = 'FADE';
    signalColor = '#94A3B8';
  }

  return {
    bbsmScore,
    grade,
    signal,
    signalColor,
    components: { p3wProj, trendVelocity, rosterNeed },
  };
}
