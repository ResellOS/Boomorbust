'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, X } from 'lucide-react';
import {
  buildMissionCards,
  MISSION_GLOW_STYLES,
  type MissionCardModel,
} from '@/lib/dashboard/missionTasks';
import { stagedTradeMissionCards } from '@/lib/dashboard/stagedTradesQueue';
import { tradeStageHref } from '@/lib/dashboard/dashboardRoutes';
import type { DailyTask, UrgencyLevel } from '@/lib/dashboard/dailyTasks';
import type { LineupOpportunity } from '@/lib/dashboard/rotation';

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  HIGH: 'High Impact',
  MED: 'Medium Impact',
  LOW: 'Low Cost',
};

function stageOfferHref(card: MissionCardModel): string {
  if (card.playerId && card.ctaHref.includes('league=')) return card.ctaHref;
  if (card.playerId) return tradeStageHref(card.playerId);
  return '/trade';
}

function TaskRow({
  card,
  busy,
  exiting,
  onComplete,
  onDismiss,
  onStage,
  onOpen,
}: {
  card: MissionCardModel;
  busy: boolean;
  exiting: boolean;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onStage: (card: MissionCardModel) => void;
  onOpen: (card: MissionCardModel) => void;
}) {
  const glow = MISSION_GLOW_STYLES[card.glow];
  const isTrade = card.glow === 'buy' || card.glow === 'sell';
  const glowClass =
    card.urgency === 'HIGH' && card.glow === 'buy'
      ? 'dash-boom-glow'
      : card.glow === 'sell'
        ? 'dash-bust-glow'
        : '';

  return (
    <div
      className={`flex flex-col gap-2 border-b border-[#1e2640]/50 px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3 dash-clickable-row ${exiting ? 'dash-task-exit' : ''} ${glowClass}`}
      style={{ borderLeftWidth: 2, borderLeftColor: glow.border }}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(card);
      }}
      role="button"
      tabIndex={0}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold text-[#0a0d14] sm:mt-0"
        style={{ background: glow.accent }}
      >
        {card.priority}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-figtree text-[12px] font-medium leading-snug text-[#e8ecf4]">{card.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[8px] text-[#8b9bb8]">{card.leagueName}</span>
          <span className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">·</span>
          <span className="font-mono text-[7px] uppercase tracking-wide" style={{ color: glow.accent }}>
            {URGENCY_LABEL[card.urgency]}
          </span>
          <span className="font-figtree text-[10px] leading-snug text-[#9aa8c4]">{card.reasonLine}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:pl-0" onClick={(e) => e.stopPropagation()}>
        {isTrade ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStage(card)}
            className="dash-action-btn dash-action-btn-bust rounded border border-bust/40 bg-bust/15 px-2 py-1 font-mono text-[8px] uppercase text-bust disabled:opacity-50"
          >
            Stage Offer
          </button>
        ) : null}
        <Link
          href={card.ctaHref}
          className="dash-action-btn rounded border border-[#1e2640] px-2 py-1 font-mono text-[8px] text-boom no-underline"
        >
          View Details
        </Link>
        {card.taskId ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onComplete(card.taskId!)}
              className="dash-action-btn rounded border border-boom/25 bg-boom/10 px-2 py-1 font-mono text-[8px] text-boom disabled:opacity-50"
            >
              Complete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDismiss(card.taskId!)}
              className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#6b7a99] hover:text-[#e8ecf4] disabled:opacity-50"
              aria-label="Dismiss"
              title="Dismiss"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function FrontOfficeTasks({
  initialTasks,
  lineupOpportunity,
}: {
  initialTasks: DailyTask[];
  lineupOpportunity: LineupOpportunity | null;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [stagedCount, setStagedCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refreshStaged = () => setStagedCount(stagedTradeMissionCards(10).length);
    refreshStaged();
    window.addEventListener('bob:command-queue-updated', refreshStaged);
    return () => window.removeEventListener('bob:command-queue-updated', refreshStaged);
  }, []);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (initialTasks.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dashboard/tasks', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { tasks?: DailyTask[] };
        if (json.tasks?.length && !cancelled) setTasks(json.tasks);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialTasks.length]);

  const handleStage = useCallback(
    (card: MissionCardModel) => {
      router.push(stageOfferHref(card));
    },
    [router],
  );

  const handleOpen = useCallback(
    (card: MissionCardModel) => {
      router.push(card.ctaHref);
    },
    [router],
  );

  const updateStatus = useCallback(async (id: string, status: 'completed' | 'dismissed') => {
    let removed: DailyTask | undefined;
    setTasks((prev) => {
      removed = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('update failed');
    } catch {
      if (removed) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === removed!.id)) return prev;
          return [...prev, removed!].sort((a, b) => b.taskScore - a.taskScore);
        });
      }
    } finally {
      setBusyId(null);
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const animateThenUpdate = useCallback(
    (id: string, status: 'completed' | 'dismissed') => {
      setExitingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => void updateStatus(id, status), 260);
    },
    [updateStatus],
  );

  const missions = useMemo(() => {
    const staged = stagedTradeMissionCards(3);
    const fromTasks = buildMissionCards(tasks, lineupOpportunity, Math.max(0, 3 - staged.length));
    return [...staged, ...fromTasks].slice(0, 3);
  }, [tasks, lineupOpportunity, stagedCount]);

  return (
    <section className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3 py-2">
        <div>
          <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">Command Queue</h3>
          <p className="font-mono text-[8px] text-[#8b9bb8]">Next 3 moves after top priority</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] tabular-nums text-boom">{missions.length}</span>
          <Link
            href="/trade"
            className="dash-action-btn flex items-center gap-0.5 font-mono text-[8px] text-boom no-underline"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      {missions.length === 0 ? (
        <p className="px-3 py-3 font-mono text-[10px] text-[#6b7a99]">No tasks queued — you&apos;re caught up.</p>
      ) : (
        missions.map((card) => (
          <TaskRow
            key={card.id}
            card={card}
            busy={busyId === card.taskId}
            exiting={card.taskId ? exitingIds.has(card.taskId) : false}
            onComplete={(id) => animateThenUpdate(id, 'completed')}
            onDismiss={(id) => animateThenUpdate(id, 'dismissed')}
            onStage={handleStage}
            onOpen={handleOpen}
          />
        ))
      )}
    </section>
  );
}
