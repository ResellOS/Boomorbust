import type { HubPlayer } from './types';
import type { HubComponents } from './types';
import type { MarketVerdict } from '@/lib/verdict/marketVerdict';
import type { TradeOpportunity } from '@/lib/trade/types';

export interface PlayerTradeHint {
  leagues: { leagueId: string; leagueName: string; tag?: string }[];
  managers: { name: string; leagueName: string; likelihood: number }[];
  openingOffer: string;
  acceptanceProbability: number;
}

export function buildPlayerTradeHints(
  player: HubPlayer,
  ownedLeagueNames: string[],
  allLeagues: { id: string; name: string }[],
  opportunities: TradeOpportunity[],
): PlayerTradeHint {
  const playerOpps = opportunities.filter((o) => o.playerId === player.playerId);
  const sorted = [...playerOpps].sort((a, b) => b.acceptanceProbability - a.acceptanceProbability);

  if (sorted.length > 0) {
    const top = sorted[0]!;
    const leagues = sorted
      .slice(0, 3)
      .map((o) => ({ leagueId: o.leagueId, leagueName: o.leagueName }));
    const seenMgr = new Set<string>();
    const managers = sorted
      .filter((o) => {
        const key = `${o.leagueId}:${o.managerName}`;
        if (seenMgr.has(key)) return false;
        seenMgr.add(key);
        return true;
      })
      .slice(0, 3)
      .map((o) => ({
        name: o.managerName,
        leagueName: o.leagueName,
        likelihood: o.acceptanceProbability,
      }));

    // givePlayerName already IS the full package; suggestedPrice duplicates it.
    const giveParts = [top.givePlayerName, top.suggestedAddOn].filter(Boolean);
    return {
      leagues,
      managers,
      openingOffer: giveParts.join(' + ') || 'Package TBD',
      acceptanceProbability: top.acceptanceProbability,
    };
  }

  const notOwned = allLeagues.filter((l) => !ownedLeagueNames.includes(l.name)).slice(0, 3);
  const mv = player.marketVerdict;
  const pick = mv?.rankDelta != null && Math.abs(mv.rankDelta) >= 40 ? '2027 1st' : '2027 2nd';

  return {
    leagues: notOwned.map((l) => ({ leagueId: l.id, leagueName: l.name })),
    managers: [],
    openingOffer: `${pick} + ${player.position} depth`,
    acceptanceProbability: mv?.rankDelta != null ? Math.min(85, 45 + Math.abs(Math.round(mv.rankDelta))) : 52,
  };
}

export type ScoutingVerdict =
  | 'STRONG BUY'
  | 'BUY'
  | 'HOLD'
  | 'SELL'
  | 'STRONG SELL';

export function scoutingVerdict(
  verdict: MarketVerdict | null,
  tfoScore: number,
  rankDelta: number | null,
): { label: ScoutingVerdict; color: string } {
  const gap = rankDelta ?? 0;
  if (verdict === 'BOOM' || gap >= 35) return { label: 'STRONG BUY', color: '#36E7A1' };
  if (verdict === 'BUY' || gap >= 12) return { label: 'BUY', color: '#36E7A1' };
  if (verdict === 'BUST' || gap <= -35) return { label: 'STRONG SELL', color: '#EF4444' };
  if (verdict === 'SELL' || gap <= -12) return { label: 'SELL', color: '#A78BFA' };
  if (tfoScore >= 88 && gap >= 0) return { label: 'STRONG BUY', color: '#36E7A1' };
  if (tfoScore >= 75 && gap >= 5) return { label: 'BUY', color: '#36E7A1' };
  if (tfoScore < 55 && gap < 0) return { label: 'SELL', color: '#A78BFA' };
  return { label: 'HOLD', color: '#64748B' };
}

export function confidencePercent(tier: string | null | undefined): number {
  const t = (tier ?? '').toUpperCase();
  if (t === 'HIGH' || t === 'ELITE') return 99;
  if (t === 'MEDIUM') return 72;
  if (t === 'LOW') return 48;
  return 65;
}

export function marketInefficiencyAction(
  verdict: MarketVerdict | null,
  rankDelta: number | null,
): string {
  const gap = rankDelta ?? 0;
  if (gap >= 20 || verdict === 'BOOM' || verdict === 'BUY') return 'Buy Before Market Corrects';
  if (gap <= -20 || verdict === 'SELL' || verdict === 'BUST') return 'Sell Before Market Catches Up';
  return 'Hold — Market Aligned';
}

/** Madden / front-office style player title badge */
export function playerFrontOfficeTitle(player: HubPlayer, rankGap: number | null): string {
  const score = player.tfoScore;
  const age = player.age;
  const gap = rankGap ?? 0;
  const mv = player.marketVerdict?.verdict;
  const injured = Boolean(player.bio?.injuryStatus);
  const direction = player.valueSignal?.direction60d;

  if (score >= 92 && player.position === 'QB') return 'Franchise Cornerstone';
  if (score >= 90) return 'Franchise Cornerstone';
  if (gap >= 30 && (mv === 'BOOM' || mv === 'BUY')) return 'Market Inefficiency';
  if (score >= 85 && age != null && age <= 26) return 'Ascending Superstar';
  if (score >= 82 && age != null && age >= 28) return 'Elite Win-Now Asset';
  if (score >= 78 && gap >= 15) return 'Future League Winner';
  if (injured && score >= 65) return 'Injury Gamble';
  if (score >= 75) return 'Contender Piece';
  if (score >= 68 && direction === 'up') return 'High Variance Bet';
  if (gap <= -25 || mv === 'BUST') return 'Future Bust Candidate';
  if (gap <= -15 && mv === 'SELL') return 'Trade Bait';
  if (score < 55 && age != null && age >= 29) return 'Declining Producer';
  if (score >= 60 && score < 70) return 'Roster Glue';
  if (score >= 70) return 'Elite Win-Now Asset';
  return 'High Variance Bet';
}

