'use client';

/**
 * Loads `/api/dashboard/snapshot` — roster-scoped for the linked Sleeper user
 * (`ownedPlayerIds` on the payload). Keep client filters on `ownedPlayerIds`
 * for defense-in-depth against any off-roster IDs in nested lists.
 */
import { useEffect, useState } from 'react';
import type { DashboardSnapshot } from '@/app/api/dashboard/snapshot/route';

export type { DashboardSnapshot };

export interface SnapshotState {
  loading: boolean;
  error: string | null;
  data: DashboardSnapshot | null;
}

export function useDashboardSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/dashboard/snapshot', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          let parsed: { error?: string; hint?: string } = {};
          try {
            parsed = txt ? JSON.parse(txt) : {};
          } catch {
            parsed = {};
          }
          throw new Error(parsed?.error ?? `Snapshot request failed (${res.status})`);
        }
        const data = (await res.json()) as DashboardSnapshot;
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Snapshot fetch failed',
            data: null,
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
