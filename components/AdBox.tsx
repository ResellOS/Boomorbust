'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export type AdBoxSlot = 'sidebar_top' | 'sidebar_mid' | 'dashboard_row' | 'dashboard_corner';

export interface AdBoxProps {
  slot: AdBoxSlot;
  tier: 'free' | 'pro' | 'elite';
  premiumContent?: ReactNode;
  className?: string;
}

type AdSlotContent = { height: number; placeholder: string };

function getAdContent(slot: AdBoxSlot): AdSlotContent {
  const contents: Record<AdBoxSlot, AdSlotContent> = {
    sidebar_top: { height: 120, placeholder: 'SLEEPER PARTNER AD' },
    sidebar_mid: { height: 80, placeholder: 'DYNASTY TOOLS AD' },
    dashboard_row: { height: 80, placeholder: 'FANTASY SPORTS AD' },
    dashboard_corner: { height: 100, placeholder: 'UPGRADE YOUR GAME' },
  };
  return contents[slot] ?? { height: 80, placeholder: 'AD' };
}

export default function AdBox({ slot, tier, premiumContent, className }: AdBoxProps) {
  const isPaid = tier === 'pro' || tier === 'elite';

  /** Paid tiers never see placeholder ads — empty slot if premium not wired yet. */
  if (isPaid) {
    if (!premiumContent) return null;
    return <div className={className}>{premiumContent}</div>;
  }

  const adContent = getAdContent(slot);

  return (
    <div
      className={clsx(
        'glass-panel flex flex-col items-center justify-center gap-3 rounded-lg border border-white/[0.06]',
        className,
      )}
    >
      <div
        style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono-tactical), ui-monospace, monospace',
          color: '#475569',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        ADVERTISEMENT
      </div>

      <div
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.06)',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 16,
          minHeight: adContent.height,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#475569',
            fontFamily: 'var(--font-mono-tactical), ui-monospace, monospace',
            textAlign: 'center',
          }}
        >
          {adContent.placeholder}
        </div>

        <Link
          href="/dashboard/settings#billing"
          className="font-mono-tactical text-[9px] uppercase tracking-[0.1em] no-underline rounded-full px-2.5 py-1 border transition-colors hover:bg-[#22D3EE]/15"
          style={{
            color: '#22D3EE',
            borderColor: 'rgba(34,211,238,0.2)',
            background: 'rgba(34,211,238,0.06)',
          }}
        >
          UPGRADE TO REMOVE ADS →
        </Link>
      </div>
    </div>
  );
}
