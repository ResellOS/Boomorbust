'use client';

import type { DraftOutlook } from './types';

interface Props {
  outlook: DraftOutlook | null;
  loading: boolean;
}

function GradeDonut({ grade }: { grade: number }) {
  const R = 36;
  const cx = 46;
  const cy = 46;
  const circ = 2 * Math.PI * R;
  const pct = grade / 100;
  const filled = pct * circ;
  const offset = circ * 0.25; // start from top

  const color = grade >= 85 ? '#36E7A1' : grade >= 70 ? '#22D3EE' : grade >= 55 ? '#FBBF24' : '#EF4444';

  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx={cx} cy={cy} r={R}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '46px 46px' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {grade}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="system-ui">
        Overall Grade
      </text>
    </svg>
  );
}

export default function DraftOutlookPanel({ outlook, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-white/[0.06] rounded w-36 mb-4" />
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/[0.06] rounded" />
            <div className="h-3 bg-white/[0.06] rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!outlook) return null;

  return (
    <div className="glass-card p-4">
      <h2 className="text-[12px] font-bold text-white tracking-wide uppercase mb-3">ROOKIE DRAFT OUTLOOK</h2>
      <div className="flex items-center gap-4">
        {/* Description + class strength */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{outlook.description}</p>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Class Strength</p>
              <p
                className="text-[16px] font-bold text-white mt-0.5"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {outlook.classStrength}
              </p>
            </div>
          </div>
        </div>
        {/* Donut */}
        <GradeDonut grade={outlook.overallGrade} />
      </div>
    </div>
  );
}
