'use client';

import type { RosterGap, TrendingAdd } from './types';
import { needColor, photoUrl } from './types';
import Image from 'next/image';
import { useState } from 'react';

interface Props {
  gaps: RosterGap[];
  trending: TrendingAdd[];
  loading: boolean;
}

function NeedBadge({ level }: { level: RosterGap['needLevel'] }) {
  const color = needColor(level);
  return (
    <span className="text-[11px] font-semibold" style={{ color }}>{level}</span>
  );
}

function TrendingAvatar({ t }: { t: TrendingAdd }) {
  const [err, setErr] = useState(false);
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColor[t.position] ?? '#64748B';
  const initials = t.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  if (err) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span className="text-[10px] font-bold" style={{ color }}>{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image src={photoUrl(t.playerId)} alt={t.name} width={32} height={32} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2"><div className="h-3 bg-white/[0.06] rounded w-8" /></td>
      <td className="px-3 py-2"><div className="h-3 bg-white/[0.06] rounded w-16" /></td>
      <td className="px-3 py-2"><div className="h-3 bg-white/[0.06] rounded w-8" /></td>
    </tr>
  );
}

export default function RosterGapsPanel({ gaps, trending, loading }: Props) {
  return (
    <div className="space-y-4">
      {/* Roster Gaps table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-white tracking-wide">ROSTER GAPS</h2>
          <span className="text-[10px] text-slate-500 uppercase">YOUR LEAGUES</span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">POSITION</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">NEED LEVEL</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">AVAILABLE IMPACT</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              : gaps.map((g) => (
                <tr key={g.position} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] font-semibold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {g.position}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <NeedBadge level={g.needLevel} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[12px] font-mono font-semibold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {g.availableImpact}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            View Full Breakdown →
          </button>
        </div>
      </div>

      {/* Trending Adds */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-bold text-white tracking-wide">TRENDING ADDS</h2>
          <span className="text-[10px] text-slate-500 uppercase">LAST 7 DAYS</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-2 bg-white/[0.06] rounded w-1/2" />
                </div>
                <div className="h-4 w-12 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {trending.slice(0, 5).map((t) => (
              <div key={t.playerId} className="flex items-center gap-3 py-1 hover:bg-white/[0.02] rounded-lg px-1 transition-colors">
                <TrendingAvatar t={t} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{t.position} · {t.team}</p>
                </div>
                <span
                  className="text-[12px] font-bold flex-shrink-0"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}
                >
                  +{t.pctChange}%
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
          <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            View All Trending →
          </button>
        </div>
      </div>
    </div>
  );
}
