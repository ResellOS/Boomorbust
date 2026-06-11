'use client';

import Link from 'next/link';
import type { DraftConfig, DraftGradeSummary } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';

interface DraftCompleteProps {
  summary: DraftGradeSummary;
  config: DraftConfig;
  onRestart: () => void;
}

const GRADE_COLOR: Record<string, string> = {
  A: '#36E7A1',
  B: '#36E7A1',
  C: '#FBBF24',
  D: '#EF4444',
};

function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[26px] items-center justify-center rounded-[4px] px-1 font-mono text-[9px] font-bold"
      style={{ color: positionColor(position), background: `${positionColor(position)}1a` }}
    >
      {position}
    </span>
  );
}

export default function DraftComplete({
  summary,
  config,
  onRestart,
}: DraftCompleteProps) {
  const gradeColor = GRADE_COLOR[summary.grade] ?? '#FBBF24';

  return (
    <main
      className="row-start-2 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gridColumn: '2 / -1' }}
    >
      <div className="mx-auto flex w-full max-w-[780px] flex-col gap-6 px-6 py-8">
        <div>
          <div className="font-figtree text-[12px] font-bold uppercase tracking-[2px] text-muted">
            Draft Complete
          </div>
          <h1 className="font-figtree text-[26px] font-extrabold tracking-[-0.5px] text-text">
            Your Draft Grade
          </h1>
        </div>

        {/* Grade + headline stats */}
        <div className="grid grid-cols-[160px_1fr] gap-4">
          <div
            className="flex flex-col items-center justify-center rounded-[12px] border bg-surface/60 py-6"
            style={{ borderColor: `${gradeColor}55` }}
          >
            <div
              className="font-figtree text-[64px] font-extrabold leading-none"
              style={{ color: gradeColor }}
            >
              {summary.grade}
            </div>
            <div className="mt-2 font-mono text-[11px] text-muted">
              Avg TFO {summary.avgTfo.toFixed(1)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="BOB Agreement" value={`${summary.agreementRate.toFixed(0)}%`} sub="picks followed BOB" />
            <Stat label="Picks Made" value={String(summary.userPicks.length)} sub={`${config.rounds} rounds`} />
            <Stat
              label="Best Value"
              value={summary.bestValue ? summary.bestValue.player.name : '—'}
              sub={
                summary.bestValue
                  ? `+${summary.bestValue.margin} vs ADP`
                  : 'no standout value'
              }
              tone="boom"
            />
            <Stat
              label="Biggest Reach"
              value={summary.biggestReach ? summary.biggestReach.player.name : '—'}
              sub={
                summary.biggestReach
                  ? `${summary.biggestReach.margin} spots early`
                  : 'no reaches'
              }
              tone="bust"
            />
          </div>
        </div>

        {/* Roster */}
        <div className="rounded-[12px] border border-border bg-surface/60 p-4">
          <div className="mb-3 font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
            Your Roster
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
            {summary.userPicks.map((pk) => (
              <div
                key={pk.overall}
                className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-7 shrink-0 font-mono text-[9px] text-muted">
                    {pk.round}.{String(pk.slot).padStart(2, '0')}
                  </span>
                  <PositionBadge position={pk.player.position} />
                  <span className="truncate font-figtree text-[12px] text-text">
                    {pk.player.name}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-boom">
                  {pk.player.tfoScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-[8px] bg-boom px-6 py-2.5 font-figtree text-[13px] font-extrabold uppercase tracking-[1px] text-bg transition-opacity hover:opacity-90"
          >
            Start New Draft
          </button>
          <Link
            href="/players"
            className="rounded-[8px] border border-border px-6 py-2.5 font-figtree text-[13px] font-extrabold uppercase tracking-[1px] text-text no-underline transition-colors hover:border-boom/50"
          >
            View Full Roster
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'boom' | 'bust';
}) {
  const color =
    tone === 'boom' ? 'text-boom' : tone === 'bust' ? 'text-bust' : 'text-text';
  return (
    <div className="rounded-[10px] border border-border bg-bg/40 px-3.5 py-3">
      <div className="mb-1 font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
        {label}
      </div>
      <div className={`truncate font-figtree text-[16px] font-extrabold ${color}`}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[9px] text-muted">{sub}</div>
    </div>
  );
}
