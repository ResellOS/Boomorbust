import { create } from 'zustand';

export type DashboardLeagueId = string | null;

interface DashboardLeagueState {
  /** `null` = empire / all-leagues context where supported. */
  activeLeagueId: DashboardLeagueId;
  setActiveLeagueId: (id: DashboardLeagueId) => void;
}

export const useDashboardLeagueStore = create<DashboardLeagueState>((set) => ({
  activeLeagueId: null,
  setActiveLeagueId: (id) => set({ activeLeagueId: id }),
}));
