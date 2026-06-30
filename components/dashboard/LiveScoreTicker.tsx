'use client';

import { useEffect, useId, useState } from 'react';

interface ScoreEvent {
  id: string;
  text: string;
  isLive: boolean;
  isFinal: boolean;
}

interface ScoresResponse {
  inSeason: boolean;
  events: ScoreEvent[];
}

export default function LiveScoreTicker({ inSeason }: { inSeason: boolean }) {
  const rawId = useId();
  const animName = `bobscores${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [active, setActive] = useState(inSeason);

  useEffect(() => {
    if (!inSeason) {
      setActive(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/scores');
        if (!res.ok) return;
        const data = (await res.json()) as ScoresResponse;
        setActive(data.inSeason);
        setEvents(data.events ?? []);
      } catch {
        /* silent */
      }
    };

    load();
    const day = new Date().getDay();
    const isGameDay = day === 0 || day === 1 || day === 4;
    if (!isGameDay) return;
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [inSeason]);

  if (!active || events.length === 0) return null;

  const doubled = [...events, ...events];

  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-[#1e2640] bg-[#080d14]"
      style={{ height: 28 }}
    >
      <div
        className="flex h-full w-max items-center whitespace-nowrap"
        style={{ animation: `${animName} ${Math.max(30, events.length * 8)}s linear infinite` }}
      >
        {doubled.map((ev, i) => (
          <span key={`${ev.id}-${i}`} className="mx-6 inline-flex items-center gap-2 font-mono text-[11px]">
            {ev.isLive && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-boom" />
            )}
            <span
              className={ev.isFinal ? 'text-muted' : 'text-text'}
              dangerouslySetInnerHTML={{ __html: ev.text }}
            />
            <span className="text-muted/40">|</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ${animName} { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
