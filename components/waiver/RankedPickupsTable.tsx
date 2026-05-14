'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { WaiverPlayer } from './types';
import { priorityColor, photoUrl } from './types';

interface Props {
  players: WaiverPlayer[];
  loading: boolean;
  total: number;
}

// ─── Mini SVG Sparkline ───────────────────────────────────────────────────────

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return null;
  const W = 60;
  const H = 24;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((v) => H - ((v - min) / range) * (H - 4) - 2);

  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');

  const lastY = ys[ys.length - 1];
  const fillD = `${d} L${W},${H} L0,${H} Z`;

  const isUp = points[points.length - 1] >= points[0];
  const color = isUp ? '#36E7A1' : '#EF4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${points.join('-')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg-${points.join('-')})`} />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function PlayerAvatar({ playerId, name, position }: { playerId: string; name: string; position: string }) {
  const [err, setErr] = useState(false);
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA', K: '#64748B', DEF: '#94a3b8', DST: '#94a3b8' };
  const color = posColor[position] ?? '#64748B';
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  if (err) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span className="text-[9px] font-bold" style={{ color }}>{initials}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image src={photoUrl(playerId)} alt={name} width={28} height={28} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: WaiverPlayer['priority'] }) {
  const color = priorityColor(priority);
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
    >
      {priority}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="animate-pulse bg-white/[0.06] rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Pos tag ─────────────────────────────────────────────────────────────────

function PosTag({ position }: { position: string }) {
  const colors: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA', K: '#64748B', DEF: '#94a3b8', DST: '#94a3b8' };
  const c = colors[position] ?? '#64748B';
  return (
    <span className="text-[10px] font-bold ml-1.5" style={{ color: c }}>{position}</span>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function RankedPickupsTable({ players, loading, total }: Props) {
  const visible = players.slice(0, 12);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-white tracking-wide">RANKED PICKUP TARGETS</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {[
                { label: 'RANK',      cls: 'w-12 text-center' },
                { label: 'PLAYER',    cls: '' },
                { label: 'POS',       cls: 'hidden sm:table-cell' },
                { label: 'TEAM',      cls: 'hidden sm:table-cell' },
                { label: 'BBSM SCORE',cls: '' },
                { label: 'TREND',     cls: 'hidden md:table-cell' },
                { label: '% ROSTERED',cls: 'hidden lg:table-cell text-right' },
                { label: 'ADP',       cls: 'hidden lg:table-cell text-right' },
                { label: 'PRIORITY',  cls: 'hidden sm:table-cell' },
              ].map(({ label, cls }) => (
                <th key={label} className={`px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${cls}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(12)].map((_, i) => <SkeletonRow key={i} />)
              : visible.map((p) => (
                <tr key={p.playerId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  {/* Rank */}
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[11px] font-mono font-bold text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.rank}
                    </span>
                  </td>

                  {/* Player */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar playerId={p.playerId} name={p.name} position={p.position} />
                      <div>
                        <p className="text-[12px] font-semibold text-white leading-tight truncate max-w-[130px]">{p.name}</p>
                        <div className="flex items-center sm:hidden">
                          <span className="text-[10px] text-slate-500">{p.team}</span>
                          <PosTag position={p.position} />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* POS */}
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <PosTag position={p.position} />
                  </td>

                  {/* TEAM */}
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <span className="text-[11px] text-slate-400">{p.team}</span>
                  </td>

                  {/* BBSM */}
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[18px] font-bold"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}
                    >
                      {p.bbsmScore}
                    </span>
                  </td>

                  {/* TREND sparkline */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <Sparkline points={p.trend} />
                  </td>

                  {/* % Rostered */}
                  <td className="px-3 py-2.5 hidden lg:table-cell text-right">
                    <span className="text-[11px] font-mono text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.pctRostered}%
                    </span>
                  </td>

                  {/* ADP */}
                  <td className="px-3 py-2.5 hidden lg:table-cell text-right">
                    <span className="text-[11px] font-mono text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.adpLabel}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <PriorityBadge priority={p.priority} />
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* View All link */}
      {!loading && total > 12 && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Showing 12 of {total} available players</span>
          <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            View All {total} Available Players →
          </button>
        </div>
      )}
    </div>
  );
}
