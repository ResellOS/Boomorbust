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
      className="text-center"
      style={{
        background: 'rgba(54,231,161,0.04)',
        borderTop: '1px solid rgba(54,231,161,0.1)',
        borderBottom: '1px solid rgba(54,231,161,0.1)',
        padding: '24px 48px',
      }}
    >
      <h2 className="text-[28px] text-[#36E7A1]" style={{ fontFamily: 'var(--font-display)' }}>
        🚀 EARLY ACCESS IS LIMITED
      </h2>
      <p
        className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-[#94A3B8]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {n} managers already on the waitlist. Launch pricing locks in for founding members only.
      </p>
      <Link
        href="/auth/signup"
        className="mt-6 inline-flex items-center gap-1 rounded-[10px] px-8 py-[14px] text-[15px] font-bold text-[#060910] transition-opacity hover:opacity-95"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
        }}
      >
        CLAIM YOUR SPOT →
      </Link>
    </section>
  );
}
