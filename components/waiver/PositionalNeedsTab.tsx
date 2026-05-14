'use client';

import type { RosterGap, PositionalNeed } from './types';
import { needColor } from './types';

interface Props {
  gaps: RosterGap[];
  needs: PositionalNeed[];
  loading: boolean;
}

function NeedBar({ level }: { level: RosterGap['needLevel'] }) {
  const color = needColor(level);
  const width = level === 'High' ? '100%' : level === 'Medium' ? '60%' : '25%';
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
        <div className="h-2 rounded-full transition-all" style={{ width, background: color, opacity: 0.8 }} />
      </div>
      <span className="text-[11px] font-semibold w-14 text-right" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
        {level}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.025)' }}>
      <div className="w-8 h-5 bg-white/[0.06] rounded" />
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full" />
      <div className="w-12 h-4 bg-white/[0.06] rounded" />
    </div>
  );
}

export default function PositionalNeedsTab({ gaps, needs, loading }: Props) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="text-[13px] font-bold text-white tracking-wide mb-1">POSITIONAL NEEDS</h2>
        <p className="text-[11px] text-slate-500 mb-4">Across all your leagues — positions ranked by urgency</p>

        <div className="space-y-2">
          {loading
            ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
            : gaps.map((g) => (
              <div
                key={g.position}
                className="flex items-center gap-4 rounded-xl p-3 hover:bg-white/[0.03] transition-colors"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-[13px] font-bold text-white font-mono w-10" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {g.position}
                </span>
                <NeedBar level={g.needLevel} />
                <span className="text-[11px] text-slate-400 w-24 text-right flex-shrink-0">
                  {g.availableImpact} available
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {needs.length > 0 && (
        <div className="glass-card p-4">
          <h2 className="text-[12px] font-bold text-white tracking-wide mb-3 uppercase">Priority Positions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {needs.map((n) => {
              const color = needColor(n.severity);
              return (
                <div
                  key={n.position}
                  className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: `${color}0f`, border: `1px solid ${color}25` }}
                >
                  <div>
                    <p className="text-[14px] font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {n.position}
                    </p>
                    <p className="text-[10px] text-slate-400">{n.count} league{n.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color }}>{n.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
