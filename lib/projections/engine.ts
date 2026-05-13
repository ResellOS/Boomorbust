/**
 * Projection engine for card-generator.
 * Builds realistic per-player stat projections using TFO component
 * scores, age curve (DAC), injury risk (MRS), and breakout meter (BPS).
 */

import { getKTCValues } from '@/lib/values/ktc';
import { fetchAllPlayers } from '@/lib/sleeper/players';

export interface PlayerProjection {
  year: number;
  // QB
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  rushingYards?: number;
  rushingTDs?: number;
  // RB
  carries?: number;
  rushingYardsRB?: number;
  rushingTDsRB?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  // WR/TE
  targets?: number;
  receptionsWR?: number;
  receivingYardsWR?: number;
  receivingTDsWR?: number;
  // Fantasy
  projectedFantasyPoints?: number;
  projectedFinish?: string;
}

interface ProjectionInput {
  playerId: string;
  position: string;
  age: number;
  team: string;
  tfoScore: number;
  bpsScore?: number;
  mrsScore?: number;
  ktcValue?: number;
  year?: number;
}

function round(n: number, nearest: number): number {
  return Math.round(n / nearest) * nearest;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Age curve multiplier: peaks at position prime, tapers toward ends */
function ageCurveMultiplier(position: string, age: number): number {
  const pos = position.toUpperCase();
  let peak: number;
  if (pos === 'QB') peak = 28;
  else if (pos === 'RB') peak = 24;
  else if (pos === 'WR') peak = 26;
  else peak = 27; // TE

  const dist = Math.abs(age - peak);
  if (dist <= 1) return 1.05;
  if (dist <= 2) return 1.0;
  if (dist <= 3) return 0.95;
  if (dist <= 4) return 0.9;
  return 0.82;
}

/** TFO score → opportunity multiplier (0-100 → 0.65-1.25) */
function tfoMultiplier(tfoScore: number): number {
  return 0.65 + (clamp(tfoScore, 0, 100) / 100) * 0.6;
}

/** BPS breakout bonus for young players with high breakout potential */
function bpsBonus(bpsScore: number | undefined, age: number): number {
  if (!bpsScore || bpsScore < 60) return 1.0;
  if (age > 26) return 1.0;
  return 1.0 + (bpsScore - 60) / 400; // max ~+10% at BPS=100 age<=26
}

/** MRS risk discount — high injury risk = conservative floor */
function mrsDiscount(mrsScore: number | undefined): number {
  if (!mrsScore) return 1.0;
  if (mrsScore > 70) return 0.82;
  if (mrsScore > 50) return 0.90;
  if (mrsScore > 30) return 0.96;
  return 1.0;
}

function projectQB(input: ProjectionInput): PlayerProjection {
  const base = { passingYards: 4150, passingTDs: 28, interceptions: 11, rushingYards: 300, rushingTDs: 3 };
  const m = tfoMultiplier(input.tfoScore) * ageCurveMultiplier(input.position, input.age) * bpsBonus(input.bpsScore, input.age) * mrsDiscount(input.mrsScore);

  const passingYards = round(clamp(base.passingYards * m, 2200, 5400), 50);
  const passingTDs   = clamp(Math.round(base.passingTDs * m), 12, 55);
  const interceptions = clamp(Math.round(base.interceptions / m), 3, 20);
  const rushingYards  = round(clamp(base.rushingYards * m, 0, 1200), 25);
  const rushingTDs    = clamp(Math.round(base.rushingTDs * m), 0, 15);

  const fp = Math.round((passingYards / 25) + (passingTDs * 4) - (interceptions * 2) + (rushingYards / 10) + (rushingTDs * 6));
  const finish = fp >= 320 ? 'QB1' : fp >= 260 ? 'QB2' : 'QB3';

  return {
    year: input.year ?? 2026,
    passingYards,
    passingTDs,
    interceptions,
    rushingYards,
    rushingTDs,
    projectedFantasyPoints: fp,
    projectedFinish: finish,
  };
}

function projectRB(input: ProjectionInput): PlayerProjection {
  const base = { carries: 195, rushingYards: 850, rushingTDs: 7, receptions: 42, receivingYards: 320, receivingTDs: 2 };
  const m = tfoMultiplier(input.tfoScore) * ageCurveMultiplier(input.position, input.age) * bpsBonus(input.bpsScore, input.age) * mrsDiscount(input.mrsScore);

  const carries       = clamp(Math.round(base.carries * m), 50, 350);
  const rushingYards  = round(clamp(base.rushingYards * m, 150, 2000), 25);
  const rushingTDs    = clamp(Math.round(base.rushingTDs * m), 1, 25);
  const receptions    = clamp(Math.round(base.receptions * m / 5) * 5, 5, 100);
  const receivingYards = round(clamp(base.receivingYards * m, 50, 800), 25);
  const receivingTDs  = clamp(Math.round(base.receivingTDs * m), 0, 8);

  const fp = Math.round((rushingYards / 10) + (rushingTDs * 6) + (receptions * 1) + (receivingYards / 10) + (receivingTDs * 6));
  const finish = fp >= 280 ? 'RB1' : fp >= 200 ? 'RB2' : 'RB3';

  return {
    year: input.year ?? 2026,
    carries,
    rushingYardsRB: rushingYards,
    rushingTDsRB: rushingTDs,
    receptions,
    receivingYards,
    receivingTDs,
    projectedFantasyPoints: fp,
    projectedFinish: finish,
  };
}

function projectWR(input: ProjectionInput): PlayerProjection {
  const base = { targets: 110, receptions: 72, receivingYards: 960, receivingTDs: 7 };
  const m = tfoMultiplier(input.tfoScore) * ageCurveMultiplier(input.position, input.age) * bpsBonus(input.bpsScore, input.age) * mrsDiscount(input.mrsScore);

  const targets       = clamp(Math.round(base.targets * m / 5) * 5, 30, 200);
  const receptions    = clamp(Math.round(base.receptions * m / 5) * 5, 20, 140);
  const receivingYards = round(clamp(base.receivingYards * m, 200, 1800), 50);
  const receivingTDs  = clamp(Math.round(base.receivingTDs * m), 1, 18);

  const fp = Math.round((receptions * 1) + (receivingYards / 10) + (receivingTDs * 6));
  const finish = fp >= 250 ? 'WR1' : fp >= 180 ? 'WR2' : 'WR3';

  return {
    year: input.year ?? 2026,
    targets,
    receptionsWR: receptions,
    receivingYardsWR: receivingYards,
    receivingTDsWR: receivingTDs,
    projectedFantasyPoints: fp,
    projectedFinish: finish,
  };
}

function projectTE(input: ProjectionInput): PlayerProjection {
  const base = { targets: 90, receptions: 60, receivingYards: 720, receivingTDs: 6 };
  const m = tfoMultiplier(input.tfoScore) * ageCurveMultiplier(input.position, input.age) * bpsBonus(input.bpsScore, input.age) * mrsDiscount(input.mrsScore);

  const targets       = clamp(Math.round(base.targets * m / 5) * 5, 20, 160);
  const receptions    = clamp(Math.round(base.receptions * m / 5) * 5, 15, 110);
  const receivingYards = round(clamp(base.receivingYards * m, 150, 1400), 50);
  const receivingTDs  = clamp(Math.round(base.receivingTDs * m), 1, 14);

  const fp = Math.round((receptions * 1) + (receivingYards / 10) + (receivingTDs * 6));
  const finish = fp >= 200 ? 'TE1' : fp >= 140 ? 'TE2' : 'TE3';

  return {
    year: input.year ?? 2026,
    targets,
    receptionsWR: receptions,
    receivingYardsWR: receivingYards,
    receivingTDsWR: receivingTDs,
    projectedFantasyPoints: fp,
    projectedFinish: finish,
  };
}

export async function generateProjection(input: ProjectionInput): Promise<PlayerProjection> {
  const pos = input.position.toUpperCase();
  if (pos === 'QB') return projectQB(input);
  if (pos === 'RB') return projectRB(input);
  if (pos === 'TE') return projectTE(input);
  return projectWR(input);
}

/** Get dynasty rank label for a player among their position group from KTC */
export async function getDynastyRankLabel(playerId: string, position: string): Promise<{ rank: number; label: string }> {
  try {
    const [allPlayers, ktcList] = await Promise.all([fetchAllPlayers(), getKTCValues()]);
    if (!allPlayers || !ktcList?.length) return { rank: 0, label: '' };

    const player = allPlayers[playerId] as { full_name?: string } | undefined;
    if (!player?.full_name) return { rank: 0, label: '' };

    const posUpper = position.toUpperCase();
    const posPlayers = ktcList.filter((k) => k.position.toUpperCase() === posUpper);
    posPlayers.sort((a, b) => b.ktc_value - a.ktc_value);

    const nameLower = player.full_name.toLowerCase();
    const idx = posPlayers.findIndex((k) => k.player_name.toLowerCase() === nameLower);
    const rank = idx >= 0 ? idx + 1 : 0;
    const label = rank > 0 ? `#${rank} Dynasty ${posUpper}` : '';

    return { rank, label };
  } catch {
    return { rank: 0, label: '' };
  }
}
