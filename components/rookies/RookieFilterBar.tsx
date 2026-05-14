'use client';

import { useState } from 'react';
import type { RookiePosition, DraftClass } from './types';

const POSITIONS: RookiePosition[] = ['ALL', 'QB', 'RB', 'WR', 'TE'];
const DRAFT_CLASSES: DraftClass[] = ['2025', '2024', '2023'];
const COLLEGES = ['All Colleges', 'Ohio State', 'Alabama', 'Georgia', 'LSU', 'Clemson', 'Texas', 'USC', 'Michigan'];

interface Props {
  position: RookiePosition;
  college:  string;
  draftClass: DraftClass;
  search:   string;
  viewMode: 'list' | 'grid';
  onPosition: (p: RookiePosition) => void;
  onCollege:  (c: string) => void;
  onDraftClass: (d: DraftClass) => void;
  onSearch:   (s: string) => void;
  onViewMode: (v: 'list' | 'grid') => void;
}

export default function RookieFilterBar({
  position, college, draftClass, search, viewMode,
  onPosition, onCollege, onDraftClass, onSearch, onViewMode,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 mb-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Search */}
      <div className="relative flex-shrink-0">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search rookies..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="pl-8 pr-3 py-2 min-h-[36px] text-[12px] rounded-lg text-white placeholder-slate-500 outline-none w-40 transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: focused ? '1px solid rgba(54,231,161,0.4)' : '1px solid rgba(255,255,255,0.1)',
          }}
        />
      </div>

      {/* Position dropdown */}
      <select
        value={position}
        onChange={(e) => onPosition(e.target.value as RookiePosition)}
        className="text-[12px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 min-h-[36px] text-white appearance-none cursor-pointer"
      >
        {POSITIONS.map((p) => (
          <option key={p} value={p} className="bg-[#0a0d14]">
            {p === 'ALL' ? 'All Positions' : p}
          </option>
        ))}
      </select>

      {/* College dropdown */}
      <select
        value={college}
        onChange={(e) => onCollege(e.target.value)}
        className="text-[12px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 min-h-[36px] text-white appearance-none cursor-pointer"
      >
        {COLLEGES.map((c) => (
          <option key={c} value={c} className="bg-[#0a0d14]">{c}</option>
        ))}
      </select>

      {/* Draft class dropdown */}
      <select
        value={draftClass}
        onChange={(e) => onDraftClass(e.target.value as DraftClass)}
        className="text-[12px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 min-h-[36px] text-white appearance-none cursor-pointer"
      >
        {DRAFT_CLASSES.map((d) => (
          <option key={d} value={d} className="bg-[#0a0d14]">{d} Draft Class</option>
        ))}
      </select>

      {/* Filters button */}
      <button
        className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-[12px] font-medium text-slate-300 hover:text-white transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Filters
      </button>

      {/* View toggle — pushed right */}
      <div className="ml-auto flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        {(['list', 'grid'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewMode(mode)}
            className="px-2.5 py-2 min-h-[36px] transition-colors"
            style={{ background: viewMode === mode ? 'rgba(54,231,161,0.15)' : 'transparent' }}
            title={mode === 'list' ? 'List view' : 'Grid view'}
          >
            {mode === 'list' ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="3" width="10" height="1.5" rx="0.75" fill={viewMode === 'list' ? '#36E7A1' : '#64748B'}/>
                <rect x="2" y="6.25" width="10" height="1.5" rx="0.75" fill={viewMode === 'list' ? '#36E7A1' : '#64748B'}/>
                <rect x="2" y="9.5" width="10" height="1.5" rx="0.75" fill={viewMode === 'list' ? '#36E7A1' : '#64748B'}/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="4" height="4" rx="0.75" fill={viewMode === 'grid' ? '#36E7A1' : '#64748B'}/>
                <rect x="8" y="2" width="4" height="4" rx="0.75" fill={viewMode === 'grid' ? '#36E7A1' : '#64748B'}/>
                <rect x="2" y="8" width="4" height="4" rx="0.75" fill={viewMode === 'grid' ? '#36E7A1' : '#64748B'}/>
                <rect x="8" y="8" width="4" height="4" rx="0.75" fill={viewMode === 'grid' ? '#36E7A1' : '#64748B'}/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
