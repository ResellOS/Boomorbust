import type { DraftConfig } from './types';
import {
  buildDefaultTeams,
  defaultDraftConfig,
  DEFAULT_ROSTER_SLOTS,
  rosterSize,
} from './defaults';

export function normalizeDraftConfig(partial?: Partial<DraftConfig> | null): DraftConfig {
  const base = defaultDraftConfig();
  if (!partial) return base;

  const teams = Math.max(2, Math.min(22, Number(partial.teams) || base.teams));
  const rosterSlots =
    partial.rosterSlots && partial.rosterSlots.length > 0
      ? partial.rosterSlots
      : DEFAULT_ROSTER_SLOTS.map((s) => ({ ...s }));
  const rounds = Math.max(1, Number(partial.rounds) || rosterSize(rosterSlots));
  const yourPick = Math.max(1, Math.min(teams, Number(partial.yourPick) || base.yourPick));

  return {
    draftName: partial.draftName ?? base.draftName,
    draftType: partial.draftType ?? base.draftType,
    draftOrderType: partial.draftOrderType ?? base.draftOrderType,
    teams,
    rounds,
    scoring: partial.scoring ?? base.scoring,
    superflex: partial.superflex ?? base.superflex,
    yourPick,
    pickTimer: partial.pickTimer ?? base.pickTimer,
    cpuAutopick: partial.cpuAutopick ?? base.cpuAutopick,
    playerPool: partial.playerPool ?? base.playerPool,
    thirdRoundReversal: partial.thirdRoundReversal ?? base.thirdRoundReversal,
    showTeamNames: partial.showTeamNames ?? base.showTeamNames,
    rosterSlots,
    teamOrder:
      partial.teamOrder && partial.teamOrder.length === teams
        ? partial.teamOrder
        : buildDefaultTeams(teams, yourPick),
  };
}
