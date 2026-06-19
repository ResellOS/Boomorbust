'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  deriveRadarVals,
  getTier,
  hasRealComponents,
  radarValsFromComponents,
} from '@/lib/verdict';
import { COMPONENT_UI_LABELS } from '@/lib/ui/labels';
import type { RotationPlayer } from '@/lib/dashboard/rotation';
import PlayerCard from './PlayerCard';

import { PLAYER_CARD_ROTATE_MS } from '@/lib/dashboard/constants';
import { sortByMarketSignal } from '@/lib/dashboard/sortPlayers';

const VISIBLE = 5;

interface PlayerCardCarouselProps {
  players: RotationPlayer[];
  /** When true, show top 5 only — no rotation. */
  staticMode?: boolean;
}

export default function PlayerCardCarousel({ players, staticMode = false }: PlayerCardCarouselProps) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sorted = useMemo(() => sortByMarketSignal(players), [players]);
  const canRotate = !staticMode && !isMobile && sorted.length > VISIBLE;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!canRotate || paused) return;
    const iv = setInterval(() => {
      setSliding(true);
      setTimeout(() => {
        setOffset((o) => (o + 1) % sorted.length);
        setSliding(false);
      }, 280);
    }, PLAYER_CARD_ROTATE_MS);
    return () => clearInterval(iv);
  }, [canRotate, paused, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-[9px] border border-border bg-surface font-mono text-[12px] text-muted">
        No rostered players synced yet — run a league sync to populate your board.
      </div>
    );
  }

  const visible = isMobile
    ? sorted.slice(0, Math.min(sorted.length, 12))
    : staticMode
      ? sorted.slice(0, VISIBLE)
      : Array.from({ length: Math.min(VISIBLE, sorted.length) }, (_, i) => sorted[(offset + i) % sorted.length]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-figtree text-[12px] font-semibold uppercase tracking-[1.5px] text-text">
          MARKET SIGNALS
        </span>
        <Link href="/players" className="font-mono text-[10px] text-boom no-underline">
          View All Players →
        </Link>
      </div>
      <div
        className={`flex gap-2 pb-1 ${
          isMobile
            ? 'overflow-x-auto scrollbar-hide snap-x snap-mandatory'
            : 'w-full transition-transform duration-300 ease-out'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          transform: !isMobile && sliding ? 'translateX(-4px)' : 'translateX(0)',
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {visible.map((p) => {
          const useReal = p.components != null && hasRealComponents(p.components);
          const radarVals = useReal
            ? radarValsFromComponents(p.components!)
            : deriveRadarVals(p.playerId, p.tfoScore > 0 ? p.tfoScore : 50);
          return (
            <div
              key={`${p.playerId}-${isMobile ? 'm' : offset}`}
              className={
                isMobile
                  ? 'w-[calc(100vw-2.5rem)] max-w-[280px] shrink-0 snap-start'
                  : 'min-w-[160px] flex-[1_1_0]'
              }
            >
              <PlayerCard
                playerId={p.playerId}
                playerName={p.name}
                position={p.position}
                team={p.team}
                tfoScore={p.tfoScore > 0 ? p.tfoScore : 50}
                radarVals={radarVals}
                tier={getTier(p.tfoScore > 0 ? p.tfoScore : 50)}
                axisLabels={useReal ? COMPONENT_UI_LABELS : undefined}
                marketVerdict={p.marketVerdict}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
