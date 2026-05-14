'use client';

import { useState } from 'react';
import type { LeagueConnectionRow } from '@/app/api/settings/profile/route';

interface Props {
  leagues: LeagueConnectionRow[];
}

const ROLE_COLORS: Record<string, string> = {
  Commissioner: '#36E7A1',
  'Co-Owner':   '#22D3EE',
  Owner:        '#A78BFA',
};

function LeagueIcon({ name }: { name: string }) {
  const colors = ['#36E7A1', '#22D3EE', '#A78BFA', '#FBBF24', '#EF4444'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
    >
      {name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function LeagueConnections({ leagues }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div
      className="rounded-xl overflow-hidden mb-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="text-[13px] font-bold text-white">
          LEAGUE CONNECTIONS ({leagues.length})
        </p>
        <button className="text-[11px] font-medium" style={{ color: '#36E7A1' }}>Manage Leagues</button>
      </div>

      {/* League rows */}
      {leagues.length === 0 && (
        <div className="px-5 py-8 text-center text-slate-500 text-[12px]">
          No leagues connected. Connect your Sleeper account to get started.
        </div>
      )}

      {leagues.map((league) => (
        <div
          key={league.id}
          className="flex items-center gap-4 px-5 py-4 border-b transition-colors hover:bg-white/[0.02]"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <LeagueIcon name={league.name} />

          {/* Name + format */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{league.name}</p>
            <p className="text-[11px] text-slate-500">{league.format}</p>
          </div>

          {/* Role badge */}
          <span
            className="text-[10px] font-bold px-2 py-1 rounded hidden sm:block flex-shrink-0"
            style={{ color: ROLE_COLORS[league.role] ?? '#64748B', background: `${ROLE_COLORS[league.role] ?? '#64748B'}15`, border: `1px solid ${ROLE_COLORS[league.role] ?? '#64748B'}30` }}
          >
            {league.role}
          </span>

          {/* Since */}
          <p className="text-[11px] text-slate-500 hidden md:block w-24 flex-shrink-0">{league.since}</p>

          {/* Championships */}
          <div className="text-right hidden md:block w-24 flex-shrink-0">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Champions</p>
            <p className="text-[13px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: league.championships > 0 ? '#FBBF24' : '#64748B' }}>
              {league.championships}
            </p>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setOpen(open === league.id ? null : league.id)}
              className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="2.5" r="1" fill="currentColor"/>
                <circle cx="7" cy="7"   r="1" fill="currentColor"/>
                <circle cx="7" cy="11.5" r="1" fill="currentColor"/>
              </svg>
            </button>
            {open === league.id && (
              <div
                className="absolute right-0 top-8 z-10 rounded-xl overflow-hidden py-1 min-w-[140px]"
                style={{ background: '#131720', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {['View League', 'Edit Settings', 'Disconnect'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setOpen(null)}
                    className="w-full text-left px-4 py-2 text-[12px] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                    style={{ color: item === 'Disconnect' ? '#EF4444' : undefined }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Connect another */}
      <div className="px-5 py-3">
        <button
          className="text-[12px] font-medium transition-colors"
          style={{ color: '#36E7A1' }}
        >
          + Connect Another League
        </button>
      </div>
    </div>
  );
}
