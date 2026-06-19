'use client';



import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { Check, ChevronRight, X } from 'lucide-react';

import PlayerAvatar from '@/components/players/PlayerAvatar';

import type { DailyTask, UrgencyLevel } from '@/lib/dashboard/dailyTasks';

import type { LineupOpportunity } from '@/lib/dashboard/rotation';

import {

  buildMissionCards,

  MISSION_GLOW_STYLES,

  type MissionCardModel,

} from '@/lib/dashboard/missionTasks';



const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; text: string; label: string }> = {

  HIGH: { bg: 'rgba(239,68,68,0.18)', text: '#EF4444', label: 'HIGH' },

  MED: { bg: 'rgba(251,191,36,0.18)', text: '#FBBF24', label: 'MEDIUM' },

  LOW: { bg: 'rgba(100,116,139,0.18)', text: '#64748B', label: 'LOW' },

};



function MissionCard({

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

    <article

      className="flex min-h-[240px] flex-col rounded-[10px] border bg-[#0f1420] p-4"

      style={{ borderColor: glow.border, boxShadow: glow.shadow }}

    >

      <div className="flex gap-3">

        {card.playerId ? (

          <PlayerAvatar playerId={card.playerId} name={card.playerName ?? card.title} size={52} />

        ) : (

          <div className="h-[52px] w-[52px] shrink-0 rounded-full bg-[#141929]" />

        )}



        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-1.5">

            {card.position ? (

              <span className="rounded bg-[#141929] px-1.5 py-0.5 font-mono text-[8px] uppercase text-muted">

                {card.position}

              </span>

            ) : null}

            {card.marketRank != null ? (

              <span className="font-mono text-[8px] text-muted">

                Market <span className="text-text">{card.marketRank}</span>

              </span>

            ) : null}

            {card.bobRank != null ? (

              <span className="font-mono text-[8px] text-muted">

                BOB <span className="text-boom">{card.bobRank}</span>

              </span>

            ) : null}

          </div>



          <div className="mt-2 flex flex-wrap items-center gap-2">

            <span className="font-mono text-[8px] uppercase tracking-[1.2px] text-muted">

              Priority #{card.priority}

            </span>

            <span

              className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wide"

              style={{

                background: URGENCY_STYLES[card.urgency].bg,

                color: URGENCY_STYLES[card.urgency].text,

              }}

            >

              {URGENCY_STYLES[card.urgency].label}

            </span>

          </div>



          <h3 className="mt-1.5 font-figtree text-[16px] font-semibold leading-snug text-[#e8ecf4]">

            {card.title}

          </h3>

          <p className="mt-0.5 font-mono text-[9px] text-muted">{card.leagueName}</p>

          {card.targetManager ? (

            <p className="font-mono text-[8px] text-muted/80">vs {card.targetManager}</p>

          ) : null}

        </div>



        {card.taskId ? (

          <div className="flex shrink-0 flex-col gap-1">

            <button

              type="button"

              disabled={busy}

              onClick={() => onComplete(card.taskId!)}

              className="flex h-7 w-7 items-center justify-center rounded border border-boom/25 bg-boom/10 text-boom disabled:opacity-50"

              aria-label="Mark complete"

            >

              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />

            </button>

            <button

              type="button"

              disabled={busy}

              onClick={() => onDismiss(card.taskId!)}

              className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-muted hover:text-text disabled:opacity-50"

              aria-label="Dismiss"

            >

              <X className="h-3.5 w-3.5" strokeWidth={2} />

            </button>

          </div>

        ) : null}

      </div>



      <p className="mt-3 flex-1 font-figtree text-[11px] leading-relaxed text-[#6b7a99]">

        {card.reasonLine}

      </p>



      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#1e2640]/80 pt-3">

        {card.metrics.slice(0, 3).map((m) => (

          <div key={m.label}>

            <div className="font-mono text-[7px] uppercase tracking-wide text-muted">{m.label}</div>

            <div className="font-mono text-[11px] tabular-nums text-[#e8ecf4]">{m.value}</div>

          </div>

        ))}

      </div>



      <Link

        href={card.ctaHref}

        className={`mt-3 flex w-full items-center justify-center rounded-md px-3 py-2.5 font-figtree text-[11px] font-semibold no-underline ${glow.cta}`}

      >

        {card.ctaLabel}

      </Link>

    </article>

  );

}



export default function FrontOfficeCommandCenter({

  initialTasks,

  lineupOpportunity,

}: {

  initialTasks: DailyTask[];

  lineupOpportunity: LineupOpportunity | null;

}) {

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



  return (

    <section className="relative z-10 shrink-0">

      <div className="mb-3 flex items-end justify-between gap-2 px-0.5">

        <div>

          <h2 className="font-figtree text-[11px] font-normal uppercase tracking-[1.8px] text-[#e8ecf4]">

            Front Office Command Center

          </h2>

          <p className="font-mono text-[9px] text-[#6b7a99]">Highest-value moves today</p>

        </div>

        <Link

          href="/trade"

          className="flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline hover:underline"

        >

          View All Tasks

          <ChevronRight className="h-3 w-3" />

        </Link>

      </div>



      {missions.length === 0 ? (

        <div className="rounded-[10px] border border-dashed border-[#1e2640] bg-[#0f1420] px-4 py-8 text-center">

          <p className="font-figtree text-[12px] leading-relaxed text-[#6b7a99]">

            BOB is analyzing your leagues. Mission cards appear here once League Intelligence data

            is ready.

          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

          {missions.map((card) => (

            <MissionCard

              key={card.id}

              card={card}

              busy={busyId === card.taskId}

              onComplete={(id) => void updateStatus(id, 'completed')}

              onDismiss={(id) => void updateStatus(id, 'dismissed')}

            />

          ))}

        </div>

      )}

    </section>

  );

}


