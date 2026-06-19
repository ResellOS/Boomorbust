'use client';

import Link from 'next/link';

export default function BobRecordWidget() {
  return (
    <div className="shrink-0 overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="border-b border-[#1e2640]/80 px-3 py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          BOB Track Record
        </span>
      </div>
      <div className="space-y-2 px-3 py-3 font-mono text-[10px]">
        <div className="flex justify-between">
          <span className="text-[#6b7a99]">Season</span>
          <span className="text-[#6b7a99]">—</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7a99]">Hit Rate</span>
          <span className="text-[#6b7a99]">—</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6b7a99]">vs Consensus</span>
          <span className="text-[#6b7a99]">—</span>
        </div>
        <div className="mt-2 h-8 rounded border border-[#1e2640]/60 bg-[#141929]/40" aria-hidden />
        <p className="border-t border-[#1e2640]/50 pt-2 font-figtree text-[9px] leading-relaxed text-[#6b7a99]">
          Tracking begins Week 1
        </p>
        <p className="font-figtree text-[9px] leading-relaxed text-[#6b7a99]">
          Every call logged publicly
        </p>
        <Link href="/performance" className="block font-mono text-[9px] text-boom no-underline hover:underline">
          View Full Record →
        </Link>
      </div>
    </div>
  );
}
