import type { DraftConfig } from './types';
import { pickLabel } from './analyst';

export function safeNum(n: number | null | undefined, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function safeTeams(config: DraftConfig): number {
  return Math.max(1, safeNum(config.teams, 12));
}

export function safeRounds(config: DraftConfig): number {
  return Math.max(1, safeNum(config.rounds, 15));
}

export function safeTotalPicks(config: DraftConfig): number {
  return safeTeams(config) * safeRounds(config);
}

export function safePickLabel(overall: number, teams: number): string {
  const o = safeNum(overall, 0);
  const t = Math.max(1, safeNum(teams, 12));
  if (o <= 0) return '—';
  return pickLabel(o, t);
}

export function safeRoundDisplay(currentOverall: number, config: DraftConfig): string {
  const teams = safeTeams(config);
  const rounds = safeRounds(config);
  const o = Math.max(1, safeNum(currentOverall, 1));
  const round = Math.floor((o - 1) / teams) + 1;
  if (!Number.isFinite(round)) return '—';
  return `${Math.min(round, rounds)} of ${rounds}`;
}

export function safePickProgress(currentOverall: number, config: DraftConfig): string {
  const total = safeTotalPicks(config);
  const o = Math.max(1, safeNum(currentOverall, 1));
  return `${Math.min(o, total)}/${total}`;
}

export function safeFormatLabel(draftType: string | undefined): string {
  if (!draftType) return 'Startup';
  if (draftType === 'startup') return 'Startup Mock';
  if (draftType === 'rookie') return 'Rookie Mock';
  if (draftType === 'redraft') return 'Redraft';
  return draftType;
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, safeNum(seconds, 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function abbrevName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.slice(0, 12);
  const last = parts[parts.length - 1] ?? '';
  return `${parts[0]!.charAt(0)}. ${last}`.slice(0, 14);
}

export function valueGap(playerAdp: number, currentOverall: number): string {
  const adp = safeNum(playerAdp, 0);
  const pick = safeNum(currentOverall, 0);
  if (adp <= 0 || pick <= 0) return '—';
  const gap = adp - pick;
  if (gap > 0) return `+${gap.toFixed(1)}`;
  if (gap < 0) return gap.toFixed(1);
  return '0';
}
