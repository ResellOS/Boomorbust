import { create } from 'zustand';
import type { LeagueSummary } from '@/app/api/leagues/route';

export type DashboardLeagueId = string | null;

interface DashboardLeagueState {
  /** `null` or `'all'` = empire / all-leagues context where supported. */
  activeLeagueId: DashboardLeagueId;
  setActiveLeagueId: (id: DashboardLeagueId) => void;
  /** Flattened MY + OTHER leagues for Trade Hub dropdowns (hydrated from `/api/leagues`). */
  leagues: LeagueSummary[];
  setLeagues: (leagues: LeagueSummary[]) => void;
}

export const useDashboardLeagueStore = create<DashboardLeagueState>((set) => ({
  activeLeagueId: null,
  setActiveLeagueId: (id) => set({ activeLeagueId: id }),
  leagues: [],
  setLeagues: (leagues) => set({ leagues }),
}));
