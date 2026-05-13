'use client';

/**
 * AdSlot — reusable AdSense ad slot component.
 *
 * Free tier  → renders live AdSense unit + upgrade prompt.
 * Paid tiers → returns null immediately. Zero DOM, zero network, zero impact.
 *
 * Sizes (IAB standard):
 *   rectangle    → 300×250
 *   leaderboard  → 728×90  (desktop-only — hidden on mobile)
 *   mobile-banner → 320×50
 *
 * Usage:
 *   <AdSlot slotId="1234567890" size="rectangle" featureName="Trade Analyzer" />
 */

import { useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import { useUserTierStore, isPaidTier } from '@/store/userTierStore';

// ─── Public types ─────────────────────────────────────────────────────────────

export type AdSlotSize = 'rectangle' | 'leaderboard' | 'mobile-banner';

export interface AdSlotProps {
  /** AdSense numeric slot ID (data-ad-slot). */
  slotId: string;
  size: AdSlotSize;
  /** Shown in the upgrade nudge: "Unlock {featureName}" */
  featureName: string;
  className?: string;
}

// ─── Global shim ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

// ─── Size → dimensions + ad-format ───────────────────────────────────────────

interface SizeCfg {
  w: number;
  h: number;
  /** data-ad-format value per AdSense docs */
  adFormat: 'rectangle' | 'horizontal';
  /** Hide below lg on desktop-only units */
  desktopOnly: boolean;
}

const SIZES: Record<AdSlotSize, SizeCfg> = {
  rectangle: { w: 300, h: 250, adFormat: 'rectangle', desktopOnly: false },
  leaderboard: { w: 728, h: 90, adFormat: 'horizontal', desktopOnly: true },
  'mobile-banner': { w: 320, h: 50, adFormat: 'horizontal', desktopOnly: false },
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const MONO = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdSlot({ slotId, size, featureName, className = '' }: AdSlotProps) {
  const { tier, loading, fetchTier } = useUserTierStore();
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const uid = useId().replace(/:/g, '');

  // Fetch tier once — no-op if already loaded or in-flight
  useEffect(() => {
    void fetchTier();
  }, [fetchTier]);

  const cfg = SIZES[size];
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? '';

  // Push to adsbygoogle once element is mounted and we know user is free
  useEffect(() => {
    if (isPaidTier(tier)) return;
    if (!publisherId) return;
    if (pushed.current) return;
    if (!insRef.current) return;
    // SSR-safe guard — adsbygoogle is browser-only
    if (typeof window === 'undefined') return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Script not yet available — will pick up on next navigation
    }
  }, [tier, publisherId]);

  // ── Paid tier: render nothing ──────────────────────────────────────────
  if (isPaidTier(tier)) return null;

  // ── Loading: invisible spacer prevents layout shift ────────────────────
  if (loading || tier === null) {
    return (
      <div
        aria-hidden="true"
        className={cfg.desktopOnly ? 'hidden lg:block' : ''}
        style={{ width: cfg.w, height: cfg.h + 36 }}
      />
    );
  }

  // ── Free tier: render AdSense unit ────────────────────────────────────
  return (
    <div
      className={[
        'flex flex-col items-center gap-2',
        cfg.desktopOnly ? 'hidden lg:flex' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* "ADVERTISEMENT" micro-label */}
      <p
        className="self-start text-[8px] tracking-[0.18em] uppercase"
        style={{ ...MONO, color: 'rgba(255,255,255,0.16)' }}
      >
        Advertisement
      </p>

      {/* Glassmorphism wrapper — matches dashboard panels */}
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          width: cfg.w,
          minHeight: cfg.h,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {publisherId ? (
          <ins
            ref={insRef}
            id={`ad-${uid}`}
            className="adsbygoogle"
            style={{ display: 'block', width: cfg.w, height: cfg.h }}
            data-ad-client={publisherId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          /* Placeholder — shown when publisher ID not configured yet */
          <div
            className="flex flex-col items-center justify-center gap-1.5 p-4 text-center"
            style={{ width: cfg.w, minHeight: cfg.h }}
          >
            <span
              className="text-[9px] tracking-[0.12em] uppercase"
              style={{ ...MONO, color: 'rgba(255,255,255,0.12)' }}
            >
              Ad · {cfg.w}×{cfg.h}
            </span>
            <span
              className="text-[8px]"
              style={{ ...MONO, color: 'rgba(255,255,255,0.07)' }}
            >
              Set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
            </span>
          </div>
        )}
      </div>

      {/* Upgrade nudge */}
      <p
        className="text-[9px] text-center leading-snug"
        style={{ ...MONO, color: 'rgba(255,255,255,0.25)' }}
      >
        Unlock{' '}
        <span style={{ color: 'rgba(34,211,238,0.65)' }}>{featureName}</span>
        {' '}—{' '}
        <Link
          href="/pricing"
          prefetch={false}
          className="underline underline-offset-2 transition-colors hover:text-white/50"
          style={{ color: 'rgba(34,211,238,0.55)' }}
        >
          upgrade your plan
        </Link>
      </p>
    </div>
  );
}
