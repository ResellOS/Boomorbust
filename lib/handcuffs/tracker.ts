// Known RB handcuff pairs: starter → backups
// Update seasonally as depth charts change
export const KNOWN_HANDCUFFS: Record<string, string[]> = {
  'Christian McCaffrey': ['Isaac Guerendo', 'Patrick Taylor Jr.'],
  'Derrick Henry': ['Rhamondre Stevenson', 'JK Dobbins'],
  'Saquon Barkley': ['Kenny Gainwell', 'Will Shipley'],
  'Breece Hall': ['Isaiah Davis', 'Braelon Allen'],
  'Jonathan Taylor': ['Trey Sermon', 'Tyler Goodson'],
  'De\'Von Achane': ['Raheem Mostert', 'Jeff Wilson Jr.'],
  'Tony Pollard': ['Tyjae Spears'],
  'James Cook': ['Ray Davis', 'Frank Gore Jr.'],
  'Kyren Williams': ['Blake Corum', 'Ronnie Rivers'],
  'Josh Jacobs': ['Emanuel Wilson', 'Lew Nichols'],
  'Bijan Robinson': ['Tyler Allgeier', 'Carlos Washington Jr.'],
  'Travis Etienne': ['Tank Bigsby', 'D\'Ernest Johnson'],
  'Isiah Pacheco': ['Carson Steele'],
  'Javonte Williams': ['Jaleel McLaughlin', 'Audric Estime'],
  'Rhamondre Stevenson': ['Antonio Gibson'],
  'David Montgomery': ['Jahmyr Gibbs'],
  'Nick Chubb': ['Jerome Ford', 'Pierre Strong Jr.'],
  'Aaron Jones': ['MarShawn Lloyd', 'Deon McIntosh'],
  'Raheem Mostert': ['De\'Von Achane'],
  'Zamir White': ['Dylan Laube'],
};

// Build reverse lookup: backup name → starter name
export const BACKUP_TO_STARTER: Record<string, string> = {};
for (const [starter, backups] of Object.entries(KNOWN_HANDCUFFS)) {
  for (const backup of backups) {
    BACKUP_TO_STARTER[backup.toLowerCase()] = starter;
  }
}

export type HandcuffStatus = 'YOU_OWN' | 'AVAILABLE' | 'OPPONENT_OWNS';
export type HandcuffPriority = 'critical' | 'important' | 'monitor';

export interface HandcuffResult {
  starter_id: string;
  starter_name: string;
  starter_position: string;
  starter_team: string | null;
  starter_ktc: number;
  priority: HandcuffPriority;
  handcuffs: Array<{
    player_id: string | null;   // null if player not in our DB
    name: string;
    status: HandcuffStatus;
    owner_roster_id: number | null;
    league_id: string;
    league_name: string;
  }>;
}

export interface HandcuffSummary {
  unprotected_starters: number;
  available_to_add: number;
  results: HandcuffResult[];
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
}

export type PlayerMap = Record<string, PlayerInput>;

// All rosters across ALL teams in a league (not just user's)
export interface AllLeagueRosters {
  league_id: string;
  rosters: Array<{ roster_id: number; players: string[] }>;
}

export function getHandcuffStatus(
  userRosters: RosterInput[],
  players: PlayerMap,
  ktcMap: Record<string, number>,
  allLeagueRosters: AllLeagueRosters[]
): HandcuffSummary {
  // Build reverse map: player name (lowercase) → player_id
  const nameToId: Record<string, string> = {};
  for (const [id, p] of Object.entries(players)) {
    nameToId[p.full_name.toLowerCase()] = id;
  }

  // Build set of each league's all-roster player ownership
  const leagueOwnership: Record<string, Record<string, number>> = {};
  for (const { league_id, rosters } of allLeagueRosters) {
    leagueOwnership[league_id] = {};
    for (const r of rosters) {
      for (const pid of r.players) {
        leagueOwnership[league_id][pid] = r.roster_id;
      }
    }
  }

  const results: HandcuffResult[] = [];
  let unprotected = 0;
  let available = 0;

  // Collect unique starters across all user's leagues
  const starterSeen = new Set<string>();

  for (const roster of userRosters) {
    for (const starterId of roster.starters) {
      const p = players[starterId];
      if (!p || p.position !== 'RB') continue; // handcuffs mainly for RBs
      if (starterSeen.has(starterId)) continue;
      starterSeen.add(starterId);

      const starterKtc = ktcMap[p.full_name.toLowerCase()] ?? 0;
      const knownBackups = KNOWN_HANDCUFFS[p.full_name] ?? [];
      if (!knownBackups.length) continue;

      const handcuffEntries: HandcuffResult['handcuffs'] = [];
      let userOwnsAny = false;

      for (const backupName of knownBackups) {
        const backupId = nameToId[backupName.toLowerCase()] ?? null;

        // Check across all leagues where user has this starter
        const leaguesWithStarter = userRosters.filter((r) => r.starters.includes(starterId));

        for (const leagueRoster of leaguesWithStarter) {
          const ownership = leagueOwnership[leagueRoster.league_id] ?? {};
          let status: HandcuffStatus = 'AVAILABLE';
          let owner_roster_id: number | null = null;

          if (backupId) {
            if (leagueRoster.players.includes(backupId)) {
              status = 'YOU_OWN';
              userOwnsAny = true;
            } else if (ownership[backupId]) {
              status = 'OPPONENT_OWNS';
              owner_roster_id = ownership[backupId];
            } else {
              status = 'AVAILABLE';
              available++;
            }
          }

          handcuffEntries.push({
            player_id: backupId,
            name: backupName,
            status,
            owner_roster_id,
            league_id: leagueRoster.league_id,
            league_name: leagueRoster.league_name,
          });
        }
      }

      if (!userOwnsAny) unprotected++;

      const priority: HandcuffPriority =
        starterKtc >= 5000 ? 'critical'
        : starterKtc >= 3000 ? 'important'
        : 'monitor';

      results.push({
        starter_id: starterId,
        starter_name: p.full_name,
        starter_position: p.position,
        starter_team: p.team,
        starter_ktc: starterKtc,
        priority,
        handcuffs: handcuffEntries,
      });
    }
  }

  results.sort((a, b) => {
    const po: Record<HandcuffPriority, number> = { critical: 0, important: 1, monitor: 2 };
    return po[a.priority] - po[b.priority] || b.starter_ktc - a.starter_ktc;
  });

  return {
    unprotected_starters: unprotected,
    available_to_add: available,
    results,
  };
}
