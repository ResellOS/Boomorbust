'use client';

import { RotateCw } from 'lucide-react';
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

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <span
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ background: color }}
            />
            <span className="max-w-[120px] truncate">{lg.name}</span>
          </button>
        );
      })}
    </div>
  );
}
