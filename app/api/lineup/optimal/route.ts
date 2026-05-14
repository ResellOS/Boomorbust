import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchLeagueRosters, fetchNflState } from '@/lib/sleeper';
import type { OptimalLineupData, PlayerRow, WeatherAlert, BorderlinePlayer, MatchupMatrixRow, WeatherIcon, WeatherOutlook } from '@/components/lineup/types';
import type { LineupOptimizeResponse, LineupOptimizePlayerRow } from '@/app/api/lineup/optimize/route';

const POSITION_PRIORITY: Record<string, number> = {
  QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5, DST: 5,
};

function ssasRankFromGrade(grade: number): number {
  return Math.max(1, Math.min(32, Math.round((grade / 100) * 32)));
}

function mapVerdict(startScore: number): PlayerRow['verdict'] {
  if (startScore >= 75) return 'BOOM';
  if (startScore >= 55) return 'HOLD';
  if (startScore >= 35) return 'SIT';
  return 'BUST';
}

function positionAvgPts(pos: string): number {
  switch (pos.toUpperCase()) {
    case 'QB': return 18;
    case 'RB': return 12;
    case 'WR': return 11;
    case 'TE': return 8;
    case 'K': return 8;
    default: return 8;
  }
}

function treEdge(projPts: number, pos: string): number {
  return Math.round((projPts - positionAvgPts(pos)) * 10) / 10;
}

function weatherIconType(condition: string): WeatherIcon {
  const c = condition.toLowerCase();
  if (c.includes('snow') || c.includes('sleet')) return 'SNOW';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'RAIN';
  if (c.includes('wind')) return 'WIND';
  if (c.includes('dome') || c.includes('indoor')) return 'DOME';
  return 'CLEAR';
}

function deriveWeatherImpact(condition: string, _position: string): string {
  const icon = weatherIconType(condition);
  if (icon === 'RAIN') return 'Passing Game';
  if (icon === 'SNOW') return 'Offense';
  if (icon === 'WIND') return 'Kicking Game';
  return 'Minimal Impact';
}

function assignSlots(starters: LineupOptimizePlayerRow[]): string[] {
  const counts: Record<string, number> = {};
  return starters.map((p) => {
    const pos = p.position.toUpperCase() === 'DST' ? 'DST' : p.position.toUpperCase();
    counts[pos] = (counts[pos] ?? 0) + 1;

    if (pos === 'QB') return 'QB';
    if (pos === 'RB') return counts['RB'] <= 2 ? 'RB' : 'FLEX';
    if (pos === 'WR') return counts['WR'] <= 2 ? 'WR' : 'FLEX';
    if (pos === 'TE') return counts['TE'] === 1 ? 'TE' : 'FLEX';
    if (pos === 'K') return 'K';
    if (pos === 'DEF' || pos === 'DST') return 'DST';
    return 'FLEX';
  });
}

function buildMatchupLabel(player: LineupOptimizePlayerRow): { matchupLabel: string; ssasTeam: string } {
  const opp = player.opponent && player.opponent !== '—' ? player.opponent : 'TBD';
  return {
    matchupLabel: `${player.team} vs ${opp}`,
    ssasTeam: opp,
  };
}

function toPlayerRow(p: LineupOptimizePlayerRow, slot: string): PlayerRow {
  const { matchupLabel, ssasTeam } = buildMatchupLabel(p);
  const ssasRank = ssasRankFromGrade(p.matchupGrade);
  const midPts = Math.round(((p.projectedPoints.low + p.projectedPoints.high) / 2) * 10) / 10;
  const edge = treEdge(midPts, p.position);
  return {
    slot,
    playerId: p.playerId,
    name: p.playerName,
    position: p.position,
    team: p.team,
    matchupLabel,
    ssasTeam,
    ssasRank,
    ssasGrade: p.matchupGrade,
    verdict: mapVerdict(p.startScore),
    projectedPoints: midPts,
    treEdge: edge,
    reasoning: p.reasoning,
    weather: p.weather,
  };
}

