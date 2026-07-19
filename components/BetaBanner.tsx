'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'bob_beta_banner_dismissed';

/**
 * Slim beta notice shown across the authenticated terminal. Dismissable, with
 * the dismissal persisted in localStorage so it stays gone. Links to /pricing
 * to lock in founder pricing during the beta window.
 */
export default function BetaBanner() {
  // Render nothing until we've read localStorage on the client — avoids a
  // hydration mismatch and a flash for users who already dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode — banner simply reappears next load */
    }
    setVisible(false);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-boom/25 bg-boom/[0.08] px-3 py-1.5 text-center">
      <span className="font-figtree text-[11px] leading-tight text-text">
        <span className="font-bold text-boom">BETA</span>
        <span className="mx-1 text-muted">·</span>
        Free during beta — founder pricing locks in now.
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/pricing"
          className="rounded-[5px] border border-boom/40 bg-boom/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-boom no-underline transition-colors hover:bg-boom/25"
        >
          Lock in Founder Rate →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss beta banner"
          className="flex h-5 w-5 items-center justify-center rounded font-mono text-[14px] leading-none text-muted transition-colors hover:text-text"
        >
          ×
        </button>
      </div>
    </div>
  );
}
