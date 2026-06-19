'use client';

import Link from 'next/link';
import type { VerdictExposureSummary } from '@/lib/exposure/types';

export default function VerdictExposureCards({
  summary,
}: {
  summary: VerdictExposureSummary;
}) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-boom/25 bg-boom/[0.06] p-4">
        <div className="font-mono text-[9px] uppercase tracking-wide text-boom">
          Buy Now / Buy Window
        </div>
        <div className="mt-2 font-mono text-[20px] text-text">{summary.buyCount}</div>
        <div className="font-mono text-[10px] text-muted">players across your rosters</div>
        <div className="mt-2 font-mono text-[11px] text-boom">
          Portfolio Impact: +{summary.buyImpact}%
        </div>
        <p className="mt-1 font-mono text-[9px] text-muted">These positions are well-valued</p>
        <Link href="/trade" className="mt-2 inline-block font-mono text-[9px] text-boom hover:underline">
          View in Trade Hub →
        </Link>
      </div>

      <div className="rounded-lg border border-bust/25 bg-bust/[0.06] p-4">
        <div className="font-mono text-[9px] uppercase tracking-wide text-bust">
          Sell Now / Sell Window
        </div>
        <div className="mt-2 font-mono text-[20px] text-text">{summary.sellCount}</div>
        <div className="font-mono text-[10px] text-muted">players across your rosters</div>
        <div className="mt-2 font-mono text-[11px] text-bust">
          Portfolio Risk: -{summary.sellRisk}%
        </div>
        <p className="mt-1 font-mono text-[9px] text-muted">Consider reducing exposure</p>
        <Link href="/trade" className="mt-2 inline-block font-mono text-[9px] text-bust hover:underline">
          View in Trade Hub →
        </Link>
      </div>
    </div>
  );
}
