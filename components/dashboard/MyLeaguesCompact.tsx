'use client';

import Link from 'next/link';
import { Trophy, Medal, Flag } from 'lucide-react';

export interface CompactLeague {
  id: string;
  name: string;
  /** Status tone for the dot on the right. */
  tone: 'green' | 'amber' | 'gray' | 'red';
  /** Optional health score 0–100 for portfolio summary. */
  healthScore?: number;
  /** Optional small label, e.g. "League 2". */
  meta?: string;
}

interface Props {
  leagues: CompactLeague[];
  totalCount?: number;
  /** Portfolio-wide league health counts (empire). */
  portfolioHealth?: { total: number; winning: number; atRisk: number };
  /** Currently-selected league id; when set, the row is highlighted. */
  selectedId?: string | null;
  /** Click handler — pass null to clear / select Empire. */
  onSelect?: (id: string | null) => void;
  className?: string;
}

const DOT_COLORS: Record<CompactLeague['tone'], string> = {
  green: '#36E7A1',
  amber: '#FBBF24',
  gray: '#475569',
  red: '#FF5757',
};

const ICONS = [Trophy, Medal, Flag] as const;

export default function MyLeaguesCompact({
  leagues,
  totalCount,
  portfolioHealth,
  selectedId = null,
  onSelect,
  className = '',
}: Props) {
  const count = totalCount ?? leagues.length;

  return (
    <div className={`glass-panel p-4 ${className}`}>
      {portfolioHealth && (
        <div className="mb-2 flex gap-1 border-b border-white/[0.06] p-2">
          <div className="flex-1 text-center">
            <div className="font-mono-tactical text-[18px] font-black tabular-nums text-[#22D3EE]">
              {portfolioHealth.total}
            </div>
            <div className="mt-0.5 text-[8px] font-mono-tactical uppercase tracking-[0.1em] text-[#64748B]">
              Leagues
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-mono-tactical text-[18px] font-black tabular-nums text-[#36E7A1]">
              {portfolioHealth.winning}
            </div>
            <div className="mt-0.5 text-[8px] font-mono-tactical uppercase tracking-[0.1em] text-[#64748B]">
              Winning
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-mono-tactical text-[18px] font-black tabular-nums text-[#EF4444]">
              {portfolioHealth.atRisk}
            </div>
            <div className="mt-0.5 text-[8px] font-mono-tactical uppercase tracking-[0.1em] text-[#64748B]">
              At Risk
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <Trophy className="w-3 h-3 text-[#FEBC2E]" />
          My Leagues
          <span className="text-[10px] font-mono-tactical text-slate-600">({count})</span>
        </h3>
        <div className="flex items-center gap-2">
          {onSelect && selectedId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-[9px] font-bold text-slate-500 hover:text-white transition-colors"
            >
              Empire ✕
            </button>
          )}
          <Link
            href="/dashboard/mission-control"
            className="text-[10px] font-bold text-[#22D3EE] hover:text-white transition-colors"
          >
            View All →
          </Link>
        </div>
      </div>

      <ul className="space-y-1.5">
        {leagues.slice(0, 5).map((lg, i) => {
          const Icon = ICONS[i % ICONS.length] ?? Trophy;
          const active = selectedId === lg.id;

          const inner = (
            <>
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: active ? 'rgba(54,231,161,0.18)' : 'rgba(99,102,241,0.12)',
                  border: active
                    ? '1px solid rgba(54,231,161,0.4)'
                    : '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <Icon
                  className="w-3 h-3"
                  style={{ color: active ? '#36E7A1' : '#818CF8' }}
                />
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[11px] font-semibold truncate transition-colors ${
                    active ? 'text-[#36E7A1]' : 'text-white group-hover:text-[#36E7A1]'
                  }`}
                >
                  {lg.name}
                </div>
                {lg.meta && (
                  <div className="text-[9px] text-slate-600 font-mono-tactical">
                    {lg.meta}
                  </div>
                )}
              </div>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: DOT_COLORS[lg.tone],
                  boxShadow: `0 0 6px ${DOT_COLORS[lg.tone]}`,
                }}
                aria-label={lg.tone}
              />
            </>
          );

          return (
            <li
              key={lg.id}
              className={`border-b border-white/[0.03] pb-1.5 last:border-0 rounded ${
                active ? 'bg-white/[0.03]' : ''
              }`}
            >
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(active ? null : lg.id)}
                  className="w-full flex items-center gap-2.5 group text-left px-1 py-0.5"
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={`/dashboard/league/${lg.id}`}
                  className="flex items-center gap-2.5 group px-1 py-0.5"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
