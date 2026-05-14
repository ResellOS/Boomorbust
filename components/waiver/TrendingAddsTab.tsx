'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { TrendingAdd } from './types';
import { photoUrl } from './types';

interface Props {
  trending: TrendingAdd[];
  loading: boolean;
}

function PlayerAvatar({ t }: { t: TrendingAdd }) {
  const [err, setErr] = useState(false);
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColor[t.position] ?? '#64748B';
  const initials = t.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  if (err) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span className="text-[11px] font-bold" style={{ color }}>{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image src={photoUrl(t.playerId)} alt={t.name} width={40} height={40} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 border border-white/[0.06] animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-white/[0.06] rounded w-3/4" />
          <div className="h-3 bg-white/[0.06] rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-white/[0.06] rounded" />
      </div>
    </div>
  );
}

export default function TrendingAddsTab({ trending, loading }: Props) {
  return (
    <div className="glass-card p-4">
      <h2 className="text-[13px] font-bold text-white tracking-wide mb-4">TRENDING ADDS — LAST 7 DAYS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading
          ? [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
          : trending.length === 0
            ? (
              <div className="col-span-2 text-center py-10 text-slate-500 text-[12px]">
                No trending add data available
              </div>
            )
            : trending.map((t) => (
              <div
                key={t.playerId}
                className="flex items-center gap-4 rounded-xl p-3.5 hover:bg-white/[0.03] transition-colors"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <PlayerAvatar t={t} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-500 uppercase">{t.position} · {t.team}</p>
                </div>
                <span
                  className="text-[14px] font-bold flex-shrink-0 px-3 py-1 rounded-lg"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#36E7A1',
                    background: 'rgba(54,231,161,0.1)',
                    border: '1px solid rgba(54,231,161,0.2)',
                  }}
                >
                  +{t.pctChange}%
                </span>
              </div>
            ))
        }
      </div>
    </div>
  );
}
