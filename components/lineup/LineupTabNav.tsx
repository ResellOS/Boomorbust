'use client';

import type { LineupTabId } from './types';

interface Tab {
  id: LineupTabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'lineup',  label: 'OPTIMIZED LINEUP' },
  { id: 'startsit', label: 'START / SIT ANALYSIS' },
  { id: 'matrix',  label: 'MATCHUP MATRIX' },
  { id: 'weather', label: 'WEATHER IMPACT' },
];

interface Props {
  active: LineupTabId;
  onChange: (id: LineupTabId) => void;
}

export default function LineupTabNav({ active, onChange }: Props) {
  return (
    <div className="flex gap-0 border-b border-white/[0.08] mb-4 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 text-[12px] font-semibold tracking-wider transition-colors whitespace-nowrap"
            style={{
              color: isActive ? '#36E7A1' : '#64748B',
              borderBottom: isActive ? '2px solid #36E7A1' : '2px solid transparent',
              marginBottom: '-1px',
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
