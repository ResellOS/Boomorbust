'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Eye, X } from 'lucide-react';
import {
  acceptancePillStyle,
  isReviewTaskData,
  isTradeTaskData,
  urgencyFromScore,
  type DailyTask,
  type UrgencyLevel,
} from '@/lib/dashboard/dailyTasks';
import { truncateFeedHeadline as truncateReason } from '@/lib/dashboard/opportunityFeed';

const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'rgba(239,68,68,0.18)', text: '#EF4444', label: 'HIGH' },
  MED: { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24', label: 'MEDIUM' },
  LOW: { bg: 'rgba(100,116,139,0.18)', text: '#64748B', label: 'LOW' },
};

function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const style = URGENCY_STYLES[level];
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.8px]"
      style={{ background: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function TaskActions({
  taskId,
  busy,
  onComplete,
  onDismiss,
}: {
  taskId: string;
  busy: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onComplete}
        className="flex h-7 w-7 items-center justify-center rounded border border-boom/30 bg-boom/10 text-boom hover:bg-boom/20 disabled:opacity-50"
        aria-label={`Mark task ${taskId} complete`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDismiss}
        className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-muted hover:text-text disabled:opacity-50"
        aria-label={`Dismiss task ${taskId}`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function TradeTaskCard({
  task,
  onComplete,
  onDismiss,
  busy,
}: {
  task: DailyTask;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  busy: string | null;
}) {
  const d = isTradeTaskData(task.taskData) ? task.taskData : null;
  if (!d) return null;
  const acceptStyle = acceptancePillStyle(d.acceptance_probability);
  const urgency = urgencyFromScore(task.urgencyScore);
  const isBusy = busy === task.id;

  return (
    <div
      className="rounded-[10px] border border-border bg-[#0f1420] px-3.5 py-3"
      style={{ borderLeft: '4px solid #36E7A1' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-boom" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="font-figtree text-[14px] leading-snug text-text">
              Offer {d.give_player_name} for {d.get_player_name}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
              {d.league_name} · {d.target_manager_name}
            </p>
          </div>
        </div>
        <UrgencyBadge level={urgency} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
        <span
          className="rounded px-2 py-0.5 font-mono text-[9px] tabular-nums"
          style={{ background: acceptStyle.bg, color: acceptStyle.text }}
        >
          {Math.round(d.acceptance_probability)}% acceptance
        </span>
      </div>

      {d.reason ? (
        <p className="mt-2 line-clamp-2 pl-6 font-figtree text-[11px] text-muted">
          {truncateReason(d.reason, 120)}
        </p>
      ) : null}

      <div className="mt-2.5 flex justify-end pl-6">
        <TaskActions
          taskId={task.id}
          busy={isBusy}
          onComplete={() => onComplete(task.id)}
          onDismiss={() => onDismiss(task.id)}
        />
      </div>
    </div>
  );
}

function ReviewTaskCard({
  task,
  onComplete,
  onDismiss,
  busy,
}: {
  task: DailyTask;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  busy: string | null;
}) {
  const d = isReviewTaskData(task.taskData) ? task.taskData : null;
  if (!d) return null;
  const urgency = urgencyFromScore(task.urgencyScore);
  const isBusy = busy === task.id;
  const verdictLabel = (d.verdict ?? 'BUST').toUpperCase();

  return (
    <div
      className="rounded-[10px] border border-border bg-[#0f1420] px-3.5 py-3"
      style={{ borderLeft: '4px solid #A78BFA' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-bust" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="font-figtree text-[14px] leading-snug text-text">
              Consider selling {d.player_name}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{d.league_name}</p>
          </div>
        </div>
        <UrgencyBadge level={urgency} />
      </div>

      <div className="mt-2 pl-6">
        <span
          className="rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
          style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
        >
          {verdictLabel}
        </span>
      </div>

      {d.reason ? (
        <p className="mt-2 line-clamp-2 pl-6 font-figtree text-[11px] text-muted">
          {truncateReason(d.reason, 120)}
        </p>
      ) : null}

      <div className="mt-2.5 flex justify-end pl-6">
        <TaskActions
          taskId={task.id}
          busy={isBusy}
          onComplete={() => onComplete(task.id)}
          onDismiss={() => onDismiss(task.id)}
        />
      </div>
    </div>
  );
}

function GenericTaskCard({
  task,
  onComplete,
  onDismiss,
  busy,
}: {
  task: DailyTask;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  busy: string | null;
}) {
  const urgency = urgencyFromScore(task.urgencyScore);
  const isBusy = busy === task.id;

  return (
    <div
      className="rounded-[10px] border border-border bg-[#0f1420] px-3.5 py-3"
      style={{ borderLeft: '4px solid #64748B' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-figtree text-[14px] text-text">{task.taskType} task</p>
        <UrgencyBadge level={urgency} />
      </div>
      <div className="mt-2.5 flex justify-end">
        <TaskActions
          taskId={task.id}
          busy={isBusy}
          onComplete={() => onComplete(task.id)}
          onDismiss={() => onDismiss(task.id)}
        />
      </div>
    </div>
  );
}

function TaskCard({
  task,
  busy,
  onComplete,
  onDismiss,
}: {
  task: DailyTask;
  busy: string | null;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (task.taskType === 'TRADE' && isTradeTaskData(task.taskData)) {
    return (
      <TradeTaskCard task={task} busy={busy} onComplete={onComplete} onDismiss={onDismiss} />
    );
  }
  if (task.taskType === 'REVIEW' && isReviewTaskData(task.taskData)) {
    return (
      <ReviewTaskCard task={task} busy={busy} onComplete={onComplete} onDismiss={onDismiss} />
    );
  }
  return <GenericTaskCard task={task} busy={busy} onComplete={onComplete} onDismiss={onDismiss} />;
}

export default function FrontOfficeTasks({ initialTasks }: { initialTasks: DailyTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    }
  }, []);

  const visibleTasks = tasks;

  return (
    <section className="relative z-10 flex shrink-0 flex-col gap-[9px]">
      <div className="px-0.5">
        <span className="font-figtree text-[10px] font-normal uppercase tracking-[1.5px] text-text">
          Front Office Tasks
        </span>
        <p className="font-mono text-[9px] text-muted">Highest-value moves today</p>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-[#0f1420] px-4 py-6 text-center">
          <p className="font-figtree text-[12px] leading-relaxed text-muted">
            BOB is analyzing your leagues. Front Office Tasks appear here once League Intelligence
            data is ready.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyId}
              onComplete={(id) => void updateStatus(id, 'completed')}
              onDismiss={(id) => void updateStatus(id, 'dismissed')}
            />
          ))}
        </div>
      )}
    </section>
  );
}
