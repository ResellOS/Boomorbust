'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, X } from 'lucide-react';
import {
  buildMissionCards,
  MISSION_GLOW_STYLES,
  type MissionCardModel,
} from '@/lib/dashboard/missionTasks';
import type { DailyTask, UrgencyLevel } from '@/lib/dashboard/dailyTasks';
import type { LineupOpportunity } from '@/lib/dashboard/rotation';

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  HIGH: 'High Impact',
  MED: 'Medium Impact',
  LOW: 'Low Cost',
};

interface FrontOfficeTasksProps {
  initialTasks: DailyTask[];
  lineupOpportunity: LineupOpportunity | null;
  compact?: boolean;
}

function CompactTaskRow({
  card,
  busy,
  onComplete,
  onDismiss,
}: {
  card: MissionCardModel;
  busy: boolean;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const glow = MISSION_GLOW_STYLES[card.glow];

  return (
    <div
      className="flex items-start gap-2.5 border-b border-[#1e2640]/50 px-3 py-2.5 last:border-b-0"
      style={{ borderLeftWidth: 2, borderLeftColor: glow.border }}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold text-[#0a0d14]"
        style={{ background: glow.accent }}
      >
        {card.priority}
      </span>
      <div className="min-w-0 flex-1">
        <Link href={card.ctaHref} className="font-figtree text-[12px] font-medium text-[#e8ecf4] no-underline hover:text-boom">
          {card.title}
        </Link>
        <p className="font-mono text-[8px] text-[#6b7a99]">{card.leagueName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">
            {URGENCY_LABEL[card.urgency]}
          </span>
          <span className="font-figtree text-[10px] text-[#6b7a99]">{card.reasonLine}</span>
        </div>
      </div>
      {card.taskId ? (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onComplete(card.taskId!)}
            className="flex h-6 w-6 items-center justify-center rounded border border-boom/25 bg-boom/10 text-boom disabled:opacity-50"
            aria-label="Complete"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDismiss(card.taskId!)}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-muted hover:text-text disabled:opacity-50"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <Link href={card.ctaHref} className="shrink-0 font-mono text-[8px] text-boom no-underline hover:underline">
          Go →
        </Link>
      )}
    </div>
  );
}

export default function FrontOfficeTasks({
  initialTasks,
  lineupOpportunity,
  compact = false,
}: FrontOfficeTasksProps) {
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

  const missions = buildMissionCards(tasks, lineupOpportunity, 3);

  const body =
    missions.length === 0 ? (
      <p className="px-3 py-4 font-mono text-[10px] text-[#6b7a99]">No tasks queued — you&apos;re caught up.</p>
    ) : (
      missions.map((card) => (
        <CompactTaskRow
          key={card.id}
          card={card}
          busy={busyId === card.taskId}
          onComplete={(id) => void updateStatus(id, 'completed')}
          onDismiss={(id) => void updateStatus(id, 'dismissed')}
        />
      ))
    );

  if (compact) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
        <div className="border-b border-[#1e2640]/80 px-3 py-2">
          <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
            Front Office Tasks
          </span>
          <span className="ml-2 font-mono text-[9px] tabular-nums text-boom">{missions.length}</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3.5 py-2.5">
        <div>
          <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">Front Office Tasks</h3>
          <p className="font-mono text-[8px] text-[#6b7a99]">Supporting priorities</p>
        </div>
        <Link href="/trade" className="flex items-center gap-0.5 font-mono text-[8px] text-boom no-underline hover:underline">
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {body}
    </section>
  );
}
