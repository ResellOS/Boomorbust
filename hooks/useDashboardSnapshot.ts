'use client';

/**
 * Loads dashboard data in two phases:
 * 1. `/api/dashboard/snapshot-hero` — empire + portfolio value for fast header/chart headline.
 * 2. `/api/dashboard/snapshot` — full payload (same-origin, no-store).
 */
import { useEffect, useState } from 'react';
import type { DashboardSnapshot } from '@/app/api/dashboard/snapshot/route';
import type { DashboardHeroSnapshot } from '@/app/api/dashboard/snapshot-hero/route';

export type { DashboardSnapshot };
export type { DashboardHeroSnapshot };

export interface SnapshotState {
  /** True until the full snapshot request settles (success or error). */
  loading: boolean;
  error: string | null;
  hero: DashboardHeroSnapshot | null;
  data: DashboardSnapshot | null;
}

export function useDashboardSnapshot(): SnapshotState {
  const [state, setState] = useState<SnapshotState>({
    loading: true,
    error: null,
    hero: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadHero() {
      try {
        const res = await fetch('/api/dashboard/snapshot-hero', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok || cancelled) return;
        const hero = (await res.json()) as DashboardHeroSnapshot;
        if (!cancelled && hero?.empire)
          setState((s) => (s.data ? s : { ...s, hero }));
      } catch {
        /* full snapshot still authoritative */
      }
    }

    async function loadFull() {
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
        if (!cancelled) setState({ loading: false, error: null, hero: null, data });
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            loading: false,
            error: err instanceof Error ? err.message : 'Snapshot fetch failed',
            hero: s.hero,
            data: null,
          }));
        }
      }
    }

    void loadHero();
    void loadFull();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
