'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0a0d14' }}
    >
      <div className="text-center max-w-md">
        <p
          className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF4444]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          Error
        </p>
        <h1
          className="mt-2 text-[28px] font-bold text-white"
          style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
        >
          Something Went Wrong
        </h1>
        <p
          className="mt-3 text-[14px] text-[#64748B]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          Our engineers have been notified.
        </p>
        {error.digest ? (
          <p
            className="mt-2 text-[12px] text-[#475569]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-[#0a0d14] transition hover:opacity-90"
            style={{ background: '#36E7A1', boxShadow: '0 0 20px rgba(54,231,161,0.3)' }}
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/[0.15] px-6 text-[14px] font-semibold text-white transition hover:bg-white/[0.04]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
