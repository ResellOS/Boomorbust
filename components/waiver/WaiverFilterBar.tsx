'use client';

import type { WaiverPosition, WaiverScoring } from './types';

const POSITIONS: WaiverPosition[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'DST', 'K'];
const SCORING_OPTIONS: WaiverScoring[] = ['PPR', '0.5PPR', 'Standard'];

interface Props {
  leagues: Array<{ id: string; name: string }>;
  activeLeagueId: string | null;
  position: WaiverPosition;
  scoring: WaiverScoring;
  onLeagueChange: (id: string | null) => void;
  onPositionChange: (p: WaiverPosition) => void;
  onScoringChange: (s: WaiverScoring) => void;
}

export default function WaiverFilterBar({
  leagues, activeLeagueId, position, scoring,
  onLeagueChange, onPositionChange, onScoringChange,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 mb-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* League dropdown */}
      <select
        value={activeLeagueId ?? ''}
        onChange={(e) => onLeagueChange(e.target.value || null)}
        className="text-[13px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 min-h-[36px] text-white appearance-none cursor-pointer min-w-[140px]"
      >
        <option value="" className="bg-[#0a0d14]">All Leagues</option>
        {leagues.map((l) => (
          <option key={l.id} value={l.id} className="bg-[#0a0d14]">{l.name}</option>
        ))}
      </select>

      {/* Position pills */}
      <div className="flex flex-wrap gap-1.5">
        {POSITIONS.map((pos) => {
          const active = position === pos;
          return (
            <button
              key={pos}
              onClick={() => onPositionChange(pos)}
              className="px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
              style={{
                background: active ? '#36E7A1' : 'rgba(255,255,255,0.05)',
                color: active ? '#0a0d14' : '#94a3b8',
                border: active ? '1px solid #36E7A1' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {pos}
            </button>
          );
        })}
      </div>

      {/* Scoring dropdown — pushed to right */}
      <div className="ml-auto">
        <select
          value={scoring}
          onChange={(e) => onScoringChange(e.target.value as WaiverScoring)}
          className="text-[13px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 min-h-[36px] text-white appearance-none cursor-pointer"
        >
          {SCORING_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-[#0a0d14]">{s} Scoring</option>
          ))}
        </select>
      </div>
    </div>
  );
}
