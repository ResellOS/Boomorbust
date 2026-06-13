'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deriveRadarVals, getTier } from '@/lib/verdict';
import type { RotationPlayer } from '@/lib/dashboard/rotation';
import PlayerCard from './PlayerCard';

const VISIBLE = 5;
const ROTATE_MS = 8000;

interface PlayerCardCarouselProps {
  players: RotationPlayer[];
  /** When true, show top 5 only — no rotation. */
  staticMode?: boolean;
}

export default function PlayerCardCarousel({ players, staticMode = false }: PlayerCardCarouselProps) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sliding, setSliding] = useState(false);

  const sorted = players;
  const canRotate = !staticMode && sorted.length > VISIBLE;

  useEffect(() => {
    if (!canRotate || paused) return;
    const iv = setInterval(() => {
      setSliding(true);
      setTimeout(() => {
        setOffset((o) => (o + 1) % sorted.length);
        setSliding(false);
      }, 280);
    }, ROTATE_MS);
    return () => clearInterval(iv);
  }, [canRotate, paused, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-[9px] border border-border bg-surface font-mono text-[12px] text-muted">
        No rostered players synced yet — run a league sync to populate your board.
      </div>
    );
  }

  const visible = staticMode
    ? sorted.slice(0, VISIBLE)
    : Array.from({ length: Math.min(VISIBLE, sorted.length) }, (_, i) => sorted[(offset + i) % sorted.length]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-figtree text-[12px] font-semibold uppercase tracking-[1.5px] text-text">
          {staticMode ? 'Portfolio Boom/Bust Players' : 'League Boom/Bust Players'}
        </span>
        <Link href="/players" className="font-mono text-[10px] text-boom no-underline">
          View All Players →
        </Link>
      </div>
      <div
        className="flex gap-2 overflow-hidden pb-1 transition-transform duration-300 ease-out"
        style={{ transform: sliding ? 'translateX(-8px)' : 'translateX(0)' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {visible.map((p) => (
          <div key={`${p.playerId}-${offset}`} className="w-[185px] shrink-0">
            <PlayerCard
              playerId={p.playerId}
              playerName={p.name}
              position={p.position}
              team={p.team}
              tfoScore={p.tfoScore > 0 ? p.tfoScore : 50}
              radarVals={deriveRadarVals(p.playerId, p.tfoScore > 0 ? p.tfoScore : 50)}
              tier={getTier(p.tfoScore > 0 ? p.tfoScore : 50)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
