'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { RecentActivity } from './types';
import { photoUrl, formatMinutes } from './types';

interface Props {
  activity: RecentActivity[];
  loading: boolean;
}

function PlayerAvatar({ a }: { a: RecentActivity }) {
  const [err, setErr] = useState(false);
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColor[a.position] ?? '#64748B';
  const initials = a.playerName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  if (err) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span className="text-[10px] font-bold" style={{ color }}>{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image src={photoUrl(a.playerId)} alt={a.playerName} width={28} height={28} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <div className="w-8 h-3 bg-white/[0.06] rounded flex-shrink-0" />
      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-white/[0.06] rounded w-3/4" />
        <div className="h-2 bg-white/[0.06] rounded w-1/2" />
      </div>
      <div className="h-3 w-10 bg-white/[0.06] rounded" />
      <div className="h-3 w-24 bg-white/[0.06] rounded hidden sm:block" />
    </div>
  );
}

export default function RecentActivityFeed({ activity, loading }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">RECENT WAIVER ACTIVITY</h2>
      </div>

      {/* Column header */}
      <div className="px-4 py-2 border-b border-white/[0.06] grid grid-cols-[50px_1fr_60px_60px_1fr] gap-2">
        {['TIME', 'PLAYER', 'ACTION', 'LEAGUE'].map((h, i) => (
          <span key={h} className={`text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${i === 3 ? 'hidden sm:block' : ''}`}>{h}</span>
        ))}
      </div>

      <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto">
        {loading
          ? [...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-2.5">
              <SkeletonRow />
            </div>
          ))
          : activity.length === 0
            ? (
              <div className="px-4 py-8 text-center text-slate-500 text-[13px]">
                No recent waiver activity found
              </div>
            )
            : activity.map((a, i) => (
              <div key={i} className="px-4 py-2.5 grid grid-cols-[50px_1fr_60px_1fr] sm:grid-cols-[50px_1fr_60px_1fr] gap-2 items-center hover:bg-white/[0.02] transition-colors">
                {/* Time */}
                <span className="text-[12px] font-mono text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatMinutes(a.minutesAgo)}
                </span>

                {/* Player */}
                <div className="flex items-center gap-2 min-w-0">
                  <PlayerAvatar a={a} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{a.playerName}</p>
                    <p className="text-[11px] text-slate-500 uppercase">{a.position} · {a.team}</p>
                  </div>
                </div>

                {/* Action */}
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: a.action === 'Added' ? '#36E7A1' : '#EF4444' }}
                >
                  {a.action}
                </span>

                {/* League */}
                <span className="text-[12px] text-slate-400 truncate hidden sm:block">{a.leagueName}</span>
              </div>
            ))
        }
      </div>

      {!loading && activity.length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <button className="text-[12px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            View All Activity →
          </button>
        </div>
      )}
    </div>
  );
}
