'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import SignalsPanel from './SignalsPanel';
import OvervaluedPanel from './OvervaluedPanel';
import type { SignalsResponse } from '@/app/api/dashboard/signals/route';

export default function SignalsRow({
  className,
  vertical = false,
}: {
  className?: string;
  vertical?: boolean;
}) {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);

  const [data,    setData]    = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const lgParam = activeLeagueId ?? 'all';
    const url = `/api/dashboard/signals?leagueId=${encodeURIComponent(lgParam)}`;

    (async () => {
      try {
        const res = await fetch(url, { credentials: 'include', signal: controller.signal });
        if (!res.ok) throw new Error('fetch failed');
        setData((await res.json()) as SignalsResponse);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeLeagueId]);

  if (vertical) {
    return (
      <div
        className={`flex flex-col gap-3 ${className ?? ''}`}
        style={{ alignItems: 'stretch' }}
      >
        <SignalsPanel data={data} loading={loading} />
        <OvervaluedPanel data={data} loading={loading} />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 ${className ?? ''}`}
      style={{ alignItems: 'stretch' }}
    >
      {/* Signals donut — ~45% width on desktop */}
      <div className="sm:w-[45%] shrink-0">
        <SignalsPanel data={data} loading={loading} />
      </div>

      {/* Overvalued list — remaining ~55% */}
      <OvervaluedPanel data={data} loading={loading} />
    </div>
  );
}
