import {
  calculateTFOScore,
  normalizeKtcTo100,
  type CalculateTFOScoreInput,
  type TFOPosition,
} from '@/lib/tfo/formula';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import type { TradedPick } from '@/lib/sleeper';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export type GradeTone = 'green' | 'cyan' | 'amber' | 'red';

export type PositionTfoGrade = {
  avgTfo: number;
  letter: string;
  tone: GradeTone;
  count: number;
};

export type TeamNeedsProfile = {
  byPos: Record<'QB' | 'RB' | 'WR' | 'TE', PositionTfoGrade>;
  orderedWeakest: Array<'QB' | 'RB' | 'WR' | 'TE'>;
};

export type TeamWindow = 'rebuild' | 'contend' | 'balanced';

export type PickVerdict = 'KEEP' | 'SELL' | 'NEUTRAL';

export type RosterPlayerLite = {
  player_id: string;
  full_name: string;
  position: string;
  age: number | null;
  team: string | null;
  ktc_value: number;
};

function toSkillPosition(pos: string): TFOPosition | null {
  const p = pos.toUpperCase();
  if (p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE') return p;
  return null;
}

function buildTfoInputFromRoster(p: RosterPlayerLite): CalculateTFOScoreInput | null {
  const position = toSkillPosition(p.position);
  if (!position) return null;
  const ktc = p.ktc_value > 0 ? p.ktc_value : 1800;
  const nk = normalizeKtcTo100(ktc);
  return {
    playerId: p.player_id,
    position,
    age: p.age ?? 26,
    team: (p.team || 'FA').toUpperCase(),
    ocScheme: schemeForTeam(p.team),
    opportunityScore: clamp(42 + nk * 0.38, 28, 94),
    olGrade: 70,
    wrCastGrade: 70,
    redZoneShare: clamp(40 + nk * 0.35, 26, 90),
    ktcValue: ktc,
    ocYear: 3,
    rbUsageStyle: position === 'RB' ? 'POWER' : undefined,
    wrDeployment: position === 'WR' ? 'SLOT' : undefined,
  };
}

function letterFromAvg(avg: number): string {
  if (avg > 80) return subMark(avg, 80, 96, 'A');
  if (avg > 70) return subMark(avg, 70, 80, 'B');
  if (avg > 60) return subMark(avg, 60, 70, 'C');
  if (avg > 45) return subMark(avg, 45, 60, 'D');
  return 'F';
}

function subMark(avg: number, lo: number, hi: number, letter: string): string {
  const span = hi - lo;
  const t = span > 0 ? (avg - lo) / span : 0.55;
  if (letter === 'F') return 'F';
  if (t >= 0.66) return `${letter}+`;
  if (t <= 0.34) return `${letter}-`;
  return letter;
}

export function toneFromAvgTfo(avg: number): GradeTone {
  if (avg > 80) return 'green';
  if (avg > 70) return 'cyan';
  if (avg > 60) return 'amber';
  return 'red';
}

export function computeTeamNeedsFromRoster(players: RosterPlayerLite[]): TeamNeedsProfile {
  const buckets: Record<'QB' | 'RB' | 'WR' | 'TE', number[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  };

  for (const pl of players) {
    const input = buildTfoInputFromRoster(pl);
    if (!input) continue;
    const { tfoScore } = calculateTFOScore(input);
    const pos = input.position;
    buckets[pos].push(tfoScore);
  }

  const byPos = {} as TeamNeedsProfile['byPos'];
  const order: Array<'QB' | 'RB' | 'WR' | 'TE'> = ['QB', 'RB', 'WR', 'TE'];

  for (const pos of order) {
    const arr = buckets[pos];
    if (!arr.length) {
      byPos[pos] = { avgTfo: 40, letter: 'F', tone: 'red', count: 0 };
    } else {
      const avgTfo = arr.reduce((a, b) => a + b, 0) / arr.length;
      byPos[pos] = {
        avgTfo,
        letter: letterFromAvg(avgTfo),
        tone: toneFromAvgTfo(avgTfo),
        count: arr.length,
      };
    }
  }

  const orderedWeakest = [...order].sort((a, b) => byPos[a].avgTfo - byPos[b].avgTfo);
  return { byPos, orderedWeakest };
}

export function inferTeamWindow(args: {
  rising: number;
  declining: number;
  stable: number;
  totalKtc: number;
}): TeamWindow {
  const { rising, declining, totalKtc } = args;
  if (rising > declining + 1 && totalKtc < 42000) return 'rebuild';
  if (declining > rising + 1 && totalKtc > 62000) return 'contend';
  return 'balanced';
}

/** Human-readable slot band for pick cards (proxy for projected draft position). */
export function pickProjectedRangeLabel(
  round: number,
  slotType: 'early' | 'mid' | 'late',
): string {
  if (round === 1) {
    if (slotType === 'early') return 'Top 5';
    if (slotType === 'mid') return 'Mid 1st';
    return 'Late 1st';
  }
  if (round === 2) {
    if (slotType === 'early') return 'Early 2nd';
    if (slotType === 'mid') return 'Mid 2nd';
    return 'Late 2nd';
  }
  if (round === 3) {
    if (slotType === 'early') return 'Early 3rd';
    if (slotType === 'mid') return 'Mid 3rd';
    return 'Late 3rd';
  }
  const ord = `${round}th`;
  if (slotType === 'early') return `Early ${ord}`;
  if (slotType === 'mid') return `Mid ${ord}`;
  return `Late ${ord}`;
}

export function rosterFitCopy(
  needs: TeamNeedsProfile,
  round: number,
): { addresses: string[]; text: string } {
  const weakest = needs.orderedWeakest[0]!;
  const second = needs.orderedWeakest[1]!;
  const wGrade = needs.byPos[weakest];
  const addresses = round <= 2 ? [weakest, second] : [weakest];

  const corps =
    weakest === 'QB'
      ? 'QB room'
      : weakest === 'RB'
        ? 'RB room'
        : weakest === 'WR'
          ? 'WR corps'
          : 'TE room';

  let hook: string;
  if (round <= 2) {
    hook = `Your ${corps} grades ${wGrade.letter} — a ${weakest} in this band upgrades depth immediately and attacks your weakest projection bucket.`;
  } else if (round === 3) {
    hook = `Your ${corps} grades ${wGrade.letter} — mid-round capital is usually developmental; best when you still need bench shots at ${weakest}.`;
  } else {
    hook = `Your ${corps} grades ${wGrade.letter} — late picks are lottery tickets unless you are intentionally stacking youth at ${weakest}.`;
  }

  const depthNote = wGrade.count ? `${wGrade.count} ${weakest} on roster` : 'thin chart at this spot';
  const text = `${hook} (${depthNote}).`;

  return { addresses, text };
}

export function pickVerdict(args: {
  round: number;
  slotType: 'early' | 'mid' | 'late';
  tier: 'high' | 'medium' | 'low';
  teamWindow: TeamWindow;
  needs: TeamNeedsProfile;
}): PickVerdict {
  const { round, slotType, tier, teamWindow, needs } = args;
  const top5Proxy = round === 1 && slotType === 'early';
  const lateRound =
    round >= 4 || (round === 3 && slotType === 'late') || (round === 2 && slotType === 'late');

  const weakestPos = needs.orderedWeakest[0]!;
  const weakest = needs.byPos[weakestPos];
  /** C-grade or worse avg TFO — room this pick could realistically help */
  const weaknessAddressable = weakest.avgTfo <= 70;

  const order = ['QB', 'RB', 'WR', 'TE'] as const;
  const minAvg = Math.min(...order.map((p) => needs.byPos[p].avgTfo));
  const depthEverywhere = minAvg > 65;

  const rebuildHold =
    teamWindow === 'rebuild' && round <= 2 && (tier !== 'low' || weaknessAddressable);
  const weaknessHold =
    weaknessAddressable && round <= 2 && (tier === 'high' || tier === 'medium');

  if (top5Proxy || rebuildHold || weaknessHold) return 'KEEP';

  if (teamWindow === 'contend' && lateRound) return 'SELL';

  if (teamWindow === 'contend' && depthEverywhere && round >= 2 && slotType !== 'early') return 'SELL';

  if (teamWindow === 'contend' && tier === 'low' && round >= 3) return 'SELL';

  return 'NEUTRAL';
}

export type LeaguePickContextBlurb = {
  headline: string;
  detail: string;
};

export function leaguePickContextForSeason(
  picks: TradedPick[],
  season: string,
  myRosterId: number | null,
  totalRosters: number,
): LeaguePickContextBlurb {
  const seasonPicks = picks.filter((p) => p.season === season);
  const firsts = seasonPicks.filter((p) => p.round === 1);

  const pickCountByOwner = new Map<number, number>();
  for (const p of seasonPicks) {
    pickCountByOwner.set(p.owner_id, (pickCountByOwner.get(p.owner_id) ?? 0) + 1);
  }

  const multiCapital = Array.from(pickCountByOwner.entries()).filter(([, c]) => c >= 2);
  const othersMulti = multiCapital.filter(([rid]) => rid !== myRosterId).length;

  const ownersWithFirst = new Set(firsts.map((p) => p.owner_id)).size;
  const density = firsts.length / Math.max(totalRosters, 1);

  const multiLabel =
    othersMulti === 1
      ? '1 other team has multiple'
      : `${othersMulti} other teams have multiple`;

  if (othersMulti >= 3 || density >= 1.35) {
    return {
      headline: 'Rookie picks are abundant in your league',
      detail: `${multiLabel} ${season} picks · ${firsts.length} first-rounders in circulation`,
    };
  }

  const fewFirstOwners = ownersWithFirst <= Math.max(2, Math.ceil(totalRosters * 0.35));
  if (fewFirstOwners) {
    const onlyLabel =
      ownersWithFirst === 1
        ? `Only 1 team has a ${season} 1st`
        : `Only ${ownersWithFirst} teams have ${season} firsts`;
    return {
      headline: 'Premium picks are scarce',
      detail: `${onlyLabel} · scarcity favors sellers`,
    };
  }

  return {
    headline: 'Balanced league capital',
    detail: `${firsts.length} ${season} 1sts across ${ownersWithFirst} rosters — liquidity looks typical`,
  };
}
