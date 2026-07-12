import type { SleeperRoster, SleeperUser, SleeperTransaction } from '@/lib/sleeper';
import { acquireCostForScore } from '@/lib/verdict';
import type { LeagueBundle, TradeTargetItem } from './rotation';

/**
 * Per-league trade-target engine.
 *
 * Replaces the old global "top-TFO players round-robin'd across leagues" logic
 * (which made every league surface the same handful of players).
 *
 * Priority order, evaluated against THIS league's actual rosters + recent trades:
 *
 *   PRIORITY 1 — Players "on the block" in this league. A player counts as on
 *     the block if their manager is either
 *       (a) actively trading that position — they gave away a player at the
 *           needed position in a recent completed trade, or
 *       (b) sitting on clear surplus — 2+ players at that position both with
 *           tfo_score > 50.
 *     We recommend the best on-the-block upgrade at the user's neediest slot.
 *
 *   PRIORITY 2 — Mutual need. A manager who has surplus at the user's need AND
 *     is thin where the user has surplus — a natural two-way fit.
 *
 * If neither fires we return NOTHING for that league rather than falling back to
 * a generic global pick, and every chosen player is de-duplicated across leagues
 * — so no two leagues ever show the same recommendation.
 */

const SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
type SkillPosition = (typeof SKILL_POSITIONS)[number];

// A position is "surplus" when a manager holds this many starter-quality bodies
// (tfo > threshold) there; the extra one is realistically tradeable.
const SURPLUS_TFO = 50;
const SURPLUS_COUNT = 2;
// "Thin" = the manager's best body at a position doesn't clear starter quality.
const THIN_TFO = 50;

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
  /** Recent completed trades, per league (drives the "actively trading" signal). */
  tradesByLeague: Map<string, SleeperTransaction[]>;
  /** TFO score for a player id (0 when unknown). */
  tfoOf: (playerId: string) => number;
  /** Player metadata for a player id (null when unknown). */
  metaOf: (playerId: string) => PlayerMetaLite | null;
}

interface PosBucket {
  /** Opponent's players at this position, sorted best-TFO first. */
  players: { pid: string; tfo: number }[];
  /** Count of players with tfo > SURPLUS_TFO. */
  above: number;
  /** Best TFO at this position (0 if none). */
  best: number;
}

interface OpponentInfo {
  rosterId: number;
  ownerName: string;
  byPos: Record<SkillPosition, PosBucket>;
  /** Positions this manager gave away in a recent completed trade. */
  tradedAway: Set<SkillPosition>;
}

interface Candidate {
  playerId: string;
  tfo: number;
  position: SkillPosition;
  opponent: OpponentInfo;
  /** Why it's on the block — shapes the reason line. */
  via: 'surplus' | 'trading' | 'mutual';
  /** Manager's need position the user's surplus fills (mutual-need only). */
  fillsTheirNeed?: SkillPosition;
  acceptance: number;
}

function emptyByPos(): Record<SkillPosition, PosBucket> {
  return {
    QB: { players: [], above: 0, best: 0 },
    RB: { players: [], above: 0, best: 0 },
    WR: { players: [], above: 0, best: 0 },
    TE: { players: [], above: 0, best: 0 },
  };
}

/**
 * Heuristic acceptance probability from roster-fit signals (this dashboard has no
 * archetype model — that lives in the engine). Deterministic, clamped 40–85%.
 */
function acceptanceProb(opts: {
  mutualNeed: boolean;
  surplus: boolean;
  trading: boolean;
  upgradeDelta: number;
}): number {
  let p = 45;
  if (opts.mutualNeed) p += 18; // they need what you're offering → motivated
  if (opts.surplus) p += 12; // dealing from depth is easy
  if (opts.trading) p += 10; // a known active trader
  p += Math.min(12, Math.max(0, Math.round(opts.upgradeDelta / 2)));
  return Math.max(40, Math.min(85, Math.round(p)));
}

