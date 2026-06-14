'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  COMPONENT_AXIS_LABELS,
  deriveRadarVals,
  getTier,
  hasRealComponents,
  radarValsFromComponents,
} from '@/lib/verdict';
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

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const scoreA = a.tfoScore > 0 ? a.tfoScore : 0;
        const scoreB = b.tfoScore > 0 ? b.tfoScore : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      }),
    [players],
  );
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
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-figtree text-[12px] font-semibold uppercase tracking-[1.5px] text-text">
          {staticMode ? 'Portfolio Boom/Bust Players' : 'League Boom/Bust Players'}
        </span>
        <Link href="/players" className="font-mono text-[10px] text-boom no-underline">
          View All Players →
        </Link>
      </div>
      <div
        className="flex w-full gap-2 transition-transform duration-300 ease-out"
        style={{ transform: sliding ? 'translateX(-4px)' : 'translateX(0)' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {visible.map((p) => {
          // Prefer the engine's real component scores (OPS/SFS/YOY/SIT/PPG) for
          // genuine radar variation; fall back to the tfo-derived shape only when
          // a player has no scored components.
          const useReal = p.components != null && hasRealComponents(p.components);
          const radarVals = useReal
            ? radarValsFromComponents(p.components!)
            : deriveRadarVals(p.playerId, p.tfoScore > 0 ? p.tfoScore : 50);
          return (
            <div key={`${p.playerId}-${offset}`} className="min-w-[160px] flex-[1_1_0]">
              <PlayerCard
                playerId={p.playerId}
                playerName={p.name}
                position={p.position}
                team={p.team}
                tfoScore={p.tfoScore > 0 ? p.tfoScore : 50}
                radarVals={radarVals}
                tier={getTier(p.tfoScore > 0 ? p.tfoScore : 50)}
                axisLabels={useReal ? COMPONENT_AXIS_LABELS : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
