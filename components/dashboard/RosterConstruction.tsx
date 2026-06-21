'use client';

import type { RosterConstructionGrade } from '@/lib/dashboard/rosterConstruction';

export default function RosterConstruction({
  grades,
  title = 'Roster Construction',
}: {
  grades: RosterConstructionGrade[];
  title?: string;
}) {
  return (
    <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-4">
      <h3 className="font-figtree text-[10px] uppercase tracking-[1.8px] text-[#e8ecf4]">{title}</h3>
      <p className="mt-0.5 font-mono text-[8px] text-[#6b7a99]">Where this roster is strong or weak</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {grades.map((g) => (
          <div
            key={g.key}
            className="rounded-md border border-[#1e2640]/50 bg-[#141929]/50 px-2.5 py-2.5"
          >
            <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{g.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-[18px] font-semibold tabular-nums leading-none" style={{ color: g.color }}>
                {g.letter}
              </span>
              <span className="font-figtree text-[10px] text-[#6b7a99]">{g.descriptor}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
