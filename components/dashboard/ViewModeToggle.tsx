'use client';

import PulsingDot from '@/components/ui/PulsingDot';

export type DashboardViewMode = 'global' | 'league';

interface ViewModeToggleProps {
  mode: DashboardViewMode;
  onChange: (mode: DashboardViewMode) => void;
  leagueName?: string;
}

export default function ViewModeToggle({ mode, onChange, leagueName }: ViewModeToggleProps) {
  const isGlobal = mode === 'global';

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-[7px] border border-[#1e2640] bg-[#0f1420] p-0.5">
        <button
          type="button"
          onClick={() => onChange('global')}
          className={`rounded-[5px] px-3 py-1.5 font-figtree text-[12px] font-semibold transition-all ${
            isGlobal
              ? 'bg-boom text-[#0a0d14] shadow-[0_0_12px_rgba(54,231,161,0.45)]'
              : 'bg-surface text-muted hover:text-[#e8ecf4]'
          }`}
        >
          Global View
        </button>
        <button
          type="button"
          onClick={() => onChange('league')}
          className={`rounded-[5px] px-3 py-1.5 font-figtree text-[12px] font-semibold transition-all ${
            !isGlobal
              ? 'bg-boom text-[#0a0d14] shadow-[0_0_12px_rgba(54,231,161,0.45)]'
              : 'bg-surface text-muted hover:text-[#e8ecf4]'
          }`}
        >
          League View
        </button>
      </div>
      <p
        className={`flex items-center gap-1.5 font-mono text-[10px] ${isGlobal ? 'text-boom/80' : 'text-[#A78BFA]'}`}
      >
        <PulsingDot color={isGlobal ? '#36E7A1' : '#A78BFA'} size={6} />
        {isGlobal
          ? 'Portfolio command center — cross-league priorities'
          : `League war room${leagueName ? ` · ${leagueName}` : ''}`}
        <span className="ml-2 text-[#6b7a99]">G · L · /</span>
      </p>
    </div>
  );
}
