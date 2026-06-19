'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bob_startsit_offseason_banner_dismissed';

interface OffseasonContextBannerProps {
  isOffseason: boolean;
}

export default function OffseasonContextBanner({ isOffseason }: OffseasonContextBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isOffseason) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(globalThis.localStorage?.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, [isOffseason]);

  if (!isOffseason || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="mx-[18px] mb-2 flex items-start justify-between gap-3 rounded-md px-3 py-2.5"
      style={{
        background: '#0f1420',
        borderLeft: '3px solid #36E7A1',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="font-figtree text-[10px] font-semibold text-text">Preseason Mode</div>
        <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-muted">
          Preseason Mode — projections are based on 2025 historical data and will update
          significantly as 2026 training camp and preseason games provide new data. All calls are
          tracked starting Week 1.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 border-none bg-transparent px-1 font-mono text-[10px] text-muted hover:text-text"
        aria-label="Dismiss preseason notice"
      >
        ✕
      </button>
    </div>
  );
}
