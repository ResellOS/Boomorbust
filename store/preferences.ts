import { create } from 'zustand';
import { rankingFromPositionPriority, type PositionPriority } from '@/lib/preferences/preference-data';

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
      position_priority?: PositionPriority;
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
    const pr = data.preference_data?.positionalRanking;
    const pp = data.preference_data?.position_priority as PositionPriority | undefined;
    let risk: RiskTolerance = 'balanced';
    const raw = data.risk_tolerance;
    if (raw === 'conservative' || raw === 'balanced' || raw === 'aggressive') risk = raw;
    else if (raw === 'medium') risk = 'balanced';

    set({
      isLoaded: true,
      riskTolerance: risk,
      positionalRanking: rankingFromPositionPriority(pp, pr),
      hiddenLeagues: data.preference_data?.hiddenLeagues ?? [],
    });
  },
}));
