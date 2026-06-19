import type { DraftSessionSummary } from './types';
import { slotOnClock, initPickOwnership } from './engine';

export function formatDraftFormat(session: DraftSessionSummary): string {
  if (session.superflex) return 'SF';
  return '1QB';
}

export function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Round.slot label for current on-the-clock pick, e.g. "1.06" */
export function currentPickLabel(session: DraftSessionSummary): string {
  const total = session.teams * session.rounds;
  const overall = Math.min(session.pickCount + 1, total);
  const round = Math.floor((overall - 1) / session.teams) + 1;

  const config = {
    draftName: session.draftName,
    draftType: session.draftType,
    draftOrderType: session.draftOrderType,
    teams: session.teams,
    rounds: session.rounds,
    scoring: 'dynasty_ppr' as const,
    superflex: session.superflex,
    yourPick: session.yourPick,
    pickTimer: 'none' as const,
    cpuAutopick: true,
    playerPool: 'all' as const,
    thirdRoundReversal: session.thirdRoundReversal,
    showTeamNames: true,
    rosterSlots: [],
    teamOrder: [],
  };

  const ownership = initPickOwnership(config);
  const slot = slotOnClock(overall, config, ownership);
  const label = `${round}.${String(slot).padStart(2, '0')}`;
  if (session.status === 'in_progress' && slot === session.yourPick) {
    return `${label} You`;
  }
  return label;
}

export interface LobbyStats {
  mocksCompleted30d: number;
  mocksSparkline: number[];
  avgFinish: string;
  avgFinishPct: string;
  draftIq: string;
  draftIqLabel: string;
}

function gradeToIq(grade: string | null): number | null {
  if (!grade) return null;
  const g = grade.toUpperCase().charAt(0);
  if (g === 'A') return 92;
  if (g === 'B') return 82;
  if (g === 'C') return 72;
  if (g === 'D') return 62;
  return null;
}

export function computeLobbyStats(sessions: DraftSessionSummary[]): LobbyStats {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const completed = sessions.filter((s) => s.status === 'completed');
  const completed30d = completed.filter(
    (s) => s.completedAt && now - new Date(s.completedAt).getTime() <= thirtyDays,
  );

  const sparkline = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return completed.filter((s) => {
      const t = s.completedAt ? new Date(s.completedAt).getTime() : new Date(s.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
  });

  const iqScores = completed
    .map((s) => gradeToIq(s.grade))
    .filter((n): n is number => n != null);
  const avgIq =
    iqScores.length > 0
      ? Math.round(iqScores.reduce((a, b) => a + b, 0) / iqScores.length)
      : null;

  return {
    mocksCompleted30d: completed30d.length,
    mocksSparkline: sparkline,
    avgFinish: '—',
    avgFinishPct: '—',
    draftIq: avgIq != null ? String(avgIq) : '—',
    draftIqLabel: avgIq != null && avgIq >= 88 ? 'Elite Drafter' : avgIq != null ? 'Solid Drafter' : '—',
  };
}

export interface PopularFormat {
  label: string;
  teams: number;
  rounds: number;
  format: string;
}

export function computePopularFormat(sessions: DraftSessionSummary[]): PopularFormat | null {
  if (sessions.length === 0) return null;
  const key = (s: DraftSessionSummary) =>
    `${s.draftType}|${s.teams}|${s.rounds}|${s.superflex}`;
  const counts = new Map<string, { count: number; sample: DraftSessionSummary }>();
  for (const s of sessions) {
    const k = key(s);
    const prev = counts.get(k);
    if (prev) prev.count += 1;
    else counts.set(k, { count: 1, sample: s });
  }
  let best: { count: number; sample: DraftSessionSummary } | null = null;
  for (const v of Array.from(counts.values())) {
    if (!best || v.count > best.count) best = v;
  }
  if (!best) return null;
  const s = best.sample;
  const typeLabel = s.draftType === 'startup' ? 'Startup' : s.draftType === 'rookie' ? 'Rookie' : 'Mock';
  return {
    label: `${typeLabel} · ${s.teams} Teams · ${s.rounds} Rounds · ${formatDraftFormat(s)}`,
    teams: s.teams,
    rounds: s.rounds,
    format: formatDraftFormat(s),
  };
}
