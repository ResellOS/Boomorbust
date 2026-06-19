'use client';

import Link from 'next/link';
import type { DraftConfig, DraftGradeSummary, DraftPickRecord } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';

interface DraftCompleteProps {
  summary: DraftGradeSummary;
  config: DraftConfig;
  allPicks: DraftPickRecord[];
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
  allPicks,
  onRestart,
}: DraftCompleteProps) {
  const gradeColor = GRADE_COLOR[summary.grade] ?? '#FBBF24';
  const rounds = config.rounds;

  return (
    <main className="col-span-4 min-h-0 overflow-y-auto" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-8">
        <div>
          <div className="font-figtree text-[12px] font-bold uppercase tracking-[2px] text-muted">
            Draft Complete
          </div>
          <h1 className="font-figtree text-[28px] font-extrabold text-text">{config.draftName}</h1>
        </div>

        <div className="grid grid-cols-[140px_1fr] gap-4">
          <div
            className="flex flex-col items-center justify-center rounded-[12px] border bg-surface/60 py-6"
            style={{ borderColor: `${gradeColor}55` }}
          >
            <div className="font-figtree text-[56px] font-extrabold leading-none" style={{ color: gradeColor }}>
              {summary.grade}
            </div>
            <div className="mt-2 text-center font-mono text-[10px] text-muted">
              Draft Grade
              <br />
              {summary.agreementRate.toFixed(0)}% BOB alignment
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Avg BOB Score" value={summary.avgTfo.toFixed(1)} />
            <Stat label="Your Picks" value={String(summary.userPicks.length)} />
            <Stat
              label="Best Value"
              value={summary.bestValue?.player.name ?? '—'}
              sub={summary.bestValue ? `+${summary.bestValue.margin} vs ADP` : undefined}
            />
            <Stat
              label="Biggest Reach"
              value={summary.biggestReach?.player.name ?? '—'}
              sub={summary.biggestReach ? `${summary.biggestReach.margin} early` : undefined}
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-border bg-surface/60 p-4">
          <div className="mb-3 font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
            Your Roster — BOB Grades
          </div>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {summary.userPicks.map((pk) => (
              <div
                key={pk.overall}
                className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[9px] text-muted">
                    {pk.round}.{String(pk.slot).padStart(2, '0')}
                  </span>
                  <PositionBadge position={pk.player.position} />
                  <span className="truncate font-figtree text-[12px] text-text">{pk.player.name}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-boom">
                  {pk.player.tfoScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-border bg-surface/40 p-4">
          <div className="mb-3 font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
            Full Draft Recap
          </div>
          <div className="max-h-[320px] overflow-y-auto [scrollbar-width:thin]">
            {Array.from({ length: rounds }, (_, ri) => {
              const round = ri + 1;
              const roundPicks = allPicks.filter((p) => p.round === round);
              return (
                <div key={round} className="mb-3">
                  <div className="mb-1 font-mono text-[9px] font-bold text-boom">Round {round}</div>
                  <div className="flex flex-wrap gap-2">
                    {roundPicks.map((pk) => (
                      <span
                        key={pk.overall}
                        className="rounded-[4px] border border-border/60 px-2 py-0.5 font-figtree text-[10px]"
                        style={{ borderColor: `${positionColor(pk.player.position)}40` }}
                      >
                        {pk.slot}: {pk.player.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-[8px] bg-boom px-6 py-2.5 font-figtree text-[13px] font-extrabold uppercase text-bg"
          >
            New Draft
          </button>
          <Link
            href="/players"
            className="rounded-[8px] border border-border px-6 py-2.5 font-figtree text-[13px] font-extrabold uppercase text-text no-underline"
          >
            Player Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-bg/40 px-3.5 py-3">
      <div className="mb-1 font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
        {label}
      </div>
      <div className="truncate font-figtree text-[15px] font-extrabold text-text">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[9px] text-muted">{sub}</div>}
    </div>
  );
}
