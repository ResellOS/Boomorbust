'use client';

import { useEffect, useState } from 'react';

function StatPair({
  num,
  label,
  numColor,
  numClassName,
}: {
  num: string;
  label: string;
  numColor: string;
  numClassName?: string;
}) {
  const numeric = /\d/.test(num);
  return (
    <div>
      <div
        className={`font-bold leading-none max-w-[min(100vw-3rem,320px)] break-words sm:max-w-none ${numeric ? 'font-mono tabular-nums' : ''} ${numClassName ?? 'text-[52px]'}`}
        style={{ fontFamily: numeric ? undefined : 'var(--font-body)', color: numColor }}
      >
        {num}
      </div>
      <div className="mt-0.5 text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  );
}

export default function WaitlistStatRow() {
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

  if (count === null) {
    return <StatPair num="—" label="MANAGERS ON WAITLIST" numColor="#8B5CF6" />;
  }

  if (count < 10) {
    return <StatPair num="EARLY ACCESS" label="MANAGERS ON WAITLIST" numColor="#8B5CF6" numClassName="text-[clamp(22px,4vw,52px)]" />;
  }

  return (
    <StatPair
      num={`${count.toLocaleString()} ON WAITLIST`}
      label="MANAGERS ON WAITLIST"
      numColor="#8B5CF6"
      numClassName="text-[clamp(22px,4vw,52px)]"
    />
  );
}