export function buildWhyBobLikes(
  player: HubPlayer,
  components: HubComponents | null,
  strengths: string[],
): string[] {
  const bullets: string[] = [];
  const first = player.fullName.split(' ')[0] ?? player.fullName;
  const mv = player.marketVerdict;
  const direction = player.valueSignal?.direction60d;

  if (components && components.ops >= 75) {
    bullets.push('Elite opportunity profile — locked-in volume and role security');
  } else if (components && components.ops >= 60) {
    bullets.push('Strong opportunity share relative to positional peers');
  }

  if (direction === 'up' || (components && components.yoysi >= 65)) {
    bullets.push('Positive trajectory — production trending the right direction');
  }

  if (components && components.sfs >= 70) {
    bullets.push('Strong offensive ecosystem and scheme fit');
  } else if (components && components.sit >= 70) {
    bullets.push('Favorable team situation supports weekly floor');
  }

  if (mv?.rankDelta != null && mv.rankDelta >= 15) {
    bullets.push(
      `Market inefficiency — BOB ranks ${first} ${Math.round(mv.rankDelta)} spots higher than consensus`,
    );
  }

  if (player.age != null && player.age <= 26 && player.tfoScore >= 70) {
    bullets.push('Age advantage — prime dynasty window with years of peak production ahead');
  }

  for (const s of strengths) {
    if (bullets.length >= 5) break;
    if (!bullets.some((b) => b.toLowerCase().includes(s.slice(0, 20).toLowerCase()))) {
      bullets.push(s);
    }
  }

  if (bullets.length === 0) {
    bullets.push(`${first} profiles as a balanced dynasty asset with stable weekly upside`);
  }

  return bullets.slice(0, 5);
}

export function metricCardLabel(
  kind: 'opportunity' | 'situation' | 'production' | 'durability',
  player: HubPlayer,
  components: HubComponents | null,
): { headline: string; sublabel: string; grade: string; score: number } {
  const c = components;
  const bio = player.bio;

  switch (kind) {
    case 'opportunity': {
      const score = c ? Math.round(c.ops) : player.subScores.opportunity;
      const headline =
        score >= 85 ? 'Locked in starter' :
        score >= 70 ? 'Strong role' :
        score >= 55 ? 'Competitive role' : 'Limited opportunity';
      return { headline, sublabel: 'Competition Rating', grade: scoreToGrade(score), score };
    }
    case 'situation': {
      const score = c ? Math.round(c.sit) : player.subScores.situation;
      const headline =
        score >= 85 ? 'Elite offensive system' :
        score >= 70 ? 'Favorable situation' :
        score >= 55 ? 'Neutral context' : 'Situation risk';
      return { headline, sublabel: 'Situation Grade', grade: scoreToGrade(score), score };
    }
    case 'production': {
      const ppg = c?.projectedPpg ?? player.subScores.upside / 4;
      const score = Math.min(100, Math.round((ppg / 28) * 100));
      const headline =
        ppg >= 22 ? 'Elite production' :
        ppg >= 16 ? 'Strong production' :
        ppg >= 12 ? 'Solid output' : 'Developing output';
      return {
        headline,
        sublabel: `${new Date().getFullYear()} PPG`,
        grade: ppg > 0 ? ppg.toFixed(1) : '—',
        score,
      };
    }
    case 'durability': {
      let score = 72;
      if (bio?.injuryStatus) score -= 25;
      if (player.age != null && player.age >= 30) score -= 10;
      if (player.age != null && player.age <= 26) score += 8;
      score = Math.max(20, Math.min(98, score));
      const headline =
        score >= 80 ? 'High durability' :
        score >= 60 ? 'Moderate durability' : 'Injury monitor';
      return { headline, sublabel: 'Durability Grade', grade: scoreToGrade(score), score };
    }
    default:
      return { headline: '—', sublabel: '—', grade: '—', score: 0 };
  }
}

function scoreToGrade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 82) return 'A-';
  if (score >= 76) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 64) return 'B-';
  if (score >= 58) return 'C+';
  return 'C';
}

export function comparableArchetype(player: HubPlayer): string {
  const pos = player.position;
  const score = player.tfoScore;
  if (pos === 'QB' && score >= 85) return 'Elite Dual-Threat Franchise Quarterback';
  if (pos === 'QB' && score >= 75) return 'High-Floor Starting Quarterback';
  if (pos === 'RB' && score >= 80) return 'Workhorse Three-Down Back';
  if (pos === 'WR' && score >= 85) return 'Alpha WR1 Target Hog';
  if (pos === 'WR' && score >= 75) return 'High-Volume WR1';
  if (pos === 'TE' && score >= 75) return 'Mismatch Tight End';
  if (score >= 82) return 'Elite Dynasty Producer';
  if (score >= 70) return 'Solid Weekly Starter';
  return 'Developmental Upside Play';
}
