'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RotationPlayer } from '@/lib/dashboard/rotation';
import { TICKER_ROTATE_MS } from '@/lib/dashboard/constants';
import { sortByMarketSignal } from '@/lib/dashboard/sortPlayers';
import { buildTickerDisplay } from '@/lib/dashboard/tickerSignal';

interface PlayerTickerProps {
  players: RotationPlayer[];
  animated: boolean;
}

function TickerCard({ p }: { p: RotationPlayer }) {
  const { name, arrow, color, delta, reason } = buildTickerDisplay(p);

  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-[14px] font-bold tabular-nums" style={{ color }}>
          {arrow}
        </span>
        <span className="min-w-0 truncate font-figtree text-[13px] font-semibold text-text">{name}</span>
        <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums" style={{ color }}>
          {delta}
        </span>
      </div>
      <p className="truncate pl-[22px] font-mono text-[11px] leading-snug text-[#64748B]">{reason}</p>
    </div>
  );
}

export default function PlayerTicker({ players, animated }: PlayerTickerProps) {
  const sorted = useMemo(() => sortByMarketSignal(players), [players]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [sorted]);

  useEffect(() => {
    if (!animated || sorted.length <= 1) return;
    const iv = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % sorted.length);
        setFade(false);
      }, 220);
    }, TICKER_ROTATE_MS);
    return () => clearInterval(iv);
  }, [animated, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="flex h-[46px] items-center rounded-[7px] border border-border bg-surface px-3 font-mono text-[12px] text-muted">
        No rostered players in this league yet.
      </div>
    );
  }

  const current = sorted[index % sorted.length];

  if (!animated) {
    return (
      <div className="overflow-hidden rounded-[7px] border border-border bg-surface px-3 py-2">
        <div className="flex flex-col gap-2">
          {sorted.slice(0, 5).map((p) => (
            <TickerCard key={p.playerId} p={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[7px] border border-border bg-surface px-3 py-2">
      <div
        className="transition-opacity duration-200"
        style={{ opacity: fade ? 0 : 1 }}
      >
        <TickerCard p={current} />
      </div>
    </div>
  );
}
