'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { LEAGUE_STATUS, type LeagueBundle } from '@/lib/dashboard/rotation';

export type DashboardMode = 'rotate' | 'all' | string; // string = leagueId

interface ModeToggleBarProps {
  leagues: LeagueBundle[];
  mode: DashboardMode;
  onSelect: (mode: DashboardMode) => void;
}

export default function ModeToggleBar({ leagues, mode, onSelect }: ModeToggleBarProps) {
  const baseBtn =
    'shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[12px] transition-colors';
  const scrollRef = useRef<HTMLDivElement>(null);
  const nudge = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  const arrowBtn =
    'shrink-0 rounded-[6px] border border-border bg-surface p-1.5 text-muted transition-colors hover:text-text';

  return (
    <div className="flex items-center gap-1.5">
      {/* Mode toggles stay pinned so they're always reachable */}
      <button
        type="button"
        onClick={() => onSelect('rotate')}
        className={`${baseBtn} flex items-center gap-1.5 ${
          mode === 'rotate'
            ? 'border-boom bg-boom/15 text-boom'
            : 'border-border bg-surface text-muted hover:text-text'
        }`}
      >
        <RotateCw className="h-3 w-3" strokeWidth={2} />
        ROTATE
      </button>

      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`${baseBtn} ${
          mode === 'all'
            ? 'border-boom bg-boom/15 text-boom'
            : 'border-border bg-surface text-muted hover:text-text'
        }`}
      >
        ALL
      </button>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />

      {leagues.length > 0 && (
        <button type="button" onClick={() => nudge(-240)} className={arrowBtn} aria-label="Scroll leagues left">
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}

      {/* Only the league pills scroll, between the arrows */}
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {leagues.map((lg) => {
          const active = mode === lg.id;
          const color = LEAGUE_STATUS[lg.status].color;
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => onSelect(lg.id)}
              title={lg.name}
              className={`${baseBtn} flex items-center gap-1.5 ${
                active
                  ? 'border-boom bg-boom/15 text-boom'
                  : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: color }} />
              <span className="max-w-[120px] truncate">{lg.name}</span>
            </button>
          );
        })}
      </div>

      {leagues.length > 0 && (
        <button type="button" onClick={() => nudge(240)} className={arrowBtn} aria-label="Scroll leagues right">
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
