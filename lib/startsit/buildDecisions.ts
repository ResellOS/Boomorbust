import { formatStartSitConfidence } from '@/lib/ui/labels';
import type {
  DecisionsSummary,
  FlexDecision,
  LineupDecision,
  LineupOptimizer,
  StartSitRecommendation,
} from './types';
import { estimateProjection } from './utils';

const POSITION_SLOTS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
};

function computeEdgePts(
  start: StartSitRecommendation,
  sit: StartSitRecommendation,
): number {
  const pA = start.projectedPoints;
  const pB = sit.projectedPoints;
  if (pA != null && pB != null) {
    return Math.round((pA - pB) * 10) / 10;
  }
  return Math.round((start.startScore - sit.startScore) * 0.12 * 10) / 10;
}

function computeConfidence(
  start: StartSitRecommendation,
  sit: StartSitRecommendation,
): number {
  const gap = start.startScore - sit.startScore;
  return Math.min(85, Math.round(55 + gap * 1.5));
}

function buildDecisionWhy(
  start: StartSitRecommendation,
  sit: StartSitRecommendation,
  edgePts: number,
): { bullets: string[]; oneLine: string } {
  const bullets: string[] = [];
  if (edgePts > 0) {
    bullets.push(`Higher projected output (+${edgePts.toFixed(1)} pts)`);
  }
  for (const b of start.whyBullets ?? []) {
    if (bullets.length >= 4) break;
    if (!bullets.includes(b)) bullets.push(b);
  }
  if (bullets.length < 2 && start.reasoning) {
    bullets.push(start.reasoning);
  }
  if (bullets.length < 2) {
    bullets.push(`${start.fullName} grades higher than ${sit.fullName} this week`);
  }
  return { bullets, oneLine: bullets[0] ?? `${start.fullName} over ${sit.fullName}` };
}

function decisionVariant(
  start: StartSitRecommendation,
  sit: StartSitRecommendation,
): 'start' | 'sit' {
  if (sit.obviousCall || sit.startScore < 40) return 'sit';
  return 'start';
}

export function buildLineupDecisions(
  leagueRosters: Map<string, string[]>,
  leagueNames: Map<string, string>,
  recById: Map<string, StartSitRecommendation>,
  minScoreGap = 3,
): LineupDecision[] {
  const decisions: LineupDecision[] = [];

  for (const [leagueId, pids] of Array.from(leagueRosters.entries())) {
    const leagueName = leagueNames.get(leagueId) ?? 'League';

    for (const pos of ['QB', 'RB', 'WR', 'TE']) {
      const atPos = (pids as string[])
        .map((id: string) => recById.get(id))
        .filter(
          (r): r is StartSitRecommendation =>
            !!r && r.position === pos && r.tfoScore > 0,
        )
        .sort((a: StartSitRecommendation, b: StartSitRecommendation) => b.startScore - a.startScore);

      if (atPos.length < 2) continue;

      const startPlayer = atPos[0];
      const sitPlayer = atPos[1];
      const gap = startPlayer.startScore - sitPlayer.startScore;
      if (gap < minScoreGap) continue;

      const edgePts = computeEdgePts(startPlayer, sitPlayer);
      if (edgePts <= 0) continue;

      const confidence = computeConfidence(startPlayer, sitPlayer);
      const tier = formatStartSitConfidence(confidence);
      const { bullets, oneLine } = buildDecisionWhy(startPlayer, sitPlayer, edgePts);
      const variant = decisionVariant(startPlayer, sitPlayer);

      decisions.push({
        id: `${leagueId}-${pos}-${startPlayer.playerId}-${sitPlayer.playerId}`,
        variant,
        startPlayer,
        sitPlayer,
        leagueId,
        leagueName,
        position: pos,
        edgePts,
        confidence,
        confidenceTier: tier,
        whyBullets: bullets,
        whyOneLine: oneLine,
        decisionLabel: `Start ${startPlayer.fullName} over ${sitPlayer.fullName}`,
      });
    }
  }

  return decisions.sort((a, b) => b.confidence - a.confidence);
}

export function summarizeDecisions(decisions: LineupDecision[]): DecisionsSummary {
  let high = 0;
  let medium = 0;
  let low = 0;
  let expectedGain = 0;

  for (const d of decisions) {
    expectedGain += d.edgePts;
    if (d.confidence >= 71) high += 1;
    else if (d.confidence >= 62) medium += 1;
    else low += 1;
  }

  const gain = Math.round(expectedGain * 10) / 10;
  return {
    total: decisions.length,
    high,
    medium,
    low,
    expectedGain: gain,
    potentialCost: gain,
  };
}

function lineupGrade(gainPct: number): string {
  if (gainPct >= 8) return 'A';
  if (gainPct >= 5) return 'B+';
  if (gainPct >= 3) return 'B';
  if (gainPct >= 1.5) return 'C+';
  return 'C';
}

