'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TrendingUp } from 'lucide-react';
import type { WaiverRadarRow, WaiverPriority } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function priorityPill(p: WaiverPriority) {
  if (p === 'HIGH')
    return 'bg-emerald-950 text-emerald-400 border border-emerald-500/30';
  if (p === 'MEDIUM')
    return 'bg-amber-950 text-amber-400 border border-amber-500/30';
  return 'bg-slate-800 text-slate-400 border border-slate-600/30';
}

function Avatar({ name }: { name: string }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (err) {
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold bg-white/[0.08] text-white shrink-0">
        {initials}
      </div>
    );
  }
  return (
    <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-white/[0.06]">
      <Image
        src={`https://sleepercdn.com/content/nfl/players/thumb/${slug}.jpg`}
        alt=""
        width={36}
        height={36}
        className="object-cover"
        unoptimized
        onError={() => setErr(true)}
      />
    </div>
  );
}

interface Props {
  rows: WaiverRadarRow[];
  loading: boolean;
}

export default function WaiverRadarPanel({ rows, loading }: Props) {
  return (
    <div className={`${GLASS} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[13px] uppercase tracking-widest text-[#64748B] font-semibold">WAIVER RADAR</p>
        <button
          type="button"
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[13px] text-white min-h-[36px]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          Next 7 Days ▾
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.05] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['RANK', 'PLAYER', '% ROSTERED', 'TREND', '% FAAB', 'PRIORITY', 'OPPORTUNITY SCORE'].map((h) => (
                  <th
                    key={h}
                    className={`text-left py-2 px-3 text-[11px] uppercase tracking-wider text-[#64748B] font-semibold ${h === 'OPPORTUNITY SCORE' ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.rank}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-3 w-10">
                    <span className="text-[14px] tabular-nums text-[#64748B] font-mono">{r.rank}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={r.playerName} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">{r.playerName}</p>
                        <p className="text-[12px] text-[#64748B]">
                          {r.position}·{r.team}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[14px] tabular-nums text-white font-mono">{r.pctRostered}%</td>
                  <td className="py-2.5 px-3">
                    {r.trendUp ? <TrendingUp className="w-[14px] h-[14px] text-[#36E7A1]" aria-label="Up" /> : null}
                  </td>
                  <td className="py-2.5 px-3 text-[14px] tabular-nums font-mono" style={{ color: '#36E7A1' }}>
                    {r.pctFaab}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${priorityPill(r.priority)}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-[15px] font-bold tabular-nums font-mono" style={{ color: '#36E7A1' }}>
                      {r.opportunityScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="py-3 text-center border-t border-white/[0.04]">
        <a href="/waiver-wire" className="text-[13px] text-[#22D3EE] hover:underline" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          View Full Waiver Radar →
        </a>
      </div>
    </div>
  );
}
