'use client';

import type { PortfolioOverview } from '@/lib/exposure/types';

const BENCHMARK_LABEL = 'vs Winning Dynasty Portfolio Avg';

function statusColor(status: 'good' | 'warn' | 'bad'): string {
  if (status === 'good') return '#36E7A1';
  if (status === 'warn') return '#FBBF24';
  return '#EF4444';
}

export default function PortfolioOverviewCard({ overview }: { overview: PortfolioOverview }) {
  return (
    <div
      className="mb-4 rounded-lg border border-border/80 px-4 py-4 md:px-5"
      style={{
        background: 'linear-gradient(180deg, #0f1420 0%, rgba(15,20,32,0.6) 100%)',
        borderImage: 'linear-gradient(90deg, rgba(54,231,161,0.25), rgba(167,139,250,0.15)) 1',
      }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
        Dynasty Portfolio
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text">
        <span>
          Total Asset Value:{' '}
          <span className="text-boom">{overview.totalAssetValue.toLocaleString()}</span>
        </span>
        <span className="text-muted">·</span>
        <span>{overview.leaguesConnected} Leagues</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
        <span>
          Championship Odds:{' '}
          <span className="text-text">{overview.championshipOdds}%</span>
          <span className="ml-1 text-[8px]">Estimated</span>
        </span>
        <span>·</span>
        <span>
          Risk: <span className="text-hold">{overview.portfolioRisk}</span>
        </span>
        <span>·</span>
        <span>
          Grade: <span className="text-boom">{overview.portfolioGrade}</span>
        </span>
        <span>·</span>
        <span>
          Largest Position:{' '}
          <span className="text-text">
            {overview.largestPosition} ({overview.largestPositionPct}%)
          </span>
        </span>
      </div>

      <div className="mt-4 space-y-3 overflow-x-auto">
        {overview.positionBreakdown.map((row) => (
          <div key={row.position} className="min-w-[280px]">
            <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
              <span style={{ color: row.color }}>{row.position}</span>
              <span className="text-text">{row.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, row.pct)}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-[#1e2640] pt-3">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-wide text-muted">
          {BENCHMARK_LABEL}
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-[9px]">
          {overview.positionBreakdown.map((row) => (
            <span key={row.position}>
              <span style={{ color: row.color }}>{row.position}</span>{' '}
              <span style={{ color: statusColor(row.benchmarkStatus) }}>
                {row.benchmarkPct}%
              </span>
              <span className="text-muted"> (you {row.pct}%)</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
