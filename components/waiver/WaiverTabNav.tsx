'use client';

import type { WaiverTabId } from './types';

const TABS: { id: WaiverTabId; label: string }[] = [
  { id: 'wire',       label: 'WAIVER WIRE' },
  { id: 'trending',   label: 'TRENDING ADDS' },
  { id: 'gaps',       label: 'ROSTER GAPS' },
  { id: 'needs',      label: 'POSITIONAL NEEDS' },
  { id: 'handcuffs',  label: 'HANDCUFF TRACKER' },
];

interface Props {
  active: WaiverTabId;
  onChange: (id: WaiverTabId) => void;
}

export default function WaiverTabNav({ active, onChange }: Props) {
  return (
    <div className="flex gap-0 border-b border-white/[0.08] mb-4 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 text-[11px] font-semibold tracking-wider transition-colors whitespace-nowrap"
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
