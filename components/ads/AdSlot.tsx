'use client';

import Link from 'next/link';

/**
 * Lightweight sponsor / upgrade strip for Free tier only.
 * Paid tiers should not render this component (see app/(dashboard)/layout.tsx).
 */
export default function AdSlot() {
  return (
    <div
      className="border-b border-white/[0.06] px-3 py-2 text-center"
      style={{ background: 'rgba(6,9,16,0.85)' }}
    >
      <p className="text-[11px] text-slate-500 font-mono uppercase tracking-[0.12em]">
        <span className="text-slate-400">Sponsor</span>
        {' · '}
        <Link href="/#pricing" className="text-[#22D3EE] hover:underline">
          Upgrade to remove ads
        </Link>
      </p>
    </div>
  );
}
