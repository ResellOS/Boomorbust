'use client';

import type { PerformancePageData } from '@/lib/performance/types';
import {
  DEFINITIONS_SUBTITLE,
  HERO_MUTED,
  HERO_SUBTITLE,
  INVALIDATED_NOTE,
  WIN_DEFINITIONS,
} from '@/lib/performance/constants';
import BobVsConsensusChart from '@/components/performance/BobVsConsensusChart';
import AccuracyByCategory from '@/components/performance/AccuracyByCategory';
import RecentCallsFeed from '@/components/performance/RecentCallsFeed';
import HallOfFame from '@/components/performance/HallOfFame';
import HallOfAccountability from '@/components/performance/HallOfAccountability';
import ModelTimeline from '@/components/performance/ModelTimeline';

export default function PerformanceClient({ data }: { data: PerformancePageData }) {
  const { stats, consensus, weeklyChart, categoryAccuracy, confidenceCalibration, calls, hallOfFame, hallOfShame, modelTimeline } = data;
  const hasData = stats.hasSeasonData;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
      {/* Hero */}
      <div className="mb-5">
        <h1 className="font-figtree text-[34px] font-extrabold leading-none tracking-[-1px] text-text">
          BOB TRACK RECORD
        </h1>
        <p className="mt-2 font-figtree text-[14px] leading-snug text-text">
          {HERO_SUBTITLE}
        </p>
        <p className="mt-2 max-w-xl font-figtree text-[12px] leading-relaxed text-muted">
          {HERO_MUTED}
        </p>
      </div>

      {/* Section 1 — BOB vs Consensus */}
      <BobVsConsensusChart
        consensus={consensus}
        weeklyChart={weeklyChart}
        hasData={hasData}
      />

      {/* Section 2 — Locked Definitions */}
      <section className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <div className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
            How We Define a Win
          </div>
          <span className="rounded-[4px] border border-border bg-bg/60 px-2 py-0.5 font-mono text-[8px] text-muted">
            Locked June 18, 2026
          </span>
        </div>
        <p className="mb-3 font-mono text-[9px] text-muted">{DEFINITIONS_SUBTITLE}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {WIN_DEFINITIONS.map((def) => (
            <div
              key={def.title}
              className="rounded-[10px] border border-border bg-surface/60 p-4 backdrop-blur-xl"
            >
              <div className="font-figtree text-[12px] font-semibold text-boom">
                {def.title}
              </div>
              <p className="mt-2 font-figtree text-[11px] leading-relaxed text-muted">
                {def.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-figtree text-[10px] leading-relaxed text-muted">
          {INVALIDATED_NOTE}
        </p>
      </section>

      {/* Section 3 — Accuracy by Category */}
      <AccuracyByCategory
        categoryAccuracy={categoryAccuracy}
        confidenceCalibration={confidenceCalibration}
        hasData={hasData}
      />

      {/* Section 4 — Recent Calls Feed */}
      <RecentCallsFeed calls={calls} />

      {/* Section 5 — Hall of Fame */}
      <HallOfFame calls={hallOfFame} hasData={hasData} />

      {/* Section 6 — Hall of Accountability */}
      <HallOfAccountability calls={hallOfShame} hasData={hasData} />

      {/* Section 7 — How BOB Learns */}
      <ModelTimeline entries={modelTimeline} />
    </div>
  );
}
