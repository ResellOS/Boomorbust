'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, RotateCw } from 'lucide-react';
import { markSyncComplete, msSinceLastSync } from '@/lib/sync/autoSync';
import type { SyncStatusResponse } from '@/app/api/sync/status/route';

type SyncState = 'idle' | 'stale' | 'syncing' | 'success' | 'error' | 'reload';
type SyncPhase = 'leagues' | 'engine';

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const SUCCESS_DURATION_MS = 3000; // show "complete" before prompting reload
const ENGINE_PHASE_MS = 30_000; // after 30s of syncing, we're in the engine pass

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function SyncButton() {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('leagues');
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatusResponse;

      let ageMs: number | null = null;
      if (data.lastSyncedAt) {
        ageMs = Date.now() - new Date(data.lastSyncedAt).getTime();
      } else {
        ageMs = msSinceLastSync();
      }

      if (ageMs !== null) {
        setLastSyncLabel(formatAge(ageMs));
        setSyncState((prev) => {
          // Never override an in-flight or resolved sync flow.
          if (prev === 'syncing' || prev === 'success' || prev === 'error' || prev === 'reload') {
            return prev;
          }
          return ageMs! > STALE_THRESHOLD_MS ? 'stale' : 'idle';
        });
      } else {
        setSyncState((prev) =>
          prev === 'syncing' || prev === 'success' || prev === 'error' || prev === 'reload'
            ? prev
            : 'stale',
        );
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
    setSyncPhase('leagues');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    // After ~30s the roster pull is done and the engine pass is running.
    phaseTimer.current = setTimeout(() => setSyncPhase('engine'), ENGINE_PHASE_MS);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (phaseTimer.current) clearTimeout(phaseTimer.current);

      if (res.ok) {
        markSyncComplete();
        setSyncState('success');
        setLastSyncLabel('just now');
        setTimeout(() => void refreshStatus(), 2000);
        // After a beat, prompt the user to reload to see the fresh data.
        toastTimer.current = setTimeout(() => setSyncState('reload'), SUCCESS_DURATION_MS);
      } else {
        setSyncState('error');
        toastTimer.current = setTimeout(() => setSyncState('stale'), SUCCESS_DURATION_MS);
      }
    } catch {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
      setSyncState('error');
      toastTimer.current = setTimeout(() => setSyncState('stale'), SUCCESS_DURATION_MS);
    }
  }, [syncState, refreshStatus]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    },
    [],
  );

  const handleClick = useCallback(() => {
    if (syncState === 'reload') {
      window.location.reload();
      return;
    }
    if (syncState === 'syncing') return;
    void handleSync();
  }, [syncState, handleSync]);

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const base =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-[0.08em] border transition-all duration-200 shrink-0 select-none';

  const stateStyle: Record<SyncState, string> = {
    idle: 'text-[#64748B] border-white/[0.08] hover:text-white hover:border-white/20 bg-transparent',
    stale: 'text-[#FBBF24] border-[#FBBF24]/30 hover:border-[#FBBF24]/60 bg-[#FBBF24]/08',
    syncing: 'text-[#22D3EE] border-[#22D3EE]/30 bg-[#22D3EE]/08 cursor-not-allowed opacity-80',
    success: 'text-[#36E7A1] border-[#36E7A1]/40 bg-[#36E7A1]/10',
    error: 'text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10',
    reload: 'text-[#36E7A1] border-[#36E7A1]/40 bg-[#36E7A1]/10 hover:bg-[#36E7A1]/20 cursor-pointer',
  };

  const label: Record<SyncState, string> = {
    idle: 'Sync',
    stale: 'Stale',
    syncing: syncPhase === 'engine' ? 'Running engine…' : 'Syncing leagues…',
    success: 'Sync complete ✓',
    error: 'Failed',
    reload: 'Reload to see updates',
  };

  // Keep resolved states (success/reload) legible on mobile; compact otherwise.
  const labelVisibility =
    syncState === 'success' || syncState === 'reload' ? 'inline' : 'hidden sm:inline';

  const Icon = syncState === 'reload' ? RotateCw : RefreshCw;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={syncState === 'syncing'}
      className={`${base} ${stateStyle[syncState]}`}
      title={
        syncState === 'reload'
          ? 'Sync complete — reload to see the updated dashboard.'
          : syncState === 'stale'
          ? `Data is stale${lastSyncLabel ? ` — last synced ${lastSyncLabel}` : ''}. Click to refresh.`
          : lastSyncLabel
          ? `Last synced ${lastSyncLabel}`
          : 'Sync Sleeper data'
      }
      aria-label={syncState === 'reload' ? 'Reload page to see updates' : 'Sync data'}
    >
      <Icon className={`w-3 h-3 shrink-0 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
      <span className={labelVisibility}>{label[syncState]}</span>
      {syncState === 'idle' && lastSyncLabel && (
        <span className="hidden lg:inline text-[10px] opacity-50 normal-case tracking-normal">
          {lastSyncLabel}
        </span>
      )}
      {syncState === 'stale' && (
        <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] hidden sm:inline">
          STALE
        </span>
      )}
    </button>
  );
}
