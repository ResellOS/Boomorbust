'use client';

import { LEAGUE_ROTATE_SECONDS } from '@/lib/dashboard/constants';
import { LEAGUE_STATUS, type LeagueBundle } from '@/lib/dashboard/rotation';

interface LeagueRotationHeaderProps {
  league: LeagueBundle | null;
  mode: 'rotate' | 'all' | string;
  secondsLeft: number;
  rotateSeconds?: number;
  leagueCount: number;
}

export default function LeagueRotationHeader({
  league,
  mode,
  secondsLeft,
  rotateSeconds = LEAGUE_ROTATE_SECONDS,
  leagueCount,
}: LeagueRotationHeaderProps) {
  if (!league) {
    return (
      <div
        className="flex w-full items-center gap-2.5 rounded-[8px] border border-[#1e2640] bg-[#0f1420] px-3.5 py-2"
        style={{ borderLeftWidth: 3, borderLeftColor: '#36E7A1' }}
      >
        <span className="h-2 w-2 rounded-full bg-boom" style={{ boxShadow: '0 0 8px rgba(54,231,161,0.6)' }} />
        <span className="font-figtree text-[14px] font-semibold tracking-[0.5px] text-[#e8ecf4]">
          ALL LEAGUES
        </span>
        <span className="text-[#6b7a99]">•</span>
        <span className="font-figtree text-[12px] text-[#8b9bb8]">Portfolio</span>
        <span className="text-[#6b7a99]">•</span>
        <span className="font-mono text-[12px] text-[#8b9bb8]">{leagueCount} leagues</span>
      </div>
    );
  }

  const statusMeta = LEAGUE_STATUS[league.status];
  const isRotating = mode === 'rotate';
  const pct = Math.max(0, Math.min(100, (secondsLeft / rotateSeconds) * 100));

  return (
    <div
      className="flex w-full items-center gap-2.5 rounded-[8px] border border-[#1e2640] bg-[#0f1420] px-3.5 py-2"
      style={{ borderLeftWidth: 3, borderLeftColor: statusMeta.color }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{
          background: statusMeta.color,
          boxShadow: `0 0 8px ${statusMeta.color}`,
        }}
      />
      <span className="font-figtree text-[14px] font-semibold uppercase tracking-[0.5px] text-[#e8ecf4]">
        {league.name}
      </span>
      <span className="text-[#6b7a99]">•</span>
      <span
        className="font-figtree text-[12px] font-medium uppercase tracking-[1px]"
        style={{ color: statusMeta.color }}
      >
        {statusMeta.label}
      </span>
      <span className="text-[#6b7a99]">•</span>
      {league.standingRank > 0 ? (
        <span className="font-mono text-[12px] text-[#8b9bb8]">
          {league.record} · #{league.standingRank}/{league.totalTeams}
        </span>
      ) : (
        <span className="font-mono text-[12px] text-[#8b9bb8]">{league.record}</span>
      )}

      {isRotating && (
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <div className="relative h-1.5 w-[140px] overflow-hidden rounded-full bg-[#1e2640]">
            <div
              className="h-full rounded-full bg-boom transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%`, boxShadow: '0 0 8px rgba(54,231,161,0.6)' }}
            />
          </div>
          <span className="w-9 text-right font-mono text-[13px] tabular-nums text-boom">
            {secondsLeft}s
          </span>
        </div>
      )}
    </div>
  );
}
