import type { HubPlayer } from './types';
import type { MarketVerdict } from '@/lib/verdict/marketVerdict';

export interface PlayerBio {
  heightIn: number | null;
  weightLbs: number | null;
  college: string | null;
  yearsExp: number | null;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  draftTeam: string | null;
  injuryStatus: string | null;
}

export function formatHeight(inches: number | null): string {
  if (inches == null || inches <= 0) return '—';
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

export function formatWeight(lbs: number | null): string {
  if (lbs == null || lbs <= 0) return '—';
  return `${lbs} lbs`;
}

export function formatDraftCapital(bio: PlayerBio): string {
  if (bio.draftYear == null) return '—';
  const rd = bio.draftRound != null ? `Rd ${bio.draftRound}` : '';
  const pk = bio.draftPick != null ? `.${String(bio.draftPick).padStart(2, '0')}` : '';
  const team = bio.draftTeam ? ` (${bio.draftTeam})` : '';
  return `${bio.draftYear}${rd ? ` - ${rd}${pk}` : ''}${team}`;
}

export function dynastyArchetype(player: HubPlayer): string {
  const mv = player.marketVerdict?.verdict;
  const score = player.tfoScore;
  const pos = player.position;
  const age = player.age;

  if (pos === 'QB' && score >= 78) return 'FRANCHISE QB';
  if (score >= 82) return 'ELITE PRODUCER';
  if (mv === 'BOOM' || mv === 'BUY') return 'BUY WINDOW';
  if (mv === 'SELL' || mv === 'BUST') return 'MARKET DARLING';
  if (age != null && age >= 30 && pos === 'RB') return 'AGING ASSET';
  if (score >= 70 && age != null && age <= 25) return 'HIGH UPSIDE';
  if (score >= 65) return 'ELITE PRODUCER';
  return 'DEVELOPING ASSET';
}

export function peakWindowYears(age: number | null, position: string): number[] {
  const year = new Date().getFullYear();
  if (age == null) return [year, year + 1, year + 2, year + 3];
  const peakStart =
    position === 'QB' ? Math.max(year, year + (28 - age)) :
    position === 'RB' ? Math.max(year, year + (26 - age)) :
    Math.max(year, year + (27 - age));
  return [peakStart, peakStart + 1, peakStart + 2, peakStart + 3];
}

export function positionPercentile(player: HubPlayer, all: HubPlayer[]): string {
  const peers = all.filter((p) => p.position === player.position && p.tfoScore > 0);
  if (peers.length === 0) return '—';
  const better = peers.filter((p) => p.tfoScore > player.tfoScore).length;
  const pct = Math.round((1 - better / peers.length) * 100);
  return `Top ${Math.max(1, Math.min(99, pct))}% of ${player.position}s`;
}

export function similarPercent(a: HubPlayer, b: HubPlayer): number {
  const scoreDiff = Math.abs(a.tfoScore - b.tfoScore);
  return Math.max(60, Math.min(99, Math.round(100 - scoreDiff * 2.5)));
}

export function recommendationFromVerdict(verdict: MarketVerdict | null): string {
  if (!verdict) return 'HOLD';
  if (verdict === 'BOOM') return 'BUY NOW';
  if (verdict === 'BUY') return 'BUY WINDOW';
  if (verdict === 'SELL') return 'SELL NOW';
  if (verdict === 'BUST') return 'SELL WINDOW';
  return 'HOLD';
}

export function acceptanceFromGap(rankDelta: number | null): number {
  if (rankDelta == null) return 52;
  const gap = Math.abs(Math.round(rankDelta));
  return Math.min(92, Math.max(35, 48 + Math.min(40, gap / 4)));
}

export function portfolioImpactScore(player: HubPlayer, leagueCount: number, totalTfo: number): number {
  if (totalTfo <= 0 || leagueCount <= 0) return 0;
  return Math.round(((player.tfoScore * leagueCount) / totalTfo) * 1000) / 10;
}

export function seasonOutlook(player: HubPlayer): {
  projectedFinish: string;
  fantasyPoints: string;
  gamesPlayed: string;
  range: string;
} {
  const ppg = player.components?.projectedPpg ?? player.subScores.upside / 4;
  const pos = player.position;
  const rankTier =
    player.tfoScore >= 85 ? 3 :
    player.tfoScore >= 75 ? 5 :
    player.tfoScore >= 65 ? 8 :
    12;

  const ranges: Record<string, string> = {
    QB: `QB${rankTier - 2}-QB${rankTier + 3}`,
    RB: `RB${rankTier - 1}-RB${rankTier + 4}`,
    WR: `WR${rankTier}-WR${rankTier + 8}`,
    TE: `TE${rankTier}-TE${rankTier + 6}`,
  };

  return {
    projectedFinish: `${pos}${rankTier}`,
    fantasyPoints: ppg > 0 ? `${(ppg * 17).toFixed(1)}` : '—',
    gamesPlayed: '16.1',
    range: ranges[pos] ?? `${pos}${rankTier}-${pos}${rankTier + 5}`,
  };
}

export function careerSnapshot(player: HubPlayer, bio: PlayerBio): {
  games: string;
  fantasyPpg: string;
  bestFinish: string;
  careerRank: string;
} {
  const ppg = player.components?.projectedPpg;
  return {
    games: bio.yearsExp != null ? String(Math.min(17, bio.yearsExp) * 17) : '—',
    fantasyPpg: ppg != null && ppg > 0 ? ppg.toFixed(1) : '—',
    bestFinish: player.tfoScore >= 80 ? `${player.position}2` : `${player.position}8`,
    careerRank: player.tfoScore >= 75 ? 'Top 15%' : 'Mid Tier',
  };
}

export function contractOutlook(bio: PlayerBio, age: number | null): {
  yearsRemaining: string;
  contractValue: string;
  freeAgencyYear: string;
  longTermOutlook: string;
} {
  const faYear = age != null ? new Date().getFullYear() + Math.max(1, 30 - age) : null;
  return {
    yearsRemaining: age != null && age <= 28 ? '3+' : age != null ? '1-2' : '—',
    contractValue: '—',
    freeAgencyYear: faYear != null ? String(faYear) : '—',
    longTermOutlook: age != null && age <= 26 ? 'Excellent' : age != null && age <= 29 ? 'Good' : 'Monitor',
  };
}

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  Opportunity: 'Volume share, target/touch opportunity, and role security.',
  'Scheme Fit': 'Offensive system alignment and usage efficiency.',
  'Year-Over-Year': 'Production trajectory and consistency vs prior seasons.',
  Situation: 'Team context, competition, and game environment.',
  'Projected Output': 'Expected fantasy points per game this season.',
};

export function parseSleeperBio(raw: Record<string, unknown> | undefined): PlayerBio {
  if (!raw) {
    return {
      heightIn: null,
      weightLbs: null,
      college: null,
      yearsExp: null,
      draftYear: null,
      draftRound: null,
      draftPick: null,
      draftTeam: null,
      injuryStatus: null,
    };
  }
  const meta = (raw.metadata ?? {}) as Record<string, unknown>;
  const height = raw.height != null ? Number(raw.height) : null;
  const weight = raw.weight != null ? Number(raw.weight) : null;
  return {
    heightIn: Number.isFinite(height) ? height : null,
    weightLbs: Number.isFinite(weight) ? weight : null,
    college: typeof raw.college === 'string' ? raw.college : null,
    yearsExp: typeof raw.years_exp === 'number' ? raw.years_exp : null,
    draftYear: meta.draft_year != null ? Number(meta.draft_year) : null,
    draftRound: meta.draft_round != null ? Number(meta.draft_round) : null,
    draftPick: meta.draft_pick != null ? Number(meta.draft_pick) : null,
    draftTeam: typeof raw.team === 'string' ? raw.team : null,
    injuryStatus: typeof raw.injury_status === 'string' ? raw.injury_status : null,
  };
}
