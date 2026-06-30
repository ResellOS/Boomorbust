'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PlayerRow, OptimalLineupData } from './types';
import { ssasColor, verdictColor, ordinalSuffix, photoUrl } from './types';

interface Props {
  data: OptimalLineupData | null;
  loading: boolean;
  week: number;
  onWeekChange: (w: number) => void;
}

function VerdictBadge({ verdict }: { verdict: PlayerRow['verdict'] }) {
  const color = verdictColor(verdict);
  return (
    <span
      className="px-2 py-0.5 rounded text-[12px] font-bold tracking-wide"
      style={{ color, border: `1px solid ${color}30`, background: `${color}14` }}
    >
      {verdict}
    </span>
  );
}

function PlayerAvatar({ playerId, name }: { playerId: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  if (err) {
    return (
      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-300">{initials}</span>
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

function SsasCell({ team, rank, grade }: { team: string; rank: number; grade: number }) {
  const color = ssasColor(rank);
  const barWidth = Math.round((grade / 100) * 60);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-mono font-semibold" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
          {team} ({ordinalSuffix(rank)})
        </span>
        <div className="h-1 rounded-full bg-white/[0.08] w-[60px]">
          <div className="h-1 rounded-full" style={{ width: `${barWidth}px`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="animate-pulse bg-white/[0.06] rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

function TableRow({ row, dim }: { row: PlayerRow; dim?: boolean }) {
  return (
    <tr
      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
      style={{ opacity: dim ? 0.65 : 1 }}
    >
      {/* SLOT */}
      <td className="px-3 py-2.5 w-12">
        <span
          className="text-[12px] font-mono font-semibold text-slate-400"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {row.slot}
        </span>
      </td>

      {/* PLAYER */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <PlayerAvatar playerId={row.playerId} name={row.name} />
          <div>
            <p className="text-[13px] font-semibold text-white leading-tight truncate max-w-[120px]">{row.name}</p>
            <p className="text-[11px] text-slate-500 uppercase">{row.position} · {row.team}</p>
          </div>
        </div>
      </td>

      {/* OPP */}
      <td className="px-3 py-2.5 hidden sm:table-cell">
        <span className="text-[13px] text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {row.matchupLabel}
        </span>
      </td>

      {/* SSAS MATCHUP */}
      <td className="px-3 py-2.5 hidden md:table-cell">
        <SsasCell team={row.ssasTeam} rank={row.ssasRank} grade={row.ssasGrade} />
      </td>

      {/* VERDICT */}
      <td className="px-3 py-2.5">
        <VerdictBadge verdict={row.verdict} />
      </td>

      {/* PROJ POINTS */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-[14px] font-mono font-semibold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {row.projectedPoints.toFixed(1)}
        </span>
      </td>

      {/* TRE EDGE */}
      <td className="px-3 py-2.5 text-right">
        <span
          className="text-[13px] font-mono font-semibold"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: row.treEdge >= 0 ? '#36E7A1' : '#EF4444',
          }}
        >
          {row.treEdge >= 0 ? '+' : ''}{row.treEdge.toFixed(1)}
        </span>
      </td>
    </tr>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-white/[0.08]">
        {[
          { label: 'SLOT', className: 'w-12' },
          { label: 'PLAYER', className: '' },
          { label: 'OPP', className: 'hidden sm:table-cell' },
          { label: 'SSAS MATCHUP', className: 'hidden md:table-cell' },
          { label: 'VERDICT', className: '' },
          { label: 'PROJ POINTS', className: 'text-right' },
          { label: 'TRE EDGE', className: 'text-right' },
        ].map(({ label, className }) => (
          <th
            key={label}
            className={`px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${className}`}
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export default function OptimalLineupTable({ data, loading, week, onWeekChange }: Props) {
  const currentWeek = week;
  const starters = data?.starters ?? [];
  const bench = data?.bench ?? [];
  const totalProjected = data?.totalProjected ?? 0;
  const totalTreEdge = data?.totalTreEdge ?? 0;

  return (
    <div className="space-y-4">
      {/* Main starters table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-[14px] font-bold text-white tracking-wide">YOUR OPTIMAL LINEUP</h2>
          <div className="flex items-center gap-2">
            <select
              value={currentWeek}
              onChange={(e) => onWeekChange(parseInt(e.target.value, 10))}
              className="text-[12px] font-mono bg-white/[0.06] border border-white/[0.12] rounded px-2 py-2 min-h-[36px] text-white appearance-none cursor-pointer"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="bg-[#0a0d14]">Week {w}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <tbody>
              {loading
                ? [...Array(9)].map((_, i) => <SkeletonRow key={i} />)
                : starters.map((row, i) => <TableRow key={`${row.playerId}-${i}`} row={row} />)
              }

              {/* TOTAL row */}
              {!loading && starters.length > 0 && (
                <tr className="border-t border-white/[0.1]">
                  <td className="px-3 py-2.5 text-[12px] font-bold text-slate-400 font-mono uppercase" colSpan={2}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    TOTAL PROJECTED
                  </td>
                  <td colSpan={3} />
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[14px] font-mono font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {totalProjected.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="text-[13px] font-mono font-bold"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: totalTreEdge >= 0 ? '#36E7A1' : '#EF4444',
                      }}
                    >
                      {totalTreEdge >= 0 ? '+' : ''}{totalTreEdge.toFixed(1)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bench panel */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-[12px] font-bold text-slate-400 tracking-widest uppercase">BENCH</h2>
        </div>
        <div className="overflow-x-auto opacity-70">
          <table className="w-full">
            <TableHeader />
            <tbody>
              {loading
                ? [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
                : bench.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-[13px]">
                        No bench players loaded
                      </td>
                    </tr>
                  )
                  : bench.map((row, i) => <TableRow key={`bench-${row.playerId}-${i}`} row={row} dim />)
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
