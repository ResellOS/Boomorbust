'use client';

import { useEffect, useRef } from 'react';
import { getAdConfig, type AdPlacement } from '@/lib/ads/config';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdSlotProps {
  placement: AdPlacement;
  /** Pass true only when subscription_tier === 'free'. */
  showAds: boolean;
  className?: string;
}

export default function AdSlot({ placement, showAds, className = '' }: AdSlotProps) {
  const pushed = useRef(false);
  const { clientId, slotId } = getAdConfig(placement);

  useEffect(() => {
    if (!showAds || !clientId || !slotId || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // AdSense may be blocked by the browser — fail silently.
    }
  }, [showAds, clientId, slotId]);

  if (!showAds || !clientId || !slotId) return null;

  return (
    <div className={`overflow-hidden rounded-[7px] border border-border/60 bg-surface2/40 p-2 ${className}`}>
      <div className="mb-1.5 text-center font-mono text-[8px] uppercase tracking-[2px] text-muted/50">
        Sponsored
      </div>
      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
