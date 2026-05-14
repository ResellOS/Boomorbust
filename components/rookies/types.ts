import type { FFigGrade } from '@/lib/ffig/engine';

export type RookieVerdict = 'ELITE' | 'SMASH' | 'BUY' | 'HIGH UPSIDE' | 'SOLID' | 'DEVELOP' | 'RISK';
export type RookieTabId = 'board' | 'ffig' | 'landing' | 'sleepers' | 'capital' | 'measurables' | 'film' | 'rankings';
export type RookiePosition = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';
export type DraftClass = '2025' | '2024' | '2023';

export interface LandingSpotGrades {
  offensiveEnvironment: string;  // "A-"
  qbQuality:           string;
  targetCompetition:   string;
  coachingGrade:       string;
  schemeFit:           string;
  overall:             string;
}

export interface LandingSpotPentagonPoint {
  label: string;
  value: number; // 0-100
  grade: string;
}

export interface Measurables {
  fortyYard:   { value: string; percentile: number };
  vertical:    { value: string; percentile: number };
  broadJump:   { value: string; percentile: number };
  armLength:   { value: string; percentile: number };
}

export interface RookieProspect {
  rank:          number;
  id:            string;
  name:          string;
  position:      string;
  college:       string;
  team:          string;        // NFL team
  draftRound:    number;
  draftPick:     number;
  ffigGrade:     FFigGrade;
  ffigScore:     number;
  rtsScore:      number;        // 0-100
  draftCapital:  string;        // "1.01 (Top 5)"
  draftCapitalRaw: number;      // pick number for sorting
  landingTeam:   string;        // "ARI"
  boomPct:       number;        // 0-100
  treFit:        number;        // 0-100
  verdict:       RookieVerdict;
  tfoSnapshot:   number;
  domScore:      number;
  rasScore:      number;
  landingSpotGrades: LandingSpotGrades;
  landingSpotPentagon: LandingSpotPentagonPoint[];
  measurables:   Measurables;
  // For sleepers tab
  isSleeper:     boolean;
  // RTS vs ADP delta for draft steals
  rtsVsAdpDelta: number;
  sleeperPct:    number;        // % of leagues that have them
  idealRange:    string;        // "2.02-3.02"
  reasoning:     string;
}

export interface DraftOutlook {
  classStrength:  string;  // "WR"
  overallGrade:   number;  // 83
  description:    string;
}

export interface RookieBoardData {
  prospects:     RookieProspect[];
  draftSteals:   RookieProspect[];  // top 5 by rtsVsAdpDelta
  draftOutlook:  DraftOutlook;
  totalProfiles: number;
  tier1Count:    number;
  hiddenValues:  number;
  avgRtsEdge:    number;
  hitRate:       number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function verdictColor(v: RookieVerdict): string {
  switch (v) {
    case 'ELITE':      return '#FBBF24';
    case 'SMASH':      return '#36E7A1';
    case 'BUY':        return '#22D3EE';
    case 'HIGH UPSIDE':return '#A78BFA';
    case 'SOLID':      return '#60a5fa';
    case 'DEVELOP':    return '#FBBF24';
    case 'RISK':       return '#EF4444';
  }
}

export function ffigGradeStyle(grade: FFigGrade): { bg: string; color: string } {
  switch (grade) {
    case 'A+': return { bg: 'rgba(251,191,36,0.2)',  color: '#FBBF24' };
    case 'A':  return { bg: 'rgba(54,231,161,0.15)', color: '#36E7A1' };
    case 'B+': return { bg: 'rgba(34,211,238,0.15)', color: '#22D3EE' };
    case 'B':  return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' };
    case 'C+': return { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24' };
    case 'C':  return { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af' };
    default:   return { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' };
  }
}

export function posColor(pos: string): string {
  switch (pos) {
    case 'QB': return '#FBBF24';
    case 'RB': return '#36E7A1';
    case 'WR': return '#22D3EE';
    case 'TE': return '#A78BFA';
    default:   return '#64748B';
  }
}

export function gradeToValue(grade: string): number {
  switch (grade) {
    case 'A+': return 97;
    case 'A':  return 90;
    case 'A-': return 85;
    case 'B+': return 78;
    case 'B':  return 72;
    case 'B-': return 65;
    case 'C+': return 58;
    case 'C':  return 50;
    default:   return 40;
  }
}
