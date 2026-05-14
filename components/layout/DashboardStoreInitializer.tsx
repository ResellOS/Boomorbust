'use client';

import { useEffect } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';

/**
 * Runs once on mount inside the (dashboard) layout.
 * Resets activeLeagueId to 'all' (empire / all-leagues view) whenever the
 * authenticated app shell is first rendered, so every page starts from a
 * clean context rather than inheriting stale per-league state from a previous
 * navigation session.
 */
export default function DashboardStoreInitializer() {
  const setActiveLeagueId = useDashboardLeagueStore((s) => s.setActiveLeagueId);

  useEffect(() => {
    // 'all' is the sentinel for empire/all-leagues context.
    // Individual pages call setActiveLeagueId(id) to filter to a specific league.
    setActiveLeagueId('all');
  }, [setActiveLeagueId]);

  return null;
}