export function buildLeagueTradeTargets({
  leagues,
  rosterByLeague,
  sleeperByLeague,
  usersByLeague,
  tradesByLeague,
  tfoOf,
  metaOf,
}: BuildLeagueTradeTargetsParams): TradeTargetItem[] {
  const targets: TradeTargetItem[] = [];
  // De-dupe recommendations across leagues: a player picked for one league is
  // skipped as a candidate in every other league.
  const usedPlayerIds = new Set<string>();

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

    // ── User's per-position depth in THIS league ──────────────────────────────
    const userBest: Record<SkillPosition, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    const userAbove: Record<SkillPosition, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const pid of Array.from(myPlayerIds)) {
      const meta = metaOf(pid);
      if (!meta || !isSkillPosition(meta.position)) continue;
      const tfo = tfoOf(pid);
      userBest[meta.position] = Math.max(userBest[meta.position], tfo);
      if (tfo > SURPLUS_TFO) userAbove[meta.position] += 1;
    }

    // Positions ranked weakest-first — the user's biggest needs.
    const needsOrder = [...SKILL_POSITIONS].sort((a, b) => userBest[a] - userBest[b]);
    const userNeed = needsOrder[0]!;
    // User's surplus position (real depth), strongest first, distinct from need.
    const userSurplusPos =
      [...SKILL_POSITIONS]
        .filter((p) => p !== userNeed && userAbove[p] >= SURPLUS_COUNT)
        .sort((a, b) => userBest[b] - userBest[a])[0] ?? null;

    // ── Positions each opponent recently traded away ──────────────────────────
    // Sleeper trade: drops[playerId] = roster_id that gave the player up.
    const tradedAwayByRoster = new Map<number, Set<SkillPosition>>();
    for (const tx of tradesByLeague.get(league.id) ?? []) {
      if (tx.type !== 'trade') continue;
      for (const [pid, giverRosterId] of Object.entries(tx.drops ?? {})) {
        const meta = metaOf(String(pid));
        if (!meta || !isSkillPosition(meta.position)) continue;
        const set = tradedAwayByRoster.get(giverRosterId) ?? new Set<SkillPosition>();
        set.add(meta.position);
        tradedAwayByRoster.set(giverRosterId, set);
      }
    }

    // ── Build opponent info ───────────────────────────────────────────────────
    const opponents: OpponentInfo[] = [];
    for (const roster of rosters) {
      if (roster.roster_id === myRosterId) continue;
      const byPos = emptyByPos();
      for (const pidRaw of roster.players ?? []) {
        const pid = String(pidRaw);
        if (myPlayerIds.has(pid)) continue;
        const meta = metaOf(pid);
        if (!meta || !isSkillPosition(meta.position)) continue;
        const tfo = tfoOf(pid);
        if (tfo <= 0) continue;
        byPos[meta.position].players.push({ pid, tfo });
      }
      for (const pos of SKILL_POSITIONS) {
        const b = byPos[pos];
        b.players.sort((a, c) => c.tfo - a.tfo);
        b.above = b.players.filter((p) => p.tfo > SURPLUS_TFO).length;
        b.best = b.players[0]?.tfo ?? 0;
      }
      opponents.push({
        rosterId: roster.roster_id,
        ownerName: ownerName(roster.roster_id, roster.owner_id),
        byPos,
        tradedAway: tradedAwayByRoster.get(roster.roster_id) ?? new Set<SkillPosition>(),
      });
    }

    // Pick the best (highest-TFO) not-yet-used candidate from a list.
    const pickBest = (cands: Candidate[]): Candidate | null => {
      const sorted = cands.filter((c) => !usedPlayerIds.has(c.playerId)).sort((a, b) => b.tfo - a.tfo);
      return sorted[0] ?? null;
    };

    let chosen: Candidate | null = null;

    // ── PRIORITY 1: players on the block at the user's needs ───────────────────
    for (const need of needsOrder) {
      const cands: Candidate[] = [];
      for (const opp of opponents) {
        const bucket = opp.byPos[need];
        if (bucket.players.length === 0) continue;
        const surplus = bucket.above >= SURPLUS_COUNT;
        const trading = opp.tradedAway.has(need);
        if (!surplus && !trading) continue;
        // Surplus → offer their extras (keep one starter); trading-only → their
        // top bodies. Offering several lets cross-league de-dup fall through to
        // an alternative instead of dropping the league entirely.
        const start = surplus ? 1 : 0;
        const end = surplus ? bucket.players.length : Math.min(2, bucket.players.length);
        for (let k = start; k < end; k++) {
          const pk = bucket.players[k]!;
          if (pk.tfo <= userBest[need]) break; // sorted desc → the rest are smaller too
          cands.push({
            playerId: pk.pid,
            tfo: pk.tfo,
            position: need,
            opponent: opp,
            via: surplus ? 'surplus' : 'trading',
            acceptance: acceptanceProb({
              mutualNeed: false,
              surplus,
              trading,
              upgradeDelta: pk.tfo - userBest[need],
            }),
          });
        }
      }
      const best = pickBest(cands);
      if (best) {
        chosen = best;
        break; // satisfied the neediest position with a real on-the-block piece
      }
    }

    // ── PRIORITY 2: mutual need ────────────────────────────────────────────────
    if (!chosen && userSurplusPos) {
      const cands: Candidate[] = [];
      for (const opp of opponents) {
        const theirDepth = opp.byPos[userNeed];
        const theirThin = opp.byPos[userSurplusPos];
        const hasSurplus = theirDepth.above >= SURPLUS_COUNT;
        const isThin = theirThin.best < THIN_TFO; // they'd want the user's surplus
        if (!hasSurplus || !isThin) continue;
        // Their extras beyond one starter — offer several for de-dup fall-through.
        for (let k = 1; k < theirDepth.players.length; k++) {
          const pk = theirDepth.players[k]!;
          if (pk.tfo <= userBest[userNeed]) break;
          cands.push({
            playerId: pk.pid,
            tfo: pk.tfo,
            position: userNeed,
            opponent: opp,
            via: 'mutual',
            fillsTheirNeed: userSurplusPos,
            acceptance: acceptanceProb({
              mutualNeed: true,
              surplus: true,
              trading: opp.tradedAway.has(userNeed),
              upgradeDelta: pk.tfo - userBest[userNeed],
            }),
          });
        }
      }
      chosen = pickBest(cands);
    }

    if (!chosen) continue; // no honest target — skip rather than duplicate a global pick

    const meta = metaOf(chosen.playerId);
    if (!meta) continue;
    usedPlayerIds.add(chosen.playerId);

    const pos = chosen.position;
    const opp = chosen.opponent;
    let reason: string;
    if (chosen.via === 'mutual') {
      const count = opp.byPos[pos].above;
      reason =
        `${opp.ownerName} has ${count} ${pos}s with TFO > ${SURPLUS_TFO} and needs ` +
        `${chosen.fillsTheirNeed} depth — matches your surplus. ${chosen.acceptance}% acceptance probability.`;
    } else if (chosen.via === 'surplus') {
      const count = opp.byPos[pos].above;
      reason =
        `${opp.ownerName} has ${count} ${pos}s with TFO > ${SURPLUS_TFO} (surplus) — ` +
        `${meta.name} is on the block and upgrades your ${pos}. ${chosen.acceptance}% acceptance probability.`;
    } else {
      reason =
        `${opp.ownerName} recently traded away ${pos} depth — ${meta.name} is on the block and ` +
        `upgrades your ${pos}. ${chosen.acceptance}% acceptance probability.`;
    }

    targets.push({
      playerId: chosen.playerId,
      playerName: meta.name,
      position: meta.position.toUpperCase(),
      team: meta.team,
      leagueName: league.name,
      leagueId: league.id,
      tfoScore: chosen.tfo,
      reason,
      acquireCost: acquireCostForScore(chosen.tfo),
    });
  }

  return targets;
}
