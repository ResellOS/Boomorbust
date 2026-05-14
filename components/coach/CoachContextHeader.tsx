'use client';

import type { LeagueContext } from './types';

interface Props {
  leagues: LeagueContext[];
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  'In Playoffs':  '#36E7A1',
  'Your Team':    '#22D3EE',
  'Rebuilding':   '#FBBF24',
  'Contender':    '#A78BFA',
};

function LeagueCard({ league }: { league: LeagueContext }) {
  const color = STATUS_COLORS[league.status] ?? '#64748B';
  return (
    <div
      className="flex-shrink-0 rounded-xl px-4 py-3 min-w-[140px]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <p className="text-[13px] font-semibold text-white truncate">{league.name}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{league.format}</p>
      <p className="text-[10px] font-semibold mt-1" style={{ color }}>{league.status}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 rounded-xl px-4 py-3 min-w-[140px] animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="h-4 bg-white/[0.08] rounded w-3/4 mb-1.5" />
      <div className="h-3 bg-white/[0.06] rounded w-1/2 mb-1.5" />
      <div className="h-3 bg-white/[0.06] rounded w-2/3" />
    </div>
  );
}

export default function CoachContextHeader({ leagues, loading }: Props) {
  const totalRosters  = leagues.length * 12;
  const totalPlayers  = leagues.length * 40;

  return (
    <div className="space-y-3 mb-4">
      {/* Status row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div /> {/* spacer */}
        <div className="flex flex-col items-end gap-1">
          {/* Full Context Active badge */}
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="rgba(54,231,161,0.2)" stroke="#36E7A1" strokeWidth="1"/>
              <path d="M4.5 7l2 2 3-3" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[13px] font-semibold" style={{ color: '#36E7A1' }}>Full Context Active</span>
          </div>
          {/* League stats */}
          <p className="text-[13px] text-slate-400">
            {leagues.length} Leagues · {totalRosters} Rosters · {totalPlayers}+ Players
          </p>
        </div>
      </div>

      {/* League cards row */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          : leagues.length > 0
            ? leagues.map((l) => <LeagueCard key={l.id} league={l} />)
            : (
              <div className="text-[12px] text-slate-500 py-2">
                No leagues found — connect your Sleeper account in settings
              </div>
            )
        }
      </div>
    </div>
  );
}