function buildWeatherAlerts(players: LineupOptimizePlayerRow[]): WeatherAlert[] {
  const seen = new Set<string>();
  const alerts: WeatherAlert[] = [];

  for (const p of players) {
    const opp = p.opponent && p.opponent !== '—' ? p.opponent : null;
    if (!opp) continue;
    const gameKey = [p.team, opp].sort().join('|');
    if (seen.has(gameKey)) continue;
    if (p.weather.score >= 90) continue; // skip ideal weather
    seen.add(gameKey);

    const icon = weatherIconType(p.weather.condition);
    const windStr = p.weather.condition.toLowerCase().includes('wind')
      ? ` / Winds: ${Math.round(10 + (100 - p.weather.score) * 0.3)} mph`
      : '';

    alerts.push({
      game: `${p.team} @ ${opp}`,
      stadium: `${opp} Stadium`,
      icon,
      conditions: `${p.weather.condition}${windStr} / ${p.weather.temp}°F`,
      impact: deriveWeatherImpact(p.weather.condition, p.position),
    });

    if (alerts.length >= 4) break;
  }
  return alerts;
}

function overallWeatherOutlook(players: LineupOptimizePlayerRow[]): WeatherOutlook {
  if (!players.length) return 'GOOD';
  const avg = players.reduce((s, p) => s + p.weather.score, 0) / players.length;
  if (avg >= 85) return 'GOOD';
  const icons = players.map((p) => weatherIconType(p.weather.condition));
  if (icons.some((i) => i === 'RAIN')) return 'RAIN';
  if (icons.some((i) => i === 'SNOW')) return 'SNOW';
  if (icons.some((i) => i === 'WIND')) return 'WIND';
  return 'MIXED';
}

