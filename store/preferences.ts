import { create } from 'zustand';

export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';
export type Position = 'QB' | 'RB' | 'WR' | 'TE';

interface PreferencesState {
  isLoaded: boolean;
  riskTolerance: RiskTolerance;
  positionalRanking: Position[];
  hiddenLeagues: string[];
  setRiskTolerance: (value: RiskTolerance) => void;
  setPositionalRanking: (ranking: Position[]) => void;
  toggleLeagueVisibility: (leagueId: string) => void;
  loadFromData: (data: {
    risk_tolerance?: string;
    preference_data?: {
      positionalRanking?: Position[];
      hiddenLeagues?: string[];
    };
  }) => void;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  isLoaded: false,
  riskTolerance: 'balanced',
  positionalRanking: ['QB', 'RB', 'WR', 'TE'],
  hiddenLeagues: [],

  setRiskTolerance: (value) => set({ riskTolerance: value }),

  setPositionalRanking: (ranking) => set({ positionalRanking: ranking }),

  toggleLeagueVisibility: (leagueId) => {
    const { hiddenLeagues } = get();
    set({
      hiddenLeagues: hiddenLeagues.includes(leagueId)
        ? hiddenLeagues.filter((id) => id !== leagueId)
        : [...hiddenLeagues, leagueId],
    });
  },

  loadFromData: (data) => {
    set({
      isLoaded: true,
      riskTolerance: (data.risk_tolerance as RiskTolerance) ?? 'balanced',
      positionalRanking: data.preference_data?.positionalRanking ?? ['QB', 'RB', 'WR', 'TE'],
      hiddenLeagues: data.preference_data?.hiddenLeagues ?? [],
    });
  },
}));
