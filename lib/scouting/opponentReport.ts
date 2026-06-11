/**
 * Opponent Scouting Report
 * Full pre-game-week breakdown of a matchup opponent.
 * Requires VETERAN+ tier.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';

export type ThreatLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type WeaknessLevel = 'CRITICAL' | 'NOTABLE' | 'MINOR';

export interface ScoutablePlayer {
  player_id: string;
  full_name: string;
  position: string;
  tfo_score: number | null;
  grade: string | null;
  verdict: string | null;
  threat_level: ThreatLevel;
}

export interface OpponentWeakness {
  position: string;
  description: string;
  severity: WeaknessLevel;
}

export interface OpponentStrength {
  position: string;
  description: string;
  playerName?: string;
}

export interface OpponentReport {
  opponent_roster_id: string;
  league_id: string;
  threats: ScoutablePlayer[];
  weaknesses: OpponentWeakness[];
  strengths: OpponentStrength[];
  dynasty_manager_profile: {
    title: string | null;
    trade_style: string;
    win_now_index: number;
  };
  contention_window_overlap: string;
  recommended_attack: string[];
  overall_threat: ThreatLevel;
  generated_at: string;
}

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

function threatFromTFO(score: number | null): ThreatLevel {
  if (!score) return 'LOW';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export async function generateOpponentReport(
  opponentRosterId: string,
  leagueId: string,
  viewerUserId: string,
): Promise<OpponentReport> {
  const db = createAdminClient();

  const [rosterRow, allPlayers] = await Promise.all([
    db
      .from('rosters')
      .select('players, owner_id')
      .eq('id', opponentRosterId)
      .eq('league_id', leagueId)
      .maybeSingle(),
    fetchAllPlayers(),
  ]);

  const roster = rosterRow.data as { players: string[] | null; owner_id: string | null } | null;
  const ownerSleeperUserId = roster?.owner_id ?? null;
  const playerIds = roster?.players ?? [];

  // Fetch TFO scores for opponent players
  // formula_scores has no `grade` column — derive it from tfo_score.
  const { data: tfoRows } = await db
    .from('formula_scores')
    .select('player_id, tfo_score, verdict')
    .in('player_id', playerIds.slice(0, 50));

  const tfoMap = new Map<string, { tfo_score: number; grade: string; verdict: string }>();
  for (const row of (tfoRows ?? []) as Array<{ player_id: string; tfo_score: number; verdict: string }>) {
    const s = Number(row.tfo_score) || 0;
    const grade =
      s >= 88 ? 'ELITE' : s >= 75 ? 'HIGH VALUE' : s >= 60 ? 'VIABLE' : s >= 45 ? 'SPECULATIVE' : 'AVOID';
    tfoMap.set(row.player_id, { tfo_score: s, grade, verdict: row.verdict });
  }

  // Fetch DMP for opponent
  let dmpTitle: string | null = null;
  let winNowIndex = 50;
  if (ownerSleeperUserId) {
    const { data: ownerProfile } = await db
      .from('profiles')
      .select('id')
      .eq('sleeper_user_id', ownerSleeperUserId)
      .maybeSingle();

    if (ownerProfile) {
      const { data: dmp } = await db
        .from('dmp_profiles')
        .select('title, labels')
        .eq('user_id', (ownerProfile as { id: string }).id)
        .eq('league_id', leagueId)
        .maybeSingle();

      if (dmp) {
        dmpTitle = (dmp as { title?: string | null }).title ?? null;
        winNowIndex = ((dmp as { labels?: Record<string, number> }).labels?.win_now_index ?? 50) as number;
      }
    }
  }

  // Build player list
  const players: ScoutablePlayer[] = [];
  const positionCounts: Record<string, number> = {};

  for (const pid of playerIds) {
    if (!allPlayers) break;
    const raw = allPlayers[pid] as { full_name?: string; position?: string } | undefined;
    if (!raw?.full_name || !SKILL.has((raw.position ?? '').toUpperCase())) continue;

    const pos = raw.position!.toUpperCase();
    positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;

    const tfo = tfoMap.get(pid);
    players.push({
      player_id: pid,
      full_name: raw.full_name,
      position: pos,
      tfo_score: tfo?.tfo_score ?? null,
      grade: tfo?.grade ?? null,
      verdict: tfo?.verdict ?? null,
      threat_level: threatFromTFO(tfo?.tfo_score ?? null),
    });
  }

  players.sort((a, b) => (b.tfo_score ?? 0) - (a.tfo_score ?? 0));
  const threats = players.filter((p) => p.threat_level === 'HIGH').slice(0, 5);

  // Weaknesses — positions with low depth or absent
  const weaknesses: OpponentWeakness[] = [];
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const count = positionCounts[pos] ?? 0;
    const avgTFO = players
      .filter((p) => p.position === pos)
      .reduce((s, p) => s + (p.tfo_score ?? 40), 0) / Math.max(count, 1);

    if (count === 0) {
      weaknesses.push({ position: pos, description: `No ${pos}s on roster`, severity: 'CRITICAL' });
    } else if (count <= 1 && pos !== 'QB') {
      weaknesses.push({ position: pos, description: `Thin at ${pos} — no depth`, severity: 'NOTABLE' });
    } else if (avgTFO < 45) {
      weaknesses.push({ position: pos, description: `Below-average ${pos} group (avg TFO ${Math.round(avgTFO)})`, severity: 'MINOR' });
    }
  }

  // Strengths
  const strengths: OpponentStrength[] = [];
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const best = players.filter((p) => p.position === pos).sort((a, b) => (b.tfo_score ?? 0) - (a.tfo_score ?? 0))[0];
    if (best && (best.tfo_score ?? 0) >= 70) {
      strengths.push({
        position: pos,
        description: `Elite ${pos} anchor (TFO ${best.tfo_score})`,
        playerName: best.full_name,
      });
    }
  }

  // Contention window overlap
  let contentionOverlap = 'Unknown — no blueprint data available';
  try {
    const { data: vSettings } = await db
      .from('league_settings')
      .select('contention_window_start, contention_window_end')
      .eq('league_id', leagueId)
      .eq('owner_id', viewerUserId)
      .maybeSingle();
    const s = vSettings as { contention_window_start?: number; contention_window_end?: number } | null;
    if (s?.contention_window_start) {
      contentionOverlap = winNowIndex > 60
        ? 'Both teams in contention mode — high-stakes matchup, expect them to start their best.'
        : 'You are contending; opponent may be rebuilding — exploit their depth gaps.';
    }
  } catch { /* non-fatal */ }

  // Recommended attack angles
  const recommendedAttack: string[] = [];
  for (const w of weaknesses.filter((x) => x.severity !== 'MINOR').slice(0, 3)) {
    recommendedAttack.push(`Target the opponent's ${w.position} weakness: ${w.description}`);
  }
  if (recommendedAttack.length === 0) {
    recommendedAttack.push('Opponent has no critical weaknesses — focus on your own lineup optimization.');
  }

  // Overall threat
  const highThreats = players.filter((p) => p.threat_level === 'HIGH').length;
  const overallThreat: ThreatLevel = highThreats >= 4 ? 'HIGH' : highThreats >= 2 ? 'MEDIUM' : 'LOW';

  return {
    opponent_roster_id: opponentRosterId,
    league_id: leagueId,
    threats,
    weaknesses,
    strengths,
    dynasty_manager_profile: {
      title: dmpTitle,
      trade_style: winNowIndex > 65 ? 'Win-Now' : winNowIndex < 35 ? 'Rebuild' : 'Balanced',
      win_now_index: winNowIndex,
    },
    contention_window_overlap: contentionOverlap,
    recommended_attack: recommendedAttack,
    overall_threat: overallThreat,
    generated_at: new Date().toISOString(),
  };
}
