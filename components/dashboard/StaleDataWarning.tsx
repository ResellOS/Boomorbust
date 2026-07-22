'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { SyncButton } from '@/components/dashboard/SyncButton';
import { formatTimeAgo } from '@/lib/utils/format';

// Dismissible inline warning shown when the user's league data is stale
// (last sync > 12h ago). Dismissed once per browser session (sessionStorage).

const STALE_HOURS = 12;
const KEY = 'bob_stale_warning_dismissed';

export default function StaleDataWarning() {
  const [ageMs, setAgeMs] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(KEY) === '1');
    } catch {
      setDismissed(false);
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sync/status', { credentials: 'include' });
        if (!res.ok) return;
        const d = (await res.json()) as { lastSyncedAt?: string | null };
        if (cancelled || !d.lastSyncedAt) return;
        const t = new Date(d.lastSyncedAt).getTime();
        if (Number.isFinite(t)) {
          setLastSynced(d.lastSyncedAt);
          setAgeMs(Date.now() - t);
        }
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stale = ageMs != null && ageMs > STALE_HOURS * 3_600_000;
  if (dismissed || !stale) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hold/30 bg-hold/[0.08] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-hold" strokeWidth={2} />
        <span className="font-figtree text-[12px] text-text">
          Your data is {formatTimeAgo(lastSynced)} old. Sync for fresh recommendations.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SyncButton />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex items-center gap-1 font-mono text-[11px] text-muted hover:text-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} /> Dismiss
        </button>
      </div>
    </div>
  );
}
