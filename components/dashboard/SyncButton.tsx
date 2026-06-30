'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { markSyncComplete, msSinceLastSync } from '@/lib/sync/autoSync';
import type { SyncStatusResponse } from '@/app/api/sync/status/route';

type SyncState = 'idle' | 'stale' | 'syncing' | 'success' | 'error';

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const TOAST_DURATION_MS = 3000;

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function SyncButton() {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatusResponse;

      // Prefer server-side synced_at, fall back to localStorage
      let ageMs: number | null = null;
      if (data.lastSyncedAt) {
        ageMs = Date.now() - new Date(data.lastSyncedAt).getTime();
      } else {
        ageMs = msSinceLastSync();
      }

      if (ageMs !== null) {
        setLastSyncLabel(formatAge(ageMs));
        setSyncState((prev) => {
          if (prev === 'syncing' || prev === 'success' || prev === 'error') return prev;
          return ageMs! > STALE_THRESHOLD_MS ? 'stale' : 'idle';
        });
      } else {
        setSyncState((prev) => (prev === 'syncing' ? prev : 'stale'));
        setLastSyncLabel(null);
      }
    } catch { /* silent */ }
  }, []);

  // Poll status on mount + every 5 min + on tab focus
  useEffect(() => {
    void refreshStatus();
    const interval = setInterval(() => void refreshStatus(), 5 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshStatus]);

  const handleSync = useCallback(async () => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    if (toastTimer.current) clearTimeout(toastTimer.current);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (res.ok) {
        markSyncComplete();
        setSyncState('success');
        setLastSyncLabel('just now');
        toastTimer.current = setTimeout(() => {
          setSyncState('idle');
        }, TOAST_DURATION_MS);
        // Re-fetch status after a short delay to get server timestamp
        setTimeout(() => void refreshStatus(), 2000);
      } else {
        setSyncState('error');
        toastTimer.current = setTimeout(() => setSyncState('stale'), TOAST_DURATION_MS);
      }
    } catch {
      setSyncState('error');
      toastTimer.current = setTimeout(() => setSyncState('stale'), TOAST_DURATION_MS);
    }
  }, [syncState, refreshStatus]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const base =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-[0.08em] border transition-all duration-200 shrink-0 select-none';

  const stateStyle: Record<SyncState, string> = {
    idle: 'text-[#64748B] border-white/[0.08] hover:text-white hover:border-white/20 bg-transparent',
    stale: 'text-[#FBBF24] border-[#FBBF24]/30 hover:border-[#FBBF24]/60 bg-[#FBBF24]/08',
    syncing: 'text-[#22D3EE] border-[#22D3EE]/30 bg-[#22D3EE]/08 cursor-not-allowed opacity-80',
    success: 'text-[#36E7A1] border-[#36E7A1]/40 bg-[#36E7A1]/10',
    error: 'text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10',
  };

  const label: Record<SyncState, string> = {
    idle: 'Sync',
    stale: 'Stale',
    syncing: 'Syncing…',
    success: 'Synced ✓',
    error: 'Failed',
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncState === 'syncing'}
      className={`${base} ${stateStyle[syncState]}`}
      title={
        syncState === 'stale'
          ? `Data is stale${lastSyncLabel ? ` — last synced ${lastSyncLabel}` : ''}. Click to refresh.`
          : lastSyncLabel
          ? `Last synced ${lastSyncLabel}`
          : 'Sync Sleeper data'
      }
      aria-label="Sync data"
    >
      <RefreshCw
        className={`w-3 h-3 shrink-0 ${syncState === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span className="hidden sm:inline">{label[syncState]}</span>
      {syncState === 'idle' && lastSyncLabel && (
        <span className="hidden lg:inline text-[10px] opacity-50 normal-case tracking-normal">
          {lastSyncLabel}
        </span>
      )}
      {syncState === 'stale' && (
        <span
          className="ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] hidden sm:inline"
        >
          STALE
        </span>
      )}
    </button>
  );
}
