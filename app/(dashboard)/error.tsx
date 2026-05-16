'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0d14' }}>
      <div className="text-center max-w-md">
        <p
          className="text-[10px] uppercase tracking-[0.18em] text-[#EF4444]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          Dashboard Error
        </p>
        <h1
          className="mt-2 text-[24px] font-bold text-white"
          style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
        >
          Something Went Wrong Loading Your Dashboard
        </h1>
        <p className="mt-3 text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          Try syncing your leagues first.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg px-6 text-[13px] font-semibold text-[#0a0d14]"
            style={{ background: '#36E7A1' }}
          >
            Try Again
          </button>
          <a
            href="/api/sync/trigger"
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/[0.15] px-6 text-[13px] font-semibold text-white"
          >
            Sync Leagues
          </a>
        </div>
        {error.digest ? (
          <p className="mt-4 text-[10px] text-[#475569]" style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}>
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
