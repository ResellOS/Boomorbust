'use client';

import Link from 'next/link';
import type { FrontOfficePriority } from '@/lib/dashboard/rotation';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';

export default function FrontOfficePriorityBanner({
  priority,
}: {
  priority: FrontOfficePriority | null;
}) {
  if (!priority) return null;

  const verdictLabel = formatMarketVerdictLabel(priority.verdict);

  return (
    <Link
      href={`/trade?target=${encodeURIComponent(priority.playerId)}`}
      className="group flex flex-col gap-1 rounded-[8px] border border-[#f59e0b]/35 bg-[#f59e0b]/[0.06] px-3.5 py-2.5 no-underline transition-colors hover:border-[#f59e0b]/55 hover:bg-[#f59e0b]/[0.09]"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[1.2px] text-[#f59e0b]">
          ⚡ Priority Action
        </span>
      </div>
      <p className="font-figtree text-[14px] font-semibold leading-snug text-text">
        {priority.playerName} — {verdictLabel} detected
      </p>
      <p className="font-mono text-[11px] text-muted">
        BOB rates market overvalue by +{priority.spotGap} spots
      </p>
      <span className="mt-0.5 font-figtree text-[12px] font-semibold text-[#f59e0b] group-hover:text-[#fbbf24]">
        → View in Trade Hub
      </span>
    </Link>
  );
}
