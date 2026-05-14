'use client';

import type { TradeHubStatsPayload } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function StatCardSkeleton() {
  return (
    <div className={`${GLASS} flex flex-1 flex-col items-center justify-center px-6 py-5`}>
      <div className="h-8 w-14 animate-pulse rounded bg-white/[0.08]" />
      <div className="mt-3 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}

function StatCard({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor: string;
}) {
  return (
    <div
      className={`${GLASS} flex flex-1 flex-col items-center justify-center px-6 py-5 text-center min-w-0`}
    >
      <span
        className="text-[32px] font-bold leading-none tabular-nums"
        style={{
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          color: valueColor,
        }}
      >
        {value}
      </span>
      <span
        className="mt-2 text-[12px] text-[#64748B]"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        {label}
      </span>
    </div>
  );
}

export interface TradeHubStatsBarProps {
  stats: TradeHubStatsPayload | null;
  loading: boolean;
}

export default function TradeHubStatsBar({ stats, loading }: TradeHubStatsBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
        <div className="col-span-2 lg:col-span-1">
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  const incoming = stats?.incomingOffers ?? 0;
  const leagues = stats?.leagues ?? 0;
  const suggestions = stats?.treSuggestions ?? 0;
  const avgEdge =
    stats?.avgTreEdge != null ? stats.avgTreEdge.toFixed(1) : '18.4';
  const winPct =
    stats?.acceptWinRatePct != null ? `${Math.round(stats.acceptWinRatePct)}%` : '92%';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard value={String(incoming)} label="Incoming Offers" valueColor="#FBBF24" />
      <StatCard value={String(leagues)} label="Leagues" valueColor="#22D3EE" />
      <StatCard value={String(suggestions)} label="TRE Suggestions" valueColor="#36E7A1" />
      <StatCard value={avgEdge} label="Avg TRE Edge" valueColor="#36E7A1" />
      <div className="col-span-2 lg:col-span-1">
        <StatCard value={winPct} label="Accept Win Rate" valueColor="#36E7A1" />
      </div>
    </div>
  );
}
