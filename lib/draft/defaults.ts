import type { DraftConfig, DraftTeam, RosterSlotConfig } from './types';

export const TEAM_COUNT_OPTIONS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

export const PICK_TIMER_OPTIONS: { value: DraftConfig['pickTimer']; label: string }[] = [
  { value: 'none', label: 'No Limit' },
  { value: '30', label: '30s' },
  { value: '60', label: '60s' },
  { value: '90', label: '1.5min' },
  { value: '120', label: '2min' },
  { value: '180', label: '3min' },
  { value: '300', label: '5min' },
  { value: '600', label: '10min' },
  { value: '1800', label: '30min' },
];

export const SCORING_OPTIONS: { value: DraftConfig['scoring']; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half-PPR' },
  { value: '2qb', label: '2QB' },
  { value: 'dynasty_standard', label: 'Dynasty Standard' },
  { value: 'dynasty_ppr', label: 'Dynasty PPR' },
  { value: 'dynasty_half_ppr', label: 'Dynasty Half-PPR' },
  { value: 'dynasty_2qb', label: 'Dynasty 2QB' },
];

export const DEFAULT_ROSTER_SLOTS: RosterSlotConfig[] = [
  { type: 'QB', count: 1 },
  { type: 'RB', count: 2 },
  { type: 'WR', count: 2 },
  { type: 'TE', count: 1 },
  { type: 'FLEX', count: 1 },
  { type: 'K', count: 1 },
  { type: 'DEF', count: 1 },
  { type: 'BN', count: 6 },
];

export function rosterSize(slots: RosterSlotConfig[]): number {
  return slots.reduce((s, sl) => s + sl.count, 0);
}

export function buildDefaultTeams(teams: number, yourPick: number): DraftTeam[] {
  return Array.from({ length: teams }, (_, i) => {
    const slot = i + 1;
    return {
      slot,
      name: slot === yourPick ? 'You' : `Team ${slot}`,
      isUser: slot === yourPick,
    };
  });
}

export function defaultDraftConfig(): DraftConfig {
  const teams = 12;
  const rosterSlots = DEFAULT_ROSTER_SLOTS.map((s) => ({ ...s }));
  return {
    draftName: 'Startup Mock Draft',
    draftType: 'startup',
    draftOrderType: 'snake',
    teams,
    rounds: rosterSize(rosterSlots),
    scoring: 'dynasty_ppr',
    superflex: false,
    yourPick: 1,
    pickTimer: '60',
    cpuAutopick: true,
    playerPool: 'all',
    thirdRoundReversal: false,
    showTeamNames: true,
    rosterSlots,
    teamOrder: buildDefaultTeams(teams, 1),
  };
}

export function pickTimerSeconds(timer: DraftConfig['pickTimer']): number {
  if (timer === 'none') return 0;
  return Number(timer);
}

export function scoringIsSuperflex(scoring: DraftConfig['scoring']): boolean {
  return scoring === '2qb' || scoring === 'dynasty_2qb';
}

export function scoringIsDynasty(scoring: DraftConfig['scoring']): boolean {
  return scoring.startsWith('dynasty_');
}
