'use client';

import { SUGGESTED_PROMPTS } from './types';

interface Props {
  onSelect: (prompt: string) => void;
}

function TradeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 14l-3-3 3-3" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 2h6v5a3 3 0 01-6 0V2z" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M5 4H3a1 1 0 000 2h2M11 4h2a1 1 0 010 2h-2M8 9v3M6 14h4" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2C5.8 2 4 3.8 4 6c0 1.1.4 2 1.1 2.7C4.4 9.4 4 10.5 4 11.5A2.5 2.5 0 006.5 14H8" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 2c2.2 0 4 1.8 4 4 0 1.1-.4 2-1.1 2.7.7.7 1.1 1.8 1.1 2.8A2.5 2.5 0 019.5 14H8" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12l4-4 3 3 5-6M12 5h3v3" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.5"/>
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.5"/>
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.5"/>
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="#64748B" strokeWidth="1.5"/>
    </svg>
  );
}

const ICONS = {
  trade:   <TradeIcon />,
  trophy:  <TrophyIcon />,
  brain:   <BrainIcon />,
  star:    <StarIcon />,
  trending:<TrendingIcon />,
  grid:    <GridIcon />,
};

export default function SuggestedPrompts({ onSelect }: Props) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">SUGGESTED PROMPTS</p>
      <div className="space-y-1">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.prompt)}
            className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] group"
          >
            <div className="flex-shrink-0 mt-0.5">
              {ICONS[p.icon as keyof typeof ICONS]}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white group-hover:text-white transition-colors">{p.title}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{p.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
