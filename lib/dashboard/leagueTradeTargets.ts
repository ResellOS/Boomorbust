import type { SleeperRoster, SleeperUser } from '@/lib/sleeper';
import { acquireCostForScore } from '@/lib/verdict';
import type { LeagueBundle, TradeTargetItem } from './rotation';

/**
 * Per-league trade-target engine.
 *
 * Replaces the old global "top-4 TFO players round-robin'd across leagues" logic
 * (which made every league show the same players, e.g. Chase Brown / Chris Olave).
 *
 * For each league it derives, from THAT league's actual rosters:
 *   1. the user's weakest starting position (roster need),
 *   2. a genuinely available upgrade at that position sitting on an opponent who
 *      has SURPLUS depth there (so it's a realistic acquisition, not a global stud),
 *   3. the specific manager holding that surplus (named in the reason line).
 *
 * Because it is driven by each league's roster composition and manager rosters,
 * every league's target comes out different.
 */

const SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
type SkillPosition = (typeof SKILL_POSITIONS)[number];

function isSkillPosition(pos: string): pos is SkillPosition {
  return (SKILL_POSITIONS as readonly string[]).includes(pos);
}

interface PlayerMetaLite {
  name: string;
  position: string;
  team: string;
}

export interface BuildLeagueTradeTargetsParams {
  /** User's per-league bundles (drives the user's roster + names). */
  leagues: LeagueBundle[];
  /** User's roster per league (rosterId + owned player ids). */
  rosterByLeague: Map<string, { rosterId: number | null; playerIds: string[] }>;
  /** Every team's Sleeper roster, per league. */
  sleeperByLeague: Map<string, SleeperRoster[]>;
  /** League members, per league (owner_id → display name). */
  usersByLeague: Map<string, SleeperUser[]>;
  /** TFO score for a player id (0 when unknown). */
  tfoOf: (playerId: string) => number;
  /** Player metadata for a player id (null when unknown). */
  metaOf: (playerId: string) => PlayerMetaLite | null;
}

interface Candidate {
  playerId: string;
  tfo: number;
  position: SkillPosition;
  ownerName: string;
}

export function buildLeagueTradeTargets({
  leagues,
  rosterByLeague,
  sleeperByLeague,
  usersByLeague,
  tfoOf,
  metaOf,
}: BuildLeagueTradeTargetsParams): TradeTargetItem[] {
  const targets: TradeTargetItem[] = [];

  for (const league of leagues) {
    const rosters = sleeperByLeague.get(league.id) ?? [];
    if (rosters.length === 0) continue;

    const users = usersByLeague.get(league.id) ?? [];
    const ownerName = (rosterId: number, ownerId: string | null): string => {
      const user = users.find((u) => u.user_id === ownerId);
      return user?.display_name || user?.username || `Team ${rosterId}`;
    };

    const myRosterId = rosterByLeague.get(league.id)?.rosterId ?? null;
    const myPlayerIds = new Set((rosterByLeague.get(league.id)?.playerIds ?? []).map(String));

    // 1. User's best (starter-quality) TFO per position IN THIS LEAGUE.
    const userBest: Record<SkillPosition, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const pid of Array.from(myPlayerIds)) {
      const meta = metaOf(pid);
      if (!meta || !isSkillPosition(meta.position)) continue;
      userBest[meta.position] = Math.max(userBest[meta.position], tfoOf(pid));
    }

    // Positions ranked weakest-first — the user's biggest needs.
    const needsOrder = [...SKILL_POSITIONS].sort((a, b) => userBest[a] - userBest[b]);

    // 2. Best available upgrade at the neediest position from an opponent WITH SURPLUS.
    let best: Candidate | null = null;
    for (const need of needsOrder) {
      for (const roster of rosters) {
        if (roster.roster_id === myRosterId) continue;

        // This opponent's quality players at the needed position.
        const atPos = (roster.players ?? [])
          .map(String)
          .filter((pid) => !myPlayerIds.has(pid))
          .map((pid) => ({ pid, tfo: tfoOf(pid), meta: metaOf(pid) }))
          .filter((x) => x.meta && x.meta.position === need && x.tfo > 0)
          .sort((a, b) => b.tfo - a.tfo);

        // Surplus = 2+ quality bodies at the position; the #2 is realistically tradeable.
        if (atPos.length < 2) continue;
        const tradeable = atPos[1]!;
        if (tradeable.tfo <= userBest[need]) continue; // must be a real upgrade

        if (!best || tradeable.tfo > best.tfo) {
          best = {
            playerId: tradeable.pid,
            tfo: tradeable.tfo,
            position: need,
            ownerName: ownerName(roster.roster_id, roster.owner_id),
          };
        }
      }
      if (best) break; // satisfied the neediest position with real surplus — done
    }

    // 3. Fallback: no surplus upgrade found — best available body at the top need.
    if (!best) {
      const need = needsOrder[0]!;
      for (const roster of rosters) {
        if (roster.roster_id === myRosterId) continue;
        for (const pidRaw of roster.players ?? []) {
          const pid = String(pidRaw);
          if (myPlayerIds.has(pid)) continue;
          const meta = metaOf(pid);
          if (!meta || meta.position !== need) continue;
          const tfo = tfoOf(pid);
          if (tfo <= 0 || tfo <= userBest[need]) continue;
          if (!best || tfo > best.tfo) {
            best = { playerId: pid, tfo, position: need, ownerName: ownerName(roster.roster_id, roster.owner_id) };
          }
        }
      }
    }

    if (!best) continue;

    const meta = metaOf(best.playerId);
    if (!meta) continue;

    targets.push({
      playerId: best.playerId,
      playerName: meta.name,
      position: meta.position.toUpperCase(),
      team: meta.team,
      leagueName: league.name,
      leagueId: league.id,
      tfoScore: best.tfo,
      reason: `Fills your ${best.position} gap in ${league.name} — ${best.ownerName} has surplus ${best.position} depth and is a realistic trade partner.`,
      acquireCost: acquireCostForScore(best.tfo),
    });
  }

  return targets;
}
