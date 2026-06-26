'use client';

import Link from 'next/link';
import type { WeeklyCompletion } from '@/lib/startsit/types';

interface WeeklyCompletionCardProps {
  completion: WeeklyCompletion;
}

export default function WeeklyCompletionCard({ completion }: WeeklyCompletionCardProps) {
  const { pct, leaguesComplete, leaguesTotal, decisionsComplete, decisionsTotal } = completion;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
        Weekly Completion
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-[64px] w-[64px] shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e2640" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#36E7A1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 0.6s ease-out',
                filter: 'drop-shadow(0 0 4px rgba(54,231,161,0.4))',
              }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[14px] text-boom">
            {pct}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-text">
            {leaguesComplete} of {leaguesTotal} leagues
          </div>
          <div className="font-mono text-[10px] text-muted">
            {decisionsComplete} of {decisionsTotal} decisions complete
          </div>
          <Link
            href="/dashboard"
            className="mt-1.5 inline-block font-mono text-[9px] text-boom hover:underline"
          >
            View Portfolio →
          </Link>
        </div>
      </div>
    </div>
  );
}
