'use client';

import { useEffect, useState } from 'react';
import type { LiveSignalItem } from '@/lib/public/liveSignal';

const ROTATE_MS = 4000;

export default function LiveSignalCard() {
  const [signals, setSignals] = useState<LiveSignalItem[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/live-signal')
      .then((r) => r.json())
      .then((data: { signals?: LiveSignalItem[] }) => {
        if (!cancelled && Array.isArray(data.signals) && data.signals.length > 0) {
          setSignals(data.signals);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (signals.length <= 1) return undefined;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % signals.length);
        setVisible(true);
      }, 350);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [signals.length]);

  if (signals.length === 0) return null;

  const signal = signals[index]!;

  return (
    <div
      className="mb-4 w-full max-w-[360px] rounded-lg border border-white/10 px-4 py-3 transition-opacity duration-300"
      style={{
        background: 'rgba(15,20,32,0.45)',
        backdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-boom">
          {signal.signalType}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-boom/70">
          Live Signal
        </span>
      </div>
      <div className="mt-2 font-figtree text-[16px] text-text">{signal.playerName}</div>
      <div className="mt-1 font-mono text-[11px] text-muted">
        Market Rank: {signal.marketRankLabel} · BOB Rank: {signal.bobRankLabel}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-boom">
        Gap: {signal.gapSpots} spot{signal.gapSpots === 1 ? '' : 's'}
      </div>
    </div>
  );
}
