'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingWaitlistUrgency() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/waitlist/count')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d: { count?: unknown }) => {
        if (cancelled) return;
        const n = typeof d.count === 'number' && Number.isFinite(d.count) ? d.count : 0;
        setCount(n);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const n = count ?? 0;

  return (
    <section
      className="px-4 py-8 text-center sm:px-6 sm:py-10"
      style={{
        background: 'rgba(62,207,173,0.04)',
        borderTop: '1px solid rgba(62,207,173,0.1)',
        borderBottom: '1px solid rgba(62,207,173,0.1)',
      }}
    >
      <h2
        className="text-[clamp(1.15rem,5.5vw,1.75rem)] text-[#3ECFAD] sm:text-[clamp(1.35rem,4vw,1.75rem)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        🚀 EARLY ACCESS IS LIMITED
      </h2>
      <p
        className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-[#94A3B8] sm:text-[15px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="font-mono tabular-nums font-semibold text-[#94A3B8]">{n}</span>{' '}
        managers already on the waitlist. Launch pricing locks in for founding members only.
      </p>
      <Link
        href="/signup"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-1 rounded-[10px] px-6 py-3 text-[15px] font-bold text-[#0a0d14] transition-opacity hover:opacity-95 sm:px-8 sm:text-[16px]"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3ECFAD, #22D3EE)',
        }}
      >
        CLAIM YOUR SPOT →
      </Link>
    </section>
  );
}
