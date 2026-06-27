import type { GradeLabel, LeagueBundle, PortfolioBundle, PositionKey, RosterBreakdown } from './rotation';

export interface RosterConstructionGrade {
  key: string;
  label: string;
  letter: string;
  descriptor: string;
  color: string;
  barFill: number;
}

function letterGrade(grade: GradeLabel, avgTfo: number): { letter: string; descriptor: string } {
  if (grade === 'Strong') {
    if (avgTfo >= 75) return { letter: 'A', descriptor: 'Excellent' };
    return { letter: 'A-', descriptor: 'Strong' };
  }
  if (grade === 'Average') {
    if (avgTfo >= 62) return { letter: 'B+', descriptor: 'Good' };
    return { letter: 'B', descriptor: 'Average' };
  }
  if (avgTfo > 0) return { letter: 'C', descriptor: 'Weak' };
  return { letter: 'D', descriptor: 'Risky' };
}

function gradeColor(letter: string): string {
  if (letter.startsWith('A')) return '#36E7A1';
  if (letter.startsWith('B')) return '#60a5fa';
  if (letter === 'C' || letter === 'C+') return '#FBBF24';
  return '#EF4444';
}

function barFillFromLetter(letter: string, avgTfo: number): number {
  if (letter === '—') return 0;
  if (letter.startsWith('A')) return letter === 'A' ? 92 : 85;
  if (letter === 'B+') return 72;
  if (letter === 'B') return 62;
  if (letter === 'C+') return 48;
  if (letter === 'C') return 38;
  return Math.min(30, Math.max(8, Math.round(avgTfo * 0.4)));
}

const ROOM_LABEL: Record<PositionKey, string> = {
  QB: 'QB Room',
  RB: 'RB Room',
  WR: 'WR Room',
  TE: 'TE Room',
};

export function computeRosterConstructionGrades(
  breakdown: RosterBreakdown,
  portfolio: PortfolioBundle,
): RosterConstructionGrade[] {
  const roomGrades: RosterConstructionGrade[] = breakdown.positionGrades.map((pg) => {
    const { letter, descriptor } = letterGrade(pg.grade, pg.avgTfo);
    return {
      key: pg.position,
      label: ROOM_LABEL[pg.position],
      letter,
      descriptor,
      color: gradeColor(letter),
      barFill: barFillFromLetter(letter, pg.avgTfo),
    };
  });

  const strongCount = breakdown.positionGrades.filter((g) => g.grade === 'Strong').length;
  const weakCount = breakdown.positionGrades.filter((g) => g.grade === 'Weak').length;
  let ageLetter = 'B';
  let ageDesc = 'Average';
  if (strongCount >= 3) {
    ageLetter = 'A-';
    ageDesc = 'Excellent';
  } else if (weakCount >= 2) {
    ageLetter = 'C+';
    ageDesc = 'Risky';
  }

  const tfo = portfolio.teamTfo;
  let draftLetter = '—';
  let draftDesc = 'Not tracked yet';
  if (tfo >= 70) {
    draftLetter = 'B+';
    draftDesc = 'Good';
  } else if (tfo >= 55) {
    draftLetter = 'B';
    draftDesc = 'Average';
  } else if (tfo > 0) {
    draftLetter = 'C';
    draftDesc = 'Needs picks';
  }

  return [
    ...roomGrades,
    {
      key: 'age',
      label: 'Age Curve',
      letter: ageLetter,
      descriptor: ageDesc,
      color: gradeColor(ageLetter),
      barFill: barFillFromLetter(ageLetter, strongCount >= 3 ? 72 : 55),
    },
    {
      key: 'draft',
      label: 'Draft Capital',
      letter: draftLetter,
      descriptor: draftDesc,
      color: draftLetter === '—' ? '#6b7a99' : gradeColor(draftLetter),
      barFill: draftLetter === '—' ? 0 : barFillFromLetter(draftLetter, tfo),
    },
  ];
}

export function breakdownForContext(
  portfolio: PortfolioBundle,
  currentLeague: LeagueBundle | null,
): RosterBreakdown {
  return currentLeague ? currentLeague.breakdown : portfolio.breakdown;
}
