'use client';

import type { ScoutingTabId } from './types';

const TABS: { id: ScoutingTabId; label: string }[] = [
  { id: 'WAIVER_RADAR', label: 'WAIVER RADAR' },
  { id: 'PROCESS_VS_RESULTS', label: 'PROCESS VS RESULTS' },
  { id: 'WR_EFFICIENCY_MATRIX', label: 'WR EFFICIENCY MATRIX' },
  { id: 'HIDDEN_GEMS', label: 'HIDDEN GEMS' },
  { id: 'BREAKOUT_WATCH', label: 'BREAKOUT WATCH' },
  { id: 'DEEP_DIVE', label: 'DEEP DIVE' },
];

interface Props {
  active: ScoutingTabId;
  onChange: (id: ScoutingTabId) => void;
}

export default function ScoutingTabNav({ active, onChange }: Props) {
  return (
    <div
      className="flex w-full gap-0 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mb-4"
      style={{ WebkitOverflowScrolling: 'touch' }}
      role="tablist"
      aria-label="Scouting Terminal sections"
    >
      {TABS.map((t) => {
        const is = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={is}
            onClick={() => onChange(t.id)}
            className="flex-shrink-0 min-h-[44px] px-4 py-3 text-[11px] font-bold tracking-wide transition-colors whitespace-nowrap border-b-2"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              color: is ? '#ffffff' : '#64748B',
              borderBottomColor: is ? '#36E7A1' : 'transparent',
              borderBottomWidth: 2,
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!is) e.currentTarget.style.color = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              if (!is) e.currentTarget.style.color = '#64748B';
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
