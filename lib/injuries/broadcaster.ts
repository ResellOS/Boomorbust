
export type InjurySeverity = 'season_ending' | 'multi_week' | 'week_to_week' | 'questionable';

export interface InjuryAlert {
  player_id: string;
  player: {
    name: string;
    position: string;
    team: string | null;
    ktc_value: number;
    injury_status: string;
  };
  affected_leagues: Array<{
    league_id: string;
    league_name: string;
    is_starter: boolean;
    roster_id: number;
  }>;
  severity: InjurySeverity;
  severity_label: string;
  replacements: Array<{
    player_id: string;
    name: string;
    position: string;
    ktc_value: number;
    source: 'bench';
    league_id: string;
  }>;
  trade_opportunity: {
    action: 'sell_now' | 'buy_low' | 'hold' | 'monitor';
    urgency: 'high' | 'medium' | 'low';
    note: string;
  };
  recommendation: string;
}

export interface RosterInput {
  league_id: string;
  league_name: string;
  roster_id: number;
  players: string[];
  starters: string[];
}

export interface PlayerInput {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

export type PlayerMap = Record<string, PlayerInput>;

const SEVERITY_MAP: Record<string, InjurySeverity> = {
  IR:  'season_ending',
  PUP: 'season_ending',
  NFI: 'season_ending',
  O:   'multi_week',
  D:   'multi_week',
  Q:   'week_to_week',
  P:   'questionable',
};

const SEVERITY_LABELS: Record<InjurySeverity, string> = {
  season_ending: 'Season Ending',
  multi_week:    'Multi-Week',
  week_to_week:  'Week-to-Week',
  questionable:  'Questionable',
};

function getSeverity(injury_status: string): InjurySeverity {
  return SEVERITY_MAP[injury_status.toUpperCase()] ?? 'questionable';
}

function tradeOpportunity(
  ktcValue: number,
  severity: InjurySeverity,
  player: PlayerInput
): InjuryAlert['trade_opportunity'] {
  // On an injured player you OWN — should you sell?
  if (severity === 'season_ending' && ktcValue > 4000) {
    return { action: 'sell_now', urgency: 'high', note: `Season-ending injury — sell before the market fully reprices. High-value assets depreciate quickly.` };
  }
  if (severity === 'season_ending' && ktcValue > 1500) {
    return { action: 'sell_now', urgency: 'medium', note: `Sell while buyers may not know the full extent of the injury.` };
  }
  if (severity === 'multi_week' && ktcValue > 5000) {
    return { action: 'sell_now', urgency: 'high', note: `Elite player with significant injury — sell for a premium while panic hasn't set in.` };
  }
  if (severity === 'multi_week' && ktcValue > 3000) {
    return { action: 'hold', urgency: 'medium', note: `Monitor the recovery timeline. A multi-week injury on a high-value player often rebounds in price.` };
  }
  if (severity === 'week_to_week') {
    if ((player.age ?? 30) > 28 && ['RB'].includes(player.position)) {
      return { action: 'sell_now', urgency: 'medium', note: `Older RB with recurring injury concerns — consider selling into any offers.` };
    }
    return { action: 'hold', urgency: 'low', note: `Week-to-week designation — hold and reassess next week.` };
  }
  return { action: 'monitor', urgency: 'low', note: `Probable/questionable players typically play. Hold for now.` };
}

function makeRecommendation(
  severity: InjurySeverity,
  affected: InjuryAlert['affected_leagues'],
  opp: InjuryAlert['trade_opportunity'],
  replacements: InjuryAlert['replacements']
): string {
  const leagueCount = affected.length;
  const starterCount = affected.filter((l) => l.is_starter).length;
  const hasReplacement = replacements.length > 0;

  const impact = starterCount > 0
    ? `Affects ${starterCount} starting slot${starterCount > 1 ? 's' : ''} across ${leagueCount} league${leagueCount > 1 ? 's' : ''}.`
    : `On your bench in ${leagueCount} league${leagueCount > 1 ? 's' : ''} — lower urgency.`;

  const action = opp.action === 'sell_now'
    ? ` Trade action: ${opp.note}`
    : opp.action === 'hold' || opp.action === 'monitor'
    ? ` ${opp.note}`
    : '';

  const sub = hasReplacement
    ? ` Bench option available.`
    : starterCount > 0 ? ` Check waivers immediately.` : '';

  return `${impact}${sub}${action}`;
}

export function scanInjuryImpact(
  injured_player_id: string,
  userRosters: RosterInput[],
  players: PlayerMap,
  ktcMap: Record<string, number>
): InjuryAlert | null {
  const player = players[injured_player_id];
  if (!player?.injury_status) return null;

  const status = player.injury_status.toUpperCase();
  if (status === 'P') return null; // probable — not worth alerting

  const severity = getSeverity(status);
  const ktcValue = ktcMap[player.full_name.toLowerCase()] ?? 0;

  const affected_leagues: InjuryAlert['affected_leagues'] = [];
  const replacementMap: Map<string, InjuryAlert['replacements'][0]> = new Map();

  for (const roster of userRosters) {
    if (!roster.players.includes(injured_player_id)) continue;

    affected_leagues.push({
      league_id: roster.league_id,
      league_name: roster.league_name,
      is_starter: roster.starters.includes(injured_player_id),
      roster_id: roster.roster_id,
    });

    // Find bench players at same position as replacements
    for (const pid of roster.players) {
      if (pid === injured_player_id) continue;
      const p = players[pid];
      if (!p || p.position !== player.position) continue;
      if (roster.starters.includes(pid)) continue; // already a starter
      if (!replacementMap.has(pid)) {
        replacementMap.set(pid, {
          player_id: pid,
          name: p.full_name,
          position: p.position,
          ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
          source: 'bench',
          league_id: roster.league_id,
        });
      }
    }
  }

  if (!affected_leagues.length) return null;

  const replacements = Array.from(replacementMap.values())
    .sort((a, b) => b.ktc_value - a.ktc_value)
    .slice(0, 3);

  const opp = tradeOpportunity(ktcValue, severity, player);

  return {
    player_id: injured_player_id,
    player: {
      name: player.full_name,
      position: player.position,
      team: player.team,
      ktc_value: ktcValue,
      injury_status: player.injury_status,
    },
    affected_leagues,
    severity,
    severity_label: SEVERITY_LABELS[severity],
    replacements,
    trade_opportunity: opp,
    recommendation: makeRecommendation(severity, affected_leagues, opp, replacements),
  };
}

const SEVERITY_ORDER: Record<InjurySeverity, number> = {
  season_ending: 0, multi_week: 1, week_to_week: 2, questionable: 3,
};

export function scanAllRosterInjuries(
  userRosters: RosterInput[],
  players: PlayerMap,
  ktcMap: Record<string, number>
): InjuryAlert[] {
  const seen = new Set<string>();
  const alerts: InjuryAlert[] = [];

  for (const roster of userRosters) {
    for (const pid of roster.players) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const alert = scanInjuryImpact(pid, userRosters, players, ktcMap);
      if (alert) alerts.push(alert);
    }
  }

  return alerts.sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    b.player.ktc_value - a.player.ktc_value
  );
}
