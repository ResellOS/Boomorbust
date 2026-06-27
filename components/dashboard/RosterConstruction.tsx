'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { rosterAnalysisHref } from '@/lib/dashboard/dashboardRoutes';
import type { RosterConstructionGrade } from '@/lib/dashboard/rosterConstruction';

export default function RosterConstruction({
  grades,
  title = 'Roster Construction',
  compact = false,
  leagueId,
}: {
  grades: RosterConstructionGrade[];
  title?: string;
  compact?: boolean;
  leagueId?: string;
}) {
  const href = rosterAnalysisHref(leagueId);

  if (compact) {
    return (
      <Link
        href={href}
        className="dash-clickable-card flex h-full flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] no-underline"
      >
        <div className="border-b border-[#1e2640]/80 px-3 py-2">
          <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
            Roster Construction
          </h3>
          <p className="font-mono text-[8px] text-[#8b9bb8]">Strength by room · tap for analysis</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5 p-2.5">
          {grades.map((g) => (
            <GradeTile key={g.key} g={g} dense />
          ))}
        </div>
        <div className="border-t border-[#1e2640]/60 px-3 py-1.5">
          <span className="inline-flex items-center gap-0.5 font-mono text-[8px] text-boom">
            View Roster Analysis
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="dash-clickable-card block rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-3 no-underline">
      <h3 className="font-figtree text-[10px] uppercase tracking-[1.8px] text-[#e8ecf4]">{title}</h3>
      <p className="mt-0.5 font-mono text-[8px] text-[#8b9bb8]">Where this roster is strong or weak</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {grades.map((g) => (
          <GradeTile key={g.key} g={g} />
        ))}
      </div>
    </Link>
  );
}

function GradeTile({ g, dense }: { g: RosterConstructionGrade; dense?: boolean }) {
  return (
    <div className="rounded-md border border-[#1e2640]/50 bg-[#141929]/50 px-2 py-1.5">
      <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{g.label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`font-mono font-semibold tabular-nums leading-none ${dense ? 'text-[14px]' : 'text-[18px]'}`}
          style={{ color: g.color }}
        >
          {g.letter}
        </span>
        <span className="truncate font-figtree text-[9px] text-[#8b9bb8]">{g.descriptor}</span>
      </div>
      {g.barFill > 0 ? (
        <div className={`overflow-hidden rounded-full bg-[#1e2640] ${dense ? 'mt-1 h-0.5' : 'mt-1.5 h-1'}`}>
          <div
            className="h-full rounded-full"
            style={{ width: `${g.barFill}%`, background: g.color, boxShadow: `0 0 4px ${g.color}44` }}
          />
        </div>
      ) : (
        <div className={`rounded-full bg-[#1e2640] ${dense ? 'mt-1 h-0.5' : 'mt-1.5 h-1'}`} />
      )}
    </div>
  );
}
