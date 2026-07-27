// League Focus Score — a 0–100 URGENCY score per league (how much this league
// needs your attention right now), NOT a strength/quality score.
//
// Composed entirely from signals the app already has server-side, so it can be
// computed live at render with no new data collection:
//   • pending incoming trade offers (more urgent the sooner they expire)
//   • high-urgency daily tasks in this league (daily_tasks.urgency_score)
//   • lineup-lock proximity during an open start/sit window
//   • sell-window alerts on rostered players (0 until the engine populates them)
//
// Every factor degrades to 0 when its source is empty, so an engine table that
// isn't populated yet simply doesn't contribute (no fake urgency).

export interface LeagueFocusInput {
  /** Pending/incoming trade offers awaiting the user's response in this league. */
  pendingOffers: { expiresInHours?: number | null }[];
  /** This league's active daily tasks (urgency 0–100, optional expiry). */
  dailyTasks: { urgencyScore: number; impactScore?: number; expiresInHours?: number | null }[];
  /** Start/sit lineup context. */
  lineup: { windowOpen: boolean; hoursToLock?: number | null };
  /** Count of active sell-window alerts on the user's rostered players. */
  sellWindowAlerts: number;
}

export interface LeagueFocusReason {
  /** Points this factor contributed. */
  points: number;
  /** Short human "why" (e.g. "Trade expires in 5 hours"). */
  label: string;
}

export interface LeagueFocusScore {
  /** 0–100 urgency. */
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Sorted, most-urgent-first. Empty when nothing needs attention. */
  reasons: LeagueFocusReason[];
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function pluralHours(h: number): string {
  const r = Math.max(1, Math.round(h));
  return `${r} hour${r === 1 ? '' : 's'}`;
}

export function focusLevel(score: number): LeagueFocusScore['level'] {
  if (score >= 66) return 'HIGH';
  if (score >= 33) return 'MEDIUM';
  return 'LOW';
}

/**
 * Compute a league's 0–100 focus (urgency) score + a short "why" breakdown.
 * Pure and side-effect free so it's unit-testable and can run live or in a cron.
 */
export function computeLeagueFocusScore(input: LeagueFocusInput): LeagueFocusScore {
  const reasons: LeagueFocusReason[] = [];

  // 1. Pending trade offers — each is urgent; a soon-expiring one much more so.
  for (const offer of input.pendingOffers) {
    const h = offer.expiresInHours ?? null;
    let pts = 22; // a pending decision always matters
    let label = 'Trade offer awaiting your response';
    if (h != null && Number.isFinite(h)) {
      if (h <= 6) {
        pts = 40;
        label = `Trade expires in ${pluralHours(h)}`;
      } else if (h <= 24) {
        pts = 30;
        label = `Trade expires in ${pluralHours(h)}`;
      }
    }
    reasons.push({ points: pts, label });
  }

  // 2. High-urgency daily tasks (cap the contribution so a task pileup can't alone
  //    saturate the score; each task scaled by its own urgency).
  const rankedTasks = [...input.dailyTasks].sort((a, b) => b.urgencyScore - a.urgencyScore);
  let taskPoints = 0;
  for (const t of rankedTasks.slice(0, 4)) {
    const pts = Math.round((clamp(t.urgencyScore) / 100) * 14); // up to 14 each
    if (pts <= 0) continue;
    taskPoints += pts;
    const expiring = t.expiresInHours != null && t.expiresInHours <= 24;
    reasons.push({
      points: pts,
      label: expiring ? `Action expires in ${pluralHours(t.expiresInHours as number)}` : 'High-priority action available',
    });
  }
  void taskPoints;

  // 3. Lineup lock proximity — only during an open start/sit window.
  if (input.lineup.windowOpen) {
    const h = input.lineup.hoursToLock ?? null;
    if (h != null && Number.isFinite(h) && h <= 48) {
      const pts = h <= 6 ? 26 : h <= 24 ? 18 : 10;
      reasons.push({ points: pts, label: `Lineups lock in ${pluralHours(h)}` });
    }
  }

  // 4. Sell-window alerts on rostered players (0 until the engine populates them).
  if (input.sellWindowAlerts > 0) {
    const n = input.sellWindowAlerts;
    reasons.push({
      points: Math.min(24, 8 + n * 6),
      label: `${n} sell-window alert${n === 1 ? '' : 's'} on your roster`,
    });
  }

  const raw = reasons.reduce((s, r) => s + r.points, 0);
  const score = Math.round(clamp(raw));
  reasons.sort((a, b) => b.points - a.points);

  return { score, level: focusLevel(score), reasons: reasons.slice(0, 4) };
}
