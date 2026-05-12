import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Exported types (imported by the page via `import type`) ─────────────────

export type TeamStatus = 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING';
export type BHSSignal = 'BUY' | 'HOLD' | 'SELL';
export type KTCTrend = 'RISING' | 'STABLE' | 'FALLING';

export interface TeamCardPlayer {
  player_id: string;
  name: string;
  position: string;
  age: number | null;
  team: string;
  tfoScore: number | null;
  tfoGrade: string | null;
  verdict: string | null;
  ktcValue: number;
  bviDelta: number | null;
  bhs: BHSSignal;
}

export interface ContentionWindow {
  peakStart: number;
  peakEnd: number;
  avgAge: number;
  avgTFO: number | null;
  ktcTrend: KTCTrend;
  positionBreakdown: Record<string, { avgAge: number; count: number }>;
  reasoning: string;
}

export interface TeamCard {
  leagueId: string;
  leagueName: string;
  teamName: string | null;
  season: string;
  wins: number;
  losses: number;
  ties: number;
  status: TeamStatus;
  contentionWindow: ContentionWindow;
  managerTitle: string | null;
  topBhsPlayers: TeamCardPlayer[];
  totalPlayers: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const CURRENT_YEAR = new Date().getFullYear();

function toTFOPos(pos: string): TFOPosition {
  const p = pos.toUpperCase() as TFOPosition;
  return SKILL_POSITIONS.has(p) ? p : 'WR';
}

function computeBHS(
  verdict: string | null,
  bviDelta: number | null,
  age: number | null,
  position: string,
): BHSSignal {
  const v = (verdict ?? '').toUpperCase().replace(/[\s-]+/g, '_');
  if (v === 'BUST' || v === 'LEAN_BUST') return 'SELL';
  if (v === 'BOOM' || v === 'LEAN_BOOM') return 'BUY';

  if (age != null) {
    const ageMult = ageCurveMultiplier(toTFOPos(position), age);
    if (ageMult < 0.6) return 'SELL';
    if (ageMult >= 0.95 && (bviDelta == null || bviDelta >= 0)) return 'BUY';
  }

  if (bviDelta != null && bviDelta < -500) return 'SELL';
  if (bviDelta != null && bviDelta > 500) return 'BUY';
  return 'HOLD';
}

function computeContentionWindow(players: TeamCardPlayer[]): ContentionWindow {
  const skill = players.filter((p) => SKILL_POSITIONS.has(p.position));

  if (!skill.length) {
    return {
      peakStart: CURRENT_YEAR,
      peakEnd: CURRENT_YEAR + 2,
      avgAge: 26,
      avgTFO: null,
      ktcTrend: 'STABLE',
      positionBreakdown: {},
      reasoning: 'Insufficient roster data.',
    };
  }

  // Position age breakdown
  const posBuckets: Record<string, number[]> = {};
  for (const p of skill) {
    if (p.age == null) continue;
    if (!posBuckets[p.position]) posBuckets[p.position] = [];
    posBuckets[p.position]!.push(p.age);
  }
  const positionBreakdown: Record<string, { avgAge: number; count: number }> = {};
  for (const [pos, ages] of Object.entries(posBuckets)) {
    const avg = ages.reduce((s, a) => s + a, 0) / ages.length;
    positionBreakdown[pos] = { avgAge: Math.round(avg * 10) / 10, count: ages.length };
  }

  const withAge = skill.filter((p) => p.age != null);
  const avgAge = withAge.length
    ? withAge.reduce((s, p) => s + p.age!, 0) / withAge.length
    : 26;

  const withTFO = skill.filter((p) => p.tfoScore != null);
  const avgTFO = withTFO.length
    ? withTFO.reduce((s, p) => s + p.tfoScore!, 0) / withTFO.length
    : null;

  // KTC trend from BVI delta (negative delta = KTC > BVI = market overvaluing = declining)
  const withDelta = skill.filter((p) => p.bviDelta != null);
  const avgDelta = withDelta.length
    ? withDelta.reduce((s, p) => s + p.bviDelta!, 0) / withDelta.length
    : 0;
  const ktcTrend: KTCTrend =
    avgDelta > 300 ? 'RISING' : avgDelta < -300 ? 'FALLING' : 'STABLE';

  // Base offset: years until peak (negative = past peak)
  let yearsToBase: number;
  if (avgAge < 23) yearsToBase = 4;
  else if (avgAge < 25) yearsToBase = 3;
  else if (avgAge < 27) yearsToBase = 1;
  else if (avgAge < 29) yearsToBase = 0;
  else yearsToBase = -1;

  if (ktcTrend === 'RISING') yearsToBase = Math.max(-1, yearsToBase - 1);
  if (ktcTrend === 'FALLING') yearsToBase = Math.min(5, yearsToBase + 1);

  let windowLength = 2;
  if (avgTFO != null) {
    if (avgTFO >= 80) windowLength = 3;
    else if (avgTFO < 55) windowLength = 1;
  }

  const peakStart = CURRENT_YEAR + Math.max(0, yearsToBase);
  const peakEnd = peakStart + windowLength;

  const trendLabel =
    ktcTrend === 'RISING'
      ? 'rising trade value'
      : ktcTrend === 'FALLING'
        ? 'declining market value'
        : 'stable value base';

  const ageDesc =
    avgAge < 25
      ? 'young core'
      : avgAge < 28
        ? 'prime-age roster'
        : avgAge < 30
          ? 'experienced core'
          : 'veteran-heavy roster';

  const tfoNote = avgTFO != null ? `, TFO avg ${Math.round(avgTFO)}` : '';
  const reasoning = `${ageDesc} (avg ${avgAge.toFixed(1)} yrs), ${trendLabel}${tfoNote}.`;

  return {
    peakStart,
    peakEnd,
    avgAge: Math.round(avgAge * 10) / 10,
    avgTFO: avgTFO != null ? Math.round(avgTFO) : null,
    ktcTrend,
    positionBreakdown,
    reasoning,
  };
}

function deriveTeamStatus(w: ContentionWindow): TeamStatus {
  if (w.peakStart <= CURRENT_YEAR && w.peakEnd >= CURRENT_YEAR) return 'CONTENDING';
  if (w.peakStart > CURRENT_YEAR + 1) return 'REBUILDING';
  return 'TRANSITIONING';
}

function selectTopBHS(players: TeamCardPlayer[]): TeamCardPlayer[] {
  const sells = players
    .filter((p) => p.bhs === 'SELL')
    .sort((a, b) => b.ktcValue - a.ktcValue);
  const buys = players
    .filter((p) => p.bhs === 'BUY')
    .sort((a, b) => (b.tfoScore ?? b.ktcValue) - (a.tfoScore ?? a.ktcValue));
  const holds = players
    .filter((p) => p.bhs === 'HOLD')
    .sort((a, b) => b.ktcValue - a.ktcValue);

  const selected: TeamCardPlayer[] = [];
  const seen = new Set<string>();
  const tryAdd = (p: TeamCardPlayer) => {
    if (!seen.has(p.player_id)) {
      seen.add(p.player_id);
      selected.push(p);
    }
  };

  if (sells[0]) tryAdd(sells[0]);
  if (buys[0]) tryAdd(buys[0]);
  if (holds[0]) tryAdd(holds[0]);

  for (const p of [...sells.slice(1), ...buys.slice(1), ...holds.slice(1)]) {
    if (selected.length >= 3) break;
    tryAdd(p);
  }

  return selected.slice(0, 3);
}

function deriveManagerTitle(
  status: TeamStatus,
  wins: number,
  losses: number,
  players: TeamCardPlayer[],
): string {
  const games = wins + losses;
  const winPct = games > 0 ? wins / games : 0.5;
  const withAge = players.filter((p) => p.age != null);
  const avgAge = withAge.length
    ? withAge.reduce((s, p) => s + p.age!, 0) / withAge.length
    : 26;
  const buyCount = players.filter((p) => p.bhs === 'BUY').length;
  const sellCount = players.filter((p) => p.bhs === 'SELL').length;

  if (status === 'CONTENDING' && winPct >= 0.6) return 'The Contender';
  if (status === 'REBUILDING' && avgAge < 25) return 'The Architect';
  if (winPct >= 0.65) return 'The Shark';
  if (buyCount > sellCount && winPct < 0.5) return 'The Gambler';
  if (sellCount > buyCount && winPct >= 0.5) return 'The Prophet';
  if (status === 'TRANSITIONING') return 'The Wildcard';
  if (winPct < 0.35) return 'The Ghost';
  return 'The Professor';
}

// ─── Route handler ────────────────────────────────────────────────────────────

type SlimPlayer = {
  full_name?: string;
  position?: string;
  team?: string;
  age?: number;
};

type TfoRow = {
  league_id: string;
  player_id: string;
  tfo_score: number | null;
  grade: string | null;
  verdict: string | null;
};

type PvRow = {
  player_id: string;
  delta: number | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: leagueRows }] = await Promise.all([
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
    supabase
      .from('leagues')
      .select('id, name, season')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ]);

  const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
  const leagues = leagueRows ?? [];
  if (!leagues.length) return NextResponse.json([], { status: 200 });

  const leagueIds = leagues.map((l) => l.id);

  const [playerDbResult, ktcValues, rosterResult, tfoResult, pvResult, dmpResult] =
    await Promise.all([
      fetchAllPlayers(),
      getKTCValues(),
      supabase
        .from('rosters')
        .select('league_id, owner_id, players, metadata, settings')
        .in('league_id', leagueIds),
      supabase
        .from('tfo_cache')
        .select('league_id, player_id, tfo_score, grade, verdict')
        .in('league_id', leagueIds),
      supabase
        .from('player_values')
        .select('player_id, delta')
        .eq('scoring_type', 'ppr'),
      supabase.from('dmp_profiles').select('league_id, title').eq('user_id', user.id),
    ]);

  const players = (playerDbResult ?? {}) as PlayerMap;
  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues ?? []) {
    if (!v.player_name) continue;
    ktcMap[v.player_name.toLowerCase()] = v.ktc_value;
  }

  const tfoByKey = new Map<string, TfoRow>();
  for (const row of (tfoResult.data ?? []) as TfoRow[]) {
    tfoByKey.set(`${row.league_id}:${row.player_id}`, row);
  }

  const pvByPlayer = new Map<string, PvRow>();
  for (const row of (pvResult.data ?? []) as PvRow[]) {
    pvByPlayer.set(row.player_id, row);
  }

  const dmpTitles = new Map<string, string>();
  for (const r of dmpResult.data ?? []) {
    if (r.league_id && r.title) dmpTitles.set(String(r.league_id), String(r.title));
  }

  const teamCards: TeamCard[] = [];

  for (const lg of leagues) {
    const rosterRows = (rosterResult.data ?? []).filter((r) => r.league_id === lg.id);
    const yours = ownerSid
      ? rosterRows.find((r) => String(r.owner_id ?? '') === ownerSid)
      : undefined;
    if (!yours) continue;

    const playerIds = (yours.players ?? []) as string[];
    const settings = (yours.settings ?? {}) as Record<string, unknown>;
    const metadata = (yours.metadata ?? {}) as Record<string, unknown>;

    const wins = Number(settings.wins ?? 0);
    const losses = Number(settings.losses ?? 0);
    const ties = Number(settings.ties ?? 0);
    const teamName = typeof metadata.team_name === 'string' ? metadata.team_name : null;

    const rosterMetrics: TeamCardPlayer[] = [];

    for (const pid of playerIds) {
      const p = players[pid as keyof typeof players] as SlimPlayer | undefined;
      if (!p) continue;
      const pos = (p.position ?? '').toUpperCase();
      if (!SKILL_POSITIONS.has(pos)) continue;

      const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
      const tfo = tfoByKey.get(`${lg.id}:${pid}`);
      const pv = pvByPlayer.get(pid);

      const verdict = tfo?.verdict ? String(tfo.verdict).trim() : null;
      const tfoScore = tfo?.tfo_score != null ? Number(tfo.tfo_score) : null;
      const bviDelta = pv?.delta != null ? Number(pv.delta) : null;
      const bhs = computeBHS(verdict, bviDelta, p.age ?? null, pos);

      rosterMetrics.push({
        player_id: pid,
        name: p.full_name ?? pid,
        position: pos,
        age: p.age ?? null,
        team: p.team ?? '—',
        tfoScore,
        tfoGrade: tfo?.grade ?? null,
        verdict,
        ktcValue: ktcVal,
        bviDelta,
        bhs,
      });
    }

    const window = computeContentionWindow(rosterMetrics);
    const status = deriveTeamStatus(window);
    const topBhsPlayers = selectTopBHS(rosterMetrics);
    const managerTitle =
      dmpTitles.get(lg.id) ?? deriveManagerTitle(status, wins, losses, rosterMetrics);

    teamCards.push({
      leagueId: lg.id,
      leagueName: lg.name ?? 'League',
      teamName,
      season: String(lg.season ?? ''),
      wins,
      losses,
      ties,
      status,
      contentionWindow: window,
      managerTitle,
      topBhsPlayers,
      totalPlayers: playerIds.length,
    });
  }

  return NextResponse.json(teamCards);
}
