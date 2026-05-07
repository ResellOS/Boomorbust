export type EmpireLevel = 'boom' | 'stable' | 'bust';

// ── Headline Banks ───────────────────────────────────────────────────────────

const BOOM_LINES = [
  "WHOOP! Your empire is back-back-back-back in the green!",
  "He could. Go. All. The. Way! Your dynasty is firing on all cylinders!",
  "Could you BELIEVE it?! This roster is SWAMI-approved and dynasty-ready!",
  "BOOM GOES THE DYNAMITE! You've got a championship-caliber empire right here!",
  "And the empire WILL NOT be denied! Lock it up — this is a dynasty machine!",
] as const;

const STABLE_LINES = [
  "Hold on to your hats — it's a coin flip! Steady as she goes, manager.",
  "The SWAMI says: solid pieces, but the empire needs a catalyst. Make your move.",
  "This empire is idling in neutral. Time to pull the trigger or wait for the right deal.",
  "Not quite BOOM, not quite BUST — your empire is in the eye of the storm!",
  "We're taking it one week at a time here. There's talent, but the window isn't open yet.",
] as const;

const BUST_LINES = [
  "RUMBLIN, STUMBLIN, FUMBLIN! We've got a nuke alert in the Hall of Blamers!",
  "It's a FUMBLE at the goal line! This roster is crying out for a full rebuild, baby!",
  "SWAMI says: Houston, we have a problem. Time to blow it up and collect picks!",
  "He got JACKED UP! This empire is one bad trade away from the dynasty dumpster.",
  "NOBODY circles the wagons like the Buffalo Bills — but even they wouldn't roster this!",
] as const;

// ── Public API ───────────────────────────────────────────────────────────────

export function getEmpirePulseLevel(healthScore: number): EmpireLevel {
  if (healthScore > 80) return 'boom';
  if (healthScore < 40) return 'bust';
  return 'stable';
}

/**
 * Returns a random Chris Berman-voiced Empire Pulse headline keyed to
 * the league's health score.
 *
 * Score > 80 → BOOM
 * Score < 40 → BUST
 * Otherwise  → STABLE
 */
export function getEmpirePulse(healthScore: number): string {
  const level = getEmpirePulseLevel(healthScore);
  const lines = level === 'boom' ? BOOM_LINES : level === 'bust' ? BUST_LINES : STABLE_LINES;
  return lines[Math.floor(Math.random() * lines.length)]!;
}
