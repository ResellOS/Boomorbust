'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';

export type PricingCheckoutPlan = 'rookie' | 'veteran' | 'allpro';

export default function PricingCheckoutButton({
  plan,
  className,
  style,
  children,
}: {
  plan: PricingCheckoutPlan;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'same-origin',
      });

      // Not authenticated — send to signup with plan pre-selected
      if (res.status === 401) {
        window.location.assign(`/signup?plan=${encodeURIComponent(plan)}`);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (res.ok && typeof data.url === 'string') {
        window.location.assign(data.url);
        return;
      }

      // Stripe not configured or other server error — fall back to signup flow
      console.error('[checkout]', data.error ?? `HTTP ${res.status}`);
      window.location.assign(`/signup?plan=${encodeURIComponent(plan)}`);
    } catch {
      // Network error — fall back to signup flow
      window.location.assign(`/signup?plan=${encodeURIComponent(plan)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={handleClick} className={className} style={style}>
      {busy ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Loading…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
