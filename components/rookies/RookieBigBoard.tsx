'use client';

import type { RookieProspect } from './types';
import { verdictColor, ffigGradeStyle, posColor } from './types';

interface Props {
  prospects: RookieProspect[];
  loading: boolean;
  onSelect: (p: RookieProspect) => void;
  selected: RookieProspect | null;
}

// ─── College logo abbreviation ────────────────────────────────────────────────

const COLLEGE_ABBREVS: Record<string, { abbr: string; color: string }> = {
  'Ohio State': { abbr: 'OSU', color: '#BB0000' },
  'Alabama':    { abbr: 'ALA', color: '#9E1B32' },
  'Georgia':    { abbr: 'UGA', color: '#BA0C2F' },
  'LSU':        { abbr: 'LSU', color: '#461D7C' },
  'Clemson':    { abbr: 'CU', color: '#F66733' },
  'Texas':      { abbr: 'TEX', color: '#BF5700' },
  'Penn State': { abbr: 'PSU', color: '#041E42' },
  'Boise State':{ abbr: 'BSU', color: '#0033A0' },
  'Arizona':    { abbr: 'UA', color: '#CC0033' },
  'Oregon':     { abbr: 'ORE', color: '#154733' },
  'Iowa':       { abbr: 'IA', color: '#FFCD00' },
  'Michigan':   { abbr: 'MICH', color: '#00274C' },
  'Florida State': { abbr: 'FSU', color: '#782F40' },
  'Missouri':   { abbr: 'MIZ', color: '#F1B82D' },
  'Colorado':   { abbr: 'CU', color: '#CFB87C' },
  'Bowling Green': { abbr: 'BGSU', color: '#FE5000' },
  'TCU':        { abbr: 'TCU', color: '#4D1979' },
  'Miami FL':   { abbr: 'MIA', color: '#005030' },
  'Tennessee':  { abbr: 'TENN', color: '#FF8200' },
  'Virginia Tech': { abbr: 'VT', color: '#630031' },
  'Texas Tech': { abbr: 'TTU', color: '#CC0000' },
};

function CollegeBadge({ college }: { college: string }) {
  const info = COLLEGE_ABBREVS[college] ?? { abbr: college.slice(0, 3).toUpperCase(), color: '#475569' };
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${info.color}30`, color: info.color, border: `1px solid ${info.color}40` }}
    >
      {info.abbr}
    </span>
  );
}

function FfigGradeBadge({ grade }: { grade: RookieProspect['ffigGrade'] }) {
  const { bg, color } = ffigGradeStyle(grade);
  return (
    <span
      className="text-[13px] font-bold px-2 py-0.5 rounded-md"
      style={{ background: bg, color, border: `1px solid ${color}40` }}
    >
      {grade}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: RookieProspect['verdict'] }) {
  const color = verdictColor(verdict);
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded tracking-wide whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {verdict}
    </span>
  );
}

function TeamBadge({ team }: { team: string }) {
  return (
    <span className="text-[11px] font-bold text-white bg-white/[0.08] px-1.5 py-0.5 rounded font-mono"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {team}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="animate-pulse bg-white/[0.06] rounded h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function RookieBigBoard({ prospects, loading, onSelect, selected }: Props) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">ROOKIE BIG BOARD</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {[
                { label: 'RANK',         cls: 'w-10 text-center' },
                { label: 'PLAYER',       cls: '' },
                { label: 'POS',          cls: 'hidden sm:table-cell' },
                { label: 'COLLEGE',      cls: 'hidden md:table-cell' },
                { label: 'F-FIG GRADE',  cls: '' },
                { label: 'RTS SCORE',    cls: 'hidden sm:table-cell' },
                { label: 'DRAFT CAPITAL',cls: 'hidden lg:table-cell' },
                { label: 'LANDING SPOT', cls: 'hidden xl:table-cell' },
                { label: 'BOOM %',       cls: 'hidden md:table-cell text-right' },
                { label: 'TRE FIT',      cls: 'hidden lg:table-cell text-right' },
                { label: 'VERDICT',      cls: '' },
              ].map(({ label, cls }) => (
                <th key={label} className={`px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${cls}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
              : prospects.map((p) => {
                  const isSelected = selected?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelect(p)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                      style={{ background: isSelected ? 'rgba(54,231,161,0.04)' : undefined }}
                    >
                      {/* RANK */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[12px] font-mono font-bold text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.rank}
                        </span>
                      </td>

                      {/* PLAYER */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-8 rounded-full flex-shrink-0"
                            style={{ background: posColor(p.position) }}
                          />
                          <div>
                            <p className="text-[12px] font-semibold text-white truncate max-w-[140px]">{p.name}</p>
                            <div className="flex items-center gap-1.5 sm:hidden">
                              <span className="text-[10px] font-bold" style={{ color: posColor(p.position) }}>{p.position}</span>
                              <CollegeBadge college={p.college} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* POS */}
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-[11px] font-bold" style={{ color: posColor(p.position) }}>{p.position}</span>
                      </td>

                      {/* COLLEGE */}
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <CollegeBadge college={p.college} />
                      </td>

                      {/* F-FIG GRADE */}
                      <td className="px-3 py-2.5">
                        <FfigGradeBadge grade={p.ffigGrade} />
                      </td>

                      {/* RTS SCORE */}
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-[15px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
                          {p.rtsScore}
                        </span>
                      </td>

                      {/* DRAFT CAPITAL */}
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-[11px] text-slate-300 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.draftCapital}
                        </span>
                      </td>

                      {/* LANDING SPOT */}
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <div className="flex items-center gap-1.5">
                          <TeamBadge team={p.landingTeam} />
                        </div>
                      </td>

                      {/* BOOM% */}
                      <td className="px-3 py-2.5 hidden md:table-cell text-right">
                        <span className="text-[12px] font-mono text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.boomPct}%
                        </span>
                      </td>

                      {/* TRE FIT */}
                      <td className="px-3 py-2.5 hidden lg:table-cell text-right">
                        <span className="text-[12px] font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
                          {p.treFit}%
                        </span>
                      </td>

                      {/* VERDICT */}
                      <td className="px-3 py-2.5">
                        <VerdictBadge verdict={p.verdict} />
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-center">
          <button className="text-[12px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            View Full Rookie Board →
          </button>
        </div>
      )}
    </div>
  );
}
