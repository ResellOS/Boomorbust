'use client';

const AUTO_SYNC_KEY = 'bob:last_auto_sync';
const AUTO_SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/** Fire-and-forget sync after login. Respects 30-min cooldown via localStorage. */
export function triggerAutoSync(): void {
  if (typeof window === 'undefined') return;

  try {
    const last = localStorage.getItem(AUTO_SYNC_KEY);
    if (last) {
      const elapsed = Date.now() - parseInt(last, 10);
      if (elapsed < AUTO_SYNC_COOLDOWN_MS) return;
    }
  } catch {
    // localStorage unavailable — proceed
  }

  void (async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        try {
          localStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));
        } catch { /* ignore */ }
      }
    } catch { /* silent — non-blocking */ }
  })();
}

/** Mark last sync timestamp in localStorage (called after successful manual sync). */
export function markSyncComplete(): void {
  try {
    localStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

/** Returns ms since last sync, or null if never synced in this browser. */
export function msSinceLastSync(): number | null {
  try {
    const last = localStorage.getItem(AUTO_SYNC_KEY);
    if (!last) return null;
    return Date.now() - parseInt(last, 10);
  } catch {
    return null;
  }
}
