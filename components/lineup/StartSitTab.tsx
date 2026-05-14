'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { BorderlinePlayer } from './types';
import { ssasColor, verdictColor, ordinalSuffix, photoUrl } from './types';

interface Props {
  players: BorderlinePlayer[];
  loading: boolean;
}

function PlayerAvatar({ playerId, name }: { playerId: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  if (err) {
    return (
      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-bold text-slate-300">{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image
        src={photoUrl(playerId)}
        alt={name}
        width={28}
        height={28}
        className="object-cover"
        onError={() => setErr(true)}
        unoptimized
      />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="animate-pulse bg-white/[0.06] rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function StartSitTab({ players, loading }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">START / SIT ANALYSIS</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Borderline players only — studs always start</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {[
                { label: 'PLAYER' },
                { label: 'OPP', className: 'hidden sm:table-cell' },
                { label: 'SSAS MATCHUP', className: 'hidden md:table-cell' },
                { label: 'VERDICT' },
                { label: 'REASONING' },
              ].map(({ label, className = '' }) => (
                <th
                  key={label}
                  className={`px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${className}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              : players.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-[12px]">
                      No borderline start/sit decisions this week
                    </td>
                  </tr>
                )
                : players.map((p, i) => (
                  <tr key={`${p.playerId}-${i}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {/* Player */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar playerId={p.playerId} name={p.name} />
                        <div>
                          <p className="text-[12px] font-semibold text-white leading-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{p.position} · {p.team}</p>
                        </div>
                      </div>
                    </td>

                    {/* OPP */}
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className="text-[12px] text-slate-300 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.opponent && p.opponent !== '—' ? `${p.team} vs ${p.opponent}` : '—'}
                      </span>
                    </td>

                    {/* SSAS */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span
                        className="text-[11px] font-mono font-semibold"
                        style={{ fontFamily: 'JetBrains Mono, monospace', color: ssasColor(p.ssasRank) }}
                      >
                        {p.ssasTeam} ({ordinalSuffix(p.ssasRank)})
                      </span>
                    </td>

                    {/* Verdict */}
                    <td className="px-3 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide"
                        style={{
                          color: verdictColor(p.verdict),
                          border: `1px solid ${verdictColor(p.verdict)}30`,
                          background: `${verdictColor(p.verdict)}14`,
                        }}
                      >
                        {p.verdict}
                      </span>
                    </td>

                    {/* Reasoning */}
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{p.reasoning}</p>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
