'use client';

import type { MatchupMatrixRow } from './types';
import { ordinalSuffix } from './types';

interface Props {
  easiest: MatchupMatrixRow[];
  toughest: MatchupMatrixRow[];
  loading: boolean;
}

function MatrixRow({ row, isEasy }: { row: MatchupMatrixRow; isEasy: boolean }) {
  const barColor = isEasy ? '#36E7A1' : '#EF4444';
  const barWidth = isEasy
    ? Math.round((row.grade / 100) * 100)
    : Math.round(((100 - row.grade) / 100) * 100);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className="text-[11px] font-mono w-4 text-slate-500 flex-shrink-0 text-right"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {row.rank}
      </span>
      <span
        className="text-[12px] font-mono font-semibold w-20 flex-shrink-0"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: isEasy ? '#36E7A1' : '#EF4444',
        }}
      >
        {row.team} ({ordinalSuffix(row.ssasRank)})
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${barWidth}%`, background: barColor, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-1.5 animate-pulse">
      <div className="w-4 h-3 bg-white/[0.06] rounded" />
      <div className="w-20 h-3 bg-white/[0.06] rounded" />
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full" />
    </div>
  );
}

function SsasInfoBox() {
  return (
    <div
      className="rounded-lg p-4 mt-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[12px] font-bold text-white mb-2">WHAT IS SSAS?</p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Strength of Schedule Adjusted Score — our proprietary metric that adjusts player projections based on
        opponent defense, pace, and situational factors.
      </p>
      <button
        className="mt-3 px-4 py-1.5 rounded text-[11px] font-semibold text-white transition-opacity hover:opacity-80"
        style={{ background: 'rgba(54,231,161,0.15)', border: '1px solid rgba(54,231,161,0.25)' }}
      >
        Learn More
      </button>
    </div>
  );
}

export default function MatchupMatrixTab({ easiest, toughest, loading }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4">
        <h2 className="text-[13px] font-bold text-white tracking-wide mb-1">MATCHUP MATRIX (SSAS)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Easiest */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Easiest Matchups</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>SSAS Difficulty Scale</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:block">Toughest Matchups</p>
            </div>

            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : easiest.length === 0
                ? <p className="text-[12px] text-slate-500 py-4">No matchup data available</p>
                : easiest.map((row, i) => <MatrixRow key={i} row={row} isEasy />)
            }
          </div>

          {/* Toughest */}
          <div className="md:hidden">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Toughest Matchups</p>
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : toughest.map((row, i) => <MatrixRow key={i} row={row} isEasy={false} />)
            }
          </div>

          {/* Toughest (desktop) */}
          <div className="hidden md:block">
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : toughest.map((row, i) => <MatrixRow key={i} row={row} isEasy={false} />)
            }
          </div>
        </div>

        <SsasInfoBox />
      </div>
    </div>
  );
}