function buildMatchupMatrix(
  players: LineupOptimizePlayerRow[],
): { easiest: MatchupMatrixRow[]; toughest: MatchupMatrixRow[] } {
  const seen = new Map<string, number>();
  for (const p of players) {
    const opp = p.opponent && p.opponent !== '—' ? p.opponent : null;
    if (!opp) continue;
    const existing = seen.get(opp);
    if (existing === undefined || p.matchupGrade > existing) {
      seen.set(opp, p.matchupGrade);
    }
  }

  const entries = Array.from(seen.entries()).map(([team, grade]) => ({
    team,
    grade,
    ssasRank: ssasRankFromGrade(grade),
  }));

  const sorted = [...entries].sort((a, b) => b.grade - a.grade);
  const easiest = sorted.slice(0, 5).map((e, i) => ({ rank: i + 1, team: e.team, ssasRank: e.ssasRank, grade: e.grade, isEasy: true }));
  const toughest = sorted.slice(-5).reverse().map((e, i) => ({ rank: sorted.length - i, team: e.team, ssasRank: e.ssasRank, grade: e.grade, isEasy: false }));

  return { easiest, toughest };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const weekParam = searchParams.get('week');

  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 });

  // Resolve current week if not supplied
  let week = weekParam ? parseInt(weekParam, 10) : 1;
  try {
    const nflState = await fetchNflState();
    if (nflState && !weekParam) week = nflState.week ?? 1;
  } catch { /* use default */ }

  // Resolve user's sleeper_user_id
  const { data: prof } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;
  if (!sleeperUserId) {
    return NextResponse.json({ error: 'Link your Sleeper account in settings' }, { status: 403 });
  }

  // Find the user's roster in this league
  const rosters = await fetchLeagueRosters(leagueId);
  const myRoster = rosters?.find((r) => r.owner_id === sleeperUserId);
  if (!myRoster) {
    return NextResponse.json({ error: 'Roster not found in this league' }, { status: 404 });
  }

  // Delegate to existing optimize POST endpoint
  const origin = new URL(request.url).origin;
  const optimizeRes = await fetch(`${origin}/api/lineup/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ leagueId, rosterId: myRoster.roster_id, week }),
  });

  if (!optimizeRes.ok) {
    const err = (await optimizeRes.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(err, { status: optimizeRes.status });
  }

  const optimizeData: LineupOptimizeResponse = await optimizeRes.json();
  const allPlayers = optimizeData.players ?? [];

  // Split starters vs bench using the Sleeper roster.starters set
  const starterIds = new Set((myRoster.starters ?? []).filter(Boolean));

  const starterPlayers = allPlayers
    .filter((p) => starterIds.has(p.playerId))
    .sort((a, b) => (POSITION_PRIORITY[a.position] ?? 9) - (POSITION_PRIORITY[b.position] ?? 9));

  const benchPlayers = allPlayers
    .filter((p) => !starterIds.has(p.playerId))
    .sort((a, b) => b.startScore - a.startScore);

  const starterSlots = assignSlots(starterPlayers);
  const starters: PlayerRow[] = starterPlayers.map((p, i) => toPlayerRow(p, starterSlots[i]));
  const bench: PlayerRow[] = benchPlayers.map((p) => toPlayerRow(p, p.position));

  // Totals
  const totalProjected = Math.round(starters.reduce((s, p) => s + p.projectedPoints, 0) * 10) / 10;
  const totalTreEdge = Math.round(starters.reduce((s, p) => s + p.treEdge, 0) * 10) / 10;

  // Lineup confidence from gaugePct
  const lineupConfidence = Math.round(optimizeData.gaugePct ?? 70);

  // Approximate win-loss from projectedStarterPoints vs league average proxy
  const wins = Math.round(lineupConfidence / 12);
  const losses = 14 - Math.floor(lineupConfidence / 8);
  const optimalRecord = `${Math.max(0, wins)}-${Math.max(0, Math.min(14 - wins, losses))}`;

  // Weather
  const weatherAlerts = buildWeatherAlerts(allPlayers);
  const weatherOutlook = overallWeatherOutlook(allPlayers);

  // Borderline players (FLEX/SIT verdict = start score 30-65)
  const borderline: BorderlinePlayer[] = allPlayers
    .filter((p) => p.startScore >= 30 && p.startScore < 65)
    .slice(0, 6)
    .map((p) => {
      const { ssasTeam } = buildMatchupLabel(p);
      return {
        playerId: p.playerId,
        name: p.playerName,
        position: p.position,
        team: p.team,
        opponent: p.opponent,
        ssasTeam,
        ssasRank: ssasRankFromGrade(p.matchupGrade),
        verdict: mapVerdict(p.startScore),
        reasoning: p.reasoning,
      };
    });

  // Matchup matrix
  const matchupMatrix = buildMatchupMatrix(allPlayers);

  // Boom/bust breakdown
  const breakdown = {
    starterBoom: starters.filter((p) => p.verdict === 'BOOM' || p.verdict === 'START').length,
    starterHold: starters.filter((p) => p.verdict === 'HOLD' || p.verdict === 'FLEX').length,
    starterBust: starters.filter((p) => p.verdict === 'SIT' || p.verdict === 'BUST').length,
    benchBoom: bench.filter((p) => p.verdict === 'BOOM' || p.verdict === 'START').length,
    benchHold: bench.filter((p) => p.verdict === 'HOLD' || p.verdict === 'FLEX').length,
    benchBust: bench.filter((p) => p.verdict === 'SIT' || p.verdict === 'BUST').length,
    starterTotal: starters.length,
    benchTotal: bench.length,
  };

  const response: OptimalLineupData = {
    starters,
    bench,
    totalProjected,
    totalTreEdge,
    lineupConfidence,
    optimalRecord,
    week,
    season: optimizeData.meta?.season ?? String(new Date().getFullYear()),
    weatherOutlook,
    weatherAlerts,
    borderline,
    matchupMatrix,
    breakdown,
  };

  return NextResponse.json(response);
}
