'use client';

import { pickLabel } from '@/lib/draft/analyst';

interface OnTheClockBannerProps {
  isUserTurn: boolean;
  clock: number;
  currentOverall: number;
  teams: number;
  cpuTeamName?: string;
}

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function OnTheClockBanner({
  isUserTurn,
  clock,
  currentOverall,
  teams,
  cpuTeamName,
}: OnTheClockBannerProps) {
  const urgent = isUserTurn && clock < 10;
  const label = pickLabel(currentOverall, teams);

  if (isUserTurn) {
    return (
      <div
        className={`shrink-0 px-4 py-3 ${urgent ? 'animate-[pulse_0.8s_ease-in-out_infinite]' : 'animate-[pulse_2.5s_ease-in-out_infinite]'}`}
        style={{
          background: urgent ? '#A78BFA' : '#36E7A1',
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <span className="font-mono text-[13px] uppercase tracking-wide" style={{ color: '#0a0d14' }}>
            ⚡ You Are On The Clock
          </span>
          <span className="font-mono text-[13px]" style={{ color: '#0a0d14', opacity: 0.7 }}>
            •
          </span>
          <span className="font-mono text-[13px] uppercase" style={{ color: '#0a0d14' }}>
            {label}
          </span>
        </div>
        <div
          className={`mt-1 text-center font-mono text-[28px] tabular-nums leading-none ${urgent ? 'animate-[pulse_0.5s_ease-in-out_infinite]' : ''}`}
          style={{ color: '#0a0d14' }}
        >
          {fmtClock(clock)} remaining
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 overflow-hidden px-4 py-3" style={{ background: '#1e2640' }}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="relative text-center font-mono text-[12px] uppercase tracking-wide text-muted">
        CPU On The Clock — Picking…
      </div>
      <div className="relative mt-0.5 text-center font-mono text-[11px] text-muted/80">
        {cpuTeamName ?? 'Opponent'} · {label}
      </div>
    </div>
  );
}
