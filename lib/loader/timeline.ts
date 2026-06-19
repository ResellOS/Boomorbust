/** Cinematic loading screen timeline — strike is the transition moment. */
export const LOADER_TIMELINE = {
  TEXT_START_MS: 300,
  FILL_START_MS: 700,
  SPARKS_MS: 1100,
  FULL_COLOR_MS: 1600,
  WAR_ROOM_TEXT_MS: 2100,
  STRIKE_MS: 2300,
  FADE_AFTER_STRIKE_MS: 500,
  SAFETY_MS: 3500,
  FADE_MS: 450,
} as const;

export function progressFromElapsed(elapsed: number): number {
  const kf: [number, number][] = [
    [0, 0],
    [LOADER_TIMELINE.TEXT_START_MS, 12],
    [LOADER_TIMELINE.FILL_START_MS, 28],
    [LOADER_TIMELINE.SPARKS_MS, 48],
    [LOADER_TIMELINE.FULL_COLOR_MS, 72],
    [LOADER_TIMELINE.WAR_ROOM_TEXT_MS, 88],
    [LOADER_TIMELINE.STRIKE_MS, 100],
  ];

  if (elapsed <= 0) return 0;
  if (elapsed >= kf[kf.length - 1]![0]) return 100;

  for (let i = 0; i < kf.length - 1; i++) {
    const [t0, p0] = kf[i]!;
    const [t1, p1] = kf[i + 1]!;
    if (elapsed >= t0 && elapsed < t1) {
      const u = (elapsed - t0) / (t1 - t0);
      return p0 + u * (p1 - p0);
    }
  }
  return 100;
}
