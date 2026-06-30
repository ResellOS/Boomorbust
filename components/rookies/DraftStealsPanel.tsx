'use client';

import type { RookieProspect } from './types';
import { posColor } from './types';

interface Props {
  steals: RookieProspect[];
  loading: boolean;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-pulse">
      <div className="w-5 h-4 bg-white/[0.06] rounded" />
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-white/[0.06] rounded w-3/4" />
        <div className="h-2 bg-white/[0.06] rounded w-1/2" />
      </div>
      <div className="w-12 h-4 bg-white/[0.06] rounded" />
      <div className="w-8 h-4 bg-white/[0.06] rounded" />
      <div className="w-20 h-4 bg-white/[0.06] rounded" />
    </div>
  );
}

export default function DraftStealsPanel({ steals, loading }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">DRAFT STEALS</h2>
        <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          View All
        </button>
      </div>

      {/* Column headers */}
      <div className="px-4 py-2 border-b border-white/[0.06] grid grid-cols-[16px_1fr_auto_auto_auto] gap-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">PLAYER</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">RTS vs ADP</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">SLEEPER%</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">IDEAL RANGE</span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {loading
          ? [...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-2.5"><SkeletonRow /></div>
          ))
          : steals.map((p, i) => (
            <div
              key={p.id}
              className="px-4 py-2.5 grid grid-cols-[16px_1fr_auto_auto_auto] gap-2 items-center hover:bg-white/[0.02] transition-colors"
            >
              {/* Rank number */}
              <span className="text-[12px] font-mono font-bold text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {i + 1}
              </span>

              {/* Player */}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                <p className="text-[11px] uppercase" style={{ color: posColor(p.position) }}>
                  {p.position} · {p.team}
                </p>
              </div>

              {/* RTS vs ADP delta */}
              <span
                className="text-[13px] font-bold"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}
              >
                +{p.rtsVsAdpDelta.toFixed(1)}
              </span>

              {/* Sleeper % */}
              <span className="text-[12px] font-mono text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {p.sleeperPct}%
              </span>

              {/* Ideal range */}
              <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {p.idealRange}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
