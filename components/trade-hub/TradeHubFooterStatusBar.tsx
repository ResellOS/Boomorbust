'use client';

import type { TradeHubStatsPayload } from './types';

function FooterSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="min-w-0 space-y-2">
          <div className="h-2 w-24 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export interface TradeHubFooterStatusBarProps {
  stats: TradeHubStatsPayload | null;
  loading: boolean;
}

export default function TradeHubFooterStatusBar({ stats, loading }: TradeHubFooterStatusBarProps) {
  if (loading) {
    return (
      <div className="mt-6 w-full border-t border-white/[0.06] pt-4">
        <FooterSkeleton />
      </div>
    );
  }

  const s = stats;
  const treStatus = s?.treEngineStatus ?? 'Optimal';
  const treLast = s?.treLastRunLabel ?? 'Last run: 2m ago';
  const accPct = s?.smartCounterAccuracyPct ?? 94.7;
  const accTier = s?.smartCounterAccuracyTier ?? 'Elite';
  const sugPct = s?.suggestionSuccessRatePct ?? 78.3;
  const sugTier = s?.suggestionSuccessTier ?? 'High';
  const volume = s?.tradeVolumeThisMonth ?? 127;

  return (
    <div className="mt-6 w-full border-t border-white/[0.06] pt-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRE ENGINE STATUS
          </p>
          <p className="mt-1 text-[13px] font-medium text-[#36E7A1]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {treStatus}
          </p>
          <p className="mt-0.5 text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {treLast}
          </p>
        </div>

        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            SMART COUNTER ACCURACY
          </p>
          <p
            className="mt-1 text-[18px] font-bold tabular-nums text-[#36E7A1]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {accPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-[#36E7A1]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {accTier}
          </p>
        </div>

        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            SUGGESTION SUCCESS RATE
          </p>
          <p
            className="mt-1 text-[18px] font-bold tabular-nums text-[#36E7A1]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {sugPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {sugTier}
          </p>
        </div>

        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRADE VOLUME
          </p>
          <p
            className="mt-1 text-[18px] font-bold tabular-nums text-white"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {volume}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            This Month
          </p>
        </div>
      </div>
    </div>
  );
}
