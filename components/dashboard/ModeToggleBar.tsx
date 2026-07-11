'use client';

import { useCallback, useRef } from 'react';
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
    'shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[13px] transition-colors';
  const scrollRef = useRef<HTMLDivElement>(null);

  const nudge = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(180, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  const arrowBtn =
    'shrink-0 rounded-[6px] border border-border bg-surface p-1.5 text-muted transition-colors hover:border-boom/40 hover:text-boom';

  return (
    <div className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={() => nudge(-1)}
        className={arrowBtn}
        aria-label="Scroll league bar left"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
              ? 'border-boom bg-boom text-[#0a0d14] shadow-[0_0_12px_rgba(54,231,161,0.45)]'
              : 'border-[#1e2640] bg-surface text-muted hover:text-text'
          }`}
        >
          ALL
        </button>

        {leagues.length > 0 && <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />}

        {leagues.map((lg) => {
          const active = mode === lg.id;
          const meta = LEAGUE_STATUS[lg.status];
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => onSelect(lg.id)}
              title={`${lg.name} · ${meta.label}`}
              className={`${baseBtn} flex items-center gap-1.5 transition-all ${
                active ? 'font-semibold text-white' : 'border-[#1e2640] bg-surface text-muted hover:text-text'
              }`}
              style={
                active
                  ? {
                      borderColor: '#36E7A1',
                      background: 'transparent',
                      color: '#ffffff',
                      boxShadow: '0 0 12px rgba(54,231,161,0.45)',
                    }
                  : undefined
              }
            >
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{
                  background: meta.color,
                  boxShadow: active ? `0 0 6px ${meta.color}` : undefined,
                }}
              />
              <span className="max-w-[100px] truncate">{lg.name}</span>
              {active ? (
                <span
                  className="shrink-0 rounded px-1 py-0.5 font-mono text-[8px] uppercase tracking-wide"
                  style={{ color: meta.color, background: `${meta.color}18` }}
                >
                  {meta.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => nudge(1)}
        className={arrowBtn}
        aria-label="Scroll league bar right"
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