function leagueLineupPoints(
  leagueId: string,
  leagueRosters: Map<string, string[]>,
  recById: Map<string, StartSitRecommendation>,
  decisionsByLeaguePos: Map<string, LineupDecision>,
  optimal: boolean,
): number {
  const pids = leagueRosters.get(leagueId) ?? [];
  let total = 0;

  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const slots = POSITION_SLOTS[pos] ?? 1;
    const group = pids
      .map((id) => recById.get(id))
      .filter(
        (r): r is StartSitRecommendation =>
          !!r && r.position === pos && r.tfoScore > 0,
      )
      .sort((a, b) => b.startScore - a.startScore);

    if (group.length === 0) continue;

    const decKey = `${leagueId}-${pos}`;
    const dec = decisionsByLeaguePos.get(decKey);

    for (let i = 0; i < slots && i < group.length; i++) {
      let pick = group[i];
      if (!optimal && i === 0 && dec) {
        pick = dec.sitPlayer;
      }
      const pts =
        pick.projectedPoints ??
        (pick.tfoScore > 0 ? estimateProjection(pick.tfoScore, pick.position) : 0);
      total += pts;
    }
  }

  return Math.round(total * 10) / 10;
}

export function buildLineupOptimizer(
  decisions: LineupDecision[],
  leagueRosters: Map<string, string[]>,
  recById: Map<string, StartSitRecommendation>,
): LineupOptimizer {
  const decisionsByLeaguePos = new Map<string, LineupDecision>();
  for (const d of decisions) {
    decisionsByLeaguePos.set(`${d.leagueId}-${d.position}`, d);
  }

  const leagueChangesMap = new Map<string, LineupDecision[]>();
  for (const d of decisions) {
    if (!leagueChangesMap.has(d.leagueId)) leagueChangesMap.set(d.leagueId, []);
    leagueChangesMap.get(d.leagueId)!.push(d);
  }

  let currentSum = 0;
  let optSum = 0;
  let leaguesWithData = 0;

  for (const leagueId of Array.from(leagueRosters.keys())) {
    const current = leagueLineupPoints(
      leagueId,
      leagueRosters,
      recById,
      decisionsByLeaguePos,
      false,
    );
    const optimized = leagueLineupPoints(
      leagueId,
      leagueRosters,
      recById,
      decisionsByLeaguePos,
      true,
    );
    if (optimized > 0) {
      currentSum += current;
      optSum += optimized;
      leaguesWithData += 1;
    }
  }

  const currentLineupPts =
    leaguesWithData > 0 ? Math.round((currentSum / leaguesWithData) * 10) / 10 : 0;
  const optimizedLineupPts =
    leaguesWithData > 0 ? Math.round((optSum / leaguesWithData) * 10) / 10 : 0;
  const potentialGain = Math.round((optimizedLineupPts - currentLineupPts) * 10) / 10;
  const gainPct =
    currentLineupPts > 0 ? (potentialGain / currentLineupPts) * 100 : 0;

  const leagueChanges = Array.from(leagueChangesMap.entries())
    .filter(([, decs]) => decs.length > 0)
    .map(([leagueId, decs]) => ({
      leagueId,
      leagueName: decs[0]?.leagueName ?? 'League',
      decisions: decs,
      potentialGain: Math.round(decs.reduce((s: number, d: LineupDecision) => s + d.edgePts, 0) * 10) / 10,
    }))
    .sort((a, b) => b.potentialGain - a.potentialGain);

  const changesRecommended = decisions.length;
  const totalPotentialGain = Math.round(
    leagueChanges.reduce((s, l) => s + l.potentialGain, 0) * 10,
  ) / 10;

  return {
    grade: lineupGrade(gainPct),
    currentLineupPts,
    optimizedLineupPts,
    potentialGain,
    leagueCount: leagueRosters.size,
    changesRecommended,
    totalPotentialGain,
    leagueChanges,
  };
}

export function buildFlexDecisionsFromRecs(
  recs: StartSitRecommendation[],
): FlexDecision[] {
  const flexPool = recs.filter(
    (r) => r.tfoScore > 0 && r.startScore >= 45 && r.startScore <= 65,
  );
  const out: FlexDecision[] = [];

  for (const pos of ['RB', 'WR', 'TE'] as const) {
    const group = flexPool.filter((r) => r.position === pos);
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => b.startScore - a.startScore);
    const playerA = sorted[0];
    const playerB = sorted[1];
    if (Math.abs(playerA.startScore - playerB.startScore) < 2) continue;

    const pick = playerA.startScore >= playerB.startScore ? playerA : playerB;
    const other = pick.playerId === playerA.playerId ? playerB : playerA;
    const edge =
      Math.round(Math.abs(playerA.startScore - playerB.startScore) * 0.12 * 10) / 10;
    const conf = computeConfidence(
      playerA.startScore >= playerB.startScore ? playerA : playerB,
      playerA.startScore >= playerB.startScore ? playerB : playerA,
    );

    out.push({
      position: pos,
      playerA,
      playerB,
      pick,
      pickNote: `Start ${pick.fullName} at FLEX over ${other.fullName}`,
      dynastyEdge: edge,
      confidence: conf,
      confidenceTier: formatStartSitConfidence(conf),
    });
  }

  return out;
}
