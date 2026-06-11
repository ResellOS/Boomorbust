import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchLeagueFull,
  fetchLeagueRosters,
  fetchLeagueUsers,
  fetchNflState,
  fetchTransactions,
  type SleeperRoster,
} from '@/lib/sleeper';
import {
  isBoomVerdict,
  isBustVerdict,
  normalizeVerdict,
  safeScore,
} from '@/lib/players/utils';
import type { LeagueIntelRow } from './types';
import { computeLeagueIntelFromTx } from './intel';
import type { LeagueDetailData, LeagueRow, StandingRow, TopPlayer } from './types';
import {
  contenderLabel,
  formatLastUpdated,
  leagueBadge,
  leagueInitials,
  minutesAgo,
  rosterConstructionLabel,
  teamGradeFromScore,
  tfoPercentile,
  winRatePct,
} from './utils';

function collectPlayerIds(row: {
  player_id?: string | null;
  player_ids?: string[] | null;
  players?: string[] | null;
}): string[] {
  const ids: string[] = [];
  if (row.player_id) ids.push(String(row.player_id));
  for (const pid of row.player_ids ?? []) if (pid) ids.push(String(pid));
  for (const pid of row.players ?? []) if (pid) ids.push(String(pid));
  return ids;
}

function scoringLabel(settings: Record<string, number> | null | undefined): string {
  const rec = settings?.rec ?? 1;
  if (rec >= 1) return 'PPR (1.0)';
  if (rec >= 0.5) return 'Half-PPR (0.5)';
  return 'Standard (0)';
}

function parseRosterPositions(positions: string[] | undefined): string {
  if (!positions?.length) return 'Standard';
  const starters = positions.filter((p) => !['BN', 'IR', 'TAXI'].includes(p));
  const counts: Record<string, number> = {};
  for (const p of starters) {
    counts[p] = (counts[p] ?? 0) + 1;
  }
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`);
  return `Start ${starters.length} (${parts.join(', ')})`;
}

export async function fetchLeagueDetail(
  leagueId: string,
  userId: string,
  sleeperUserId: string,
): Promise<LeagueDetailData | null> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[league] createAdminClient failed:', err);
    return null;
  }

  let league: LeagueRow | null = null;
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .maybeSingle();
    if (error) throw error;
    league = data as LeagueRow | null;
  } catch (err) {
    console.error('[league] league fetch failed:', err);
    return null;
  }

  if (!league) return null;

  const sleeperLeagueId = league.id;

  let allLeagues: LeagueRow[] = [];
  try {
    // leagues are keyed by the Supabase auth uid (user_id). The table has no
    // owner_id or league_type columns — selecting/filtering them errors out.
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status, total_rosters, season')
      .eq('user_id', userId);
    if (error) throw error;
    allLeagues = (data ?? []) as LeagueRow[];
  } catch (err) {
    console.error('[league] all leagues fetch failed:', err);
  }

  const [sleeperLeague, sleeperRosters, sleeperUsers, nflState] = await Promise.all([
    fetchLeagueFull(sleeperLeagueId),
    fetchLeagueRosters(sleeperLeagueId),
    fetchLeagueUsers(sleeperLeagueId),
    fetchNflState(),
  ]);

  const currentWeek = nflState?.week ?? nflState?.display_week ?? 14;
  const rosterOwnerMap = new Map<number, string>();
  const rosterPlayerMap = new Map<number, string[]>();
  let myRoster: SleeperRoster | null = null;

  for (const r of sleeperRosters ?? []) {
    if (r.owner_id) rosterOwnerMap.set(r.roster_id, r.owner_id);
    rosterPlayerMap.set(r.roster_id, r.players ?? []);
    if (r.owner_id === sleeperUserId) myRoster = r;
  }

  let myPlayerIds: string[] = [];
  try {
    const { data, error } = await supabase
      .from('rosters')
      .select('player_id, player_ids, players')
      .eq('league_id', sleeperLeagueId)
      .eq('owner_id', sleeperUserId)
      .maybeSingle();
    if (error) throw error;
    if (data) myPlayerIds = collectPlayerIds(data);
  } catch (err) {
    console.error('[league] my roster fetch failed:', err);
    myPlayerIds = myRoster?.players ?? [];
  }

  const tfoMap = new Map<string, { score: number; verdict: string | null; calculatedAt: string | null }>();
  const playerMeta = new Map<string, { full_name: string; position: string; team: string }>();

  if (myPlayerIds.length > 0) {
    try {
      const [tfoRes, playerRes] = await Promise.all([
        supabase
          .from('formula_scores')
          .select('player_id, tfo_score, verdict, calculated_at')
          .in('player_id', myPlayerIds)
          .order('calculated_at', { ascending: false }),
        supabase
          .from('players')
          .select('id, full_name, position, team')
          .in('id', myPlayerIds),
      ]);
      if (tfoRes.error) throw tfoRes.error;
      if (playerRes.error) throw playerRes.error;
      for (const row of tfoRes.data ?? []) {
        const pid = String(row.player_id);
        if (!tfoMap.has(pid)) {
          tfoMap.set(pid, {
            score: safeScore(row.tfo_score),
            verdict: row.verdict ?? null,
            calculatedAt: row.calculated_at ?? null,
          });
        }
      }
      for (const p of playerRes.data ?? []) {
        playerMeta.set(String(p.id), {
          full_name: p.full_name ?? 'Unknown',
          position: (p.position ?? '—').toUpperCase(),
          team: p.team ?? '—',
        });
      }
    } catch (err) {
      console.error('[league] tfo/players fetch failed:', err);
    }
  }

  const scores = myPlayerIds
    .map((pid) => tfoMap.get(pid)?.score ?? 0)
    .filter((s) => s > 0);
  const tfoTeamScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  let lastUpdated: string | null = null;
  tfoMap.forEach((t) => {
    if (t.calculatedAt && (!lastUpdated || t.calculatedAt > lastUpdated)) {
      lastUpdated = t.calculatedAt;
    }
  });

  const mySettings = myRoster?.settings ?? {};
  const wins = Number(mySettings.wins ?? 0);
  const losses = Number(mySettings.losses ?? 0);
  const ties = Number(mySettings.ties ?? 0);
  const pointsFor = Number(mySettings.fpts ?? mySettings.fpts_decimal ?? 0);
  const winRate = winRatePct(wins, losses, ties);
  const compositeScore = Math.round(winRate * 0.5 + tfoTeamScore * 0.5);
  const rosterLabel = rosterConstructionLabel(tfoTeamScore);

  const posScores = new Map<string, number[]>();
  for (const pid of myPlayerIds) {
    const meta = playerMeta.get(pid);
    const score = tfoMap.get(pid)?.score ?? 0;
    if (!meta || score <= 0) continue;
    const arr = posScores.get(meta.position) ?? [];
    arr.push(score);
    posScores.set(meta.position, arr);
  }

  const strengths: string[] = [];
  const needs: string[] = [];
  for (const [pos, vals] of Array.from(posScores.entries())) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > 80) strengths.push(`Elite ${pos} Core`);
    if (avg < 65) needs.push(`${pos} Depth`);
  }
  if (strengths.length === 0 && tfoTeamScore > 70) strengths.push('Balanced roster profile');
  if (needs.length === 0) needs.push('Monitor waiver wire');

  const topPlayers: TopPlayer[] = myPlayerIds
    .map((pid) => {
      const meta = playerMeta.get(pid);
      const tfo = tfoMap.get(pid);
      const score = tfo?.score ?? 0;
      if (!meta || score <= 0) return null;
      return {
        playerId: pid,
        fullName: meta.full_name,
        position: meta.position,
        team: meta.team,
        tfoScore: score,
        verdict: normalizeVerdict(tfo?.verdict, score),
      };
    })
    .filter((p): p is TopPlayer => p !== null)
    .sort((a, b) => b.tfoScore - a.tfoScore)
    .slice(0, 5);

  const playoffTeams =
    Number((sleeperLeague?.settings as Record<string, unknown>)?.playoff_teams) ?? 6;

  const standings: StandingRow[] = (sleeperRosters ?? [])
    .map((r) => {
      const s = r.settings ?? {};
      const w = Number(s.wins ?? 0);
      const l = Number(s.losses ?? 0);
      const t = Number(s.ties ?? 0);
      const pf = Number(s.fpts ?? 0);
      const user = sleeperUsers?.find((u) => u.user_id === r.owner_id);
      const handle = user?.display_name
        ? `@${user.display_name.replace(/\s+/g, '')}`
        : `@Team${r.roster_id}`;
      const projScore = w * 10 + pf / 100;
      return {
        rosterId: r.roster_id,
        ownerId: r.owner_id,
        handle,
        record: `${w}-${l}${t > 0 ? `-${t}` : ''}`,
        pointsFor: Math.round(pf * 10) / 10,
        projScore,
        isYou: r.owner_id === sleeperUserId,
      };
    })
    .sort((a, b) => b.projScore - a.projScore)
    .map((row, i) => {
      const rank = i + 1;
      const playoffOdds =
        rank <= playoffTeams
          ? Math.max(5, Math.round(100 - (rank - 1) * (60 / playoffTeams)))
          : Math.max(1, Math.round(30 - (rank - playoffTeams) * 8));
      return {
        rank,
        teamName: row.handle,
        handle: row.handle,
        record: row.record,
        pointsFor: row.pointsFor,
        projectedFinish: Math.round((rank + (rank - 1) * 0.3) * 10) / 10,
        playoffOdds,
        isYou: row.isYou,
      };
    });

  const myStanding = standings.find((s) => s.isYou);
  const projectedFinish = myStanding?.projectedFinish ?? standings.length;
  const playoffOdds = myStanding?.playoffOdds ?? 50;
  const championshipOdds = Math.round(playoffOdds * 0.3);

  let leagueIntel: LeagueIntelRow[] = [];
  try {
    const { data: cached } = await supabase
      .from('league_intel')
      .select('*')
      .eq('league_id', sleeperLeagueId)
      .gte('calculated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (cached?.length) {
      leagueIntel = cached.map((row) => ({
        managerId: row.manager_user_id as string,
        handle: `@${String(row.manager_user_id).slice(-8)}`,
        isYou: row.manager_user_id === sleeperUserId,
        liScore: row.li_score ?? 50,
        tradeTendency: row.trade_tendency ?? 'Selective',
        draftStyle: row.draft_style ?? 'Balanced',
        aggression: row.aggression ?? 'Medium',
        overpaysFor: row.overpays_for ?? '—',
      }));
      const userMap = new Map((sleeperUsers ?? []).map((u) => [u.user_id, u]));
      leagueIntel = leagueIntel.map((row) => {
        const u = userMap.get(row.managerId);
        return {
          ...row,
          handle: u?.display_name ? `@${u.display_name.replace(/\s+/g, '')}` : row.handle,
          isYou: row.managerId === sleeperUserId,
        };
      });
    } else {
      const allTx = [];
      for (let w = 1; w <= currentWeek; w++) {
        const tx = await fetchTransactions(sleeperLeagueId, w);
        if (tx?.length) allTx.push(...tx);
      }
      leagueIntel = computeLeagueIntelFromTx(
        sleeperUsers ?? [],
        rosterOwnerMap,
        allTx,
        sleeperUserId,
        currentWeek,
      );
      for (const row of leagueIntel) {
        try {
          await supabase.from('league_intel').upsert(
            {
              league_id: sleeperLeagueId,
              manager_user_id: row.managerId,
              li_score: row.liScore,
              trade_tendency: row.tradeTendency,
              draft_style: row.draftStyle,
              aggression: row.aggression,
              overpays_for: row.overpaysFor,
              calculated_at: new Date().toISOString(),
            },
            { onConflict: 'league_id,manager_user_id' },
          );
        } catch {
          // table may not exist
        }
      }
    }
  } catch (err) {
    console.error('[league] intel failed:', err);
    leagueIntel = computeLeagueIntelFromTx(
      sleeperUsers ?? [],
      rosterOwnerMap,
      [],
      sleeperUserId,
      currentWeek,
    );
  }

  const ownerByPlayer = new Map<string, string>();
  for (const r of sleeperRosters ?? []) {
    const user = sleeperUsers?.find((u) => u.user_id === r.owner_id);
    const handle = user?.display_name
      ? `@${user.display_name.replace(/\s+/g, '')}`
      : `@Team${r.roster_id}`;
    for (const pid of r.players ?? []) {
      ownerByPlayer.set(pid, handle);
    }
  }

  const allLeaguePlayerIds = new Set<string>();
  for (const r of sleeperRosters ?? []) {
    for (const pid of r.players ?? []) allLeaguePlayerIds.add(pid);
  }

  let tradeTargets: LeagueDetailData['tradeTargets'] = [];
  try {
    const candidates = Array.from(allLeaguePlayerIds).filter(
      (pid) => !myPlayerIds.includes(pid),
    );
    if (candidates.length > 0) {
      const { data: tfoData } = await supabase
        .from('formula_scores')
        .select('player_id, tfo_score')
        .in('player_id', candidates.slice(0, 200))
        .gt('tfo_score', 70)
        .order('tfo_score', { ascending: false })
        .limit(20);
      const { data: playersData } = await supabase
        .from('players')
        .select('id, full_name, position, team')
        .in('id', (tfoData ?? []).map((t) => t.player_id));

      const metaMap = new Map(
        (playersData ?? []).map((p) => [String(p.id), p]),
      );
      const lowLiOwners = new Set(
        leagueIntel.filter((m) => m.liScore < 55).map((m) => m.handle),
      );

      tradeTargets = (tfoData ?? [])
        .map((t) => {
          const pid = String(t.player_id);
          const meta = metaMap.get(pid);
          const owner = ownerByPlayer.get(pid) ?? '@Unknown';
          return {
            playerId: pid,
            fullName: meta?.full_name ?? 'Unknown',
            position: (meta?.position ?? '—').toUpperCase(),
            team: meta?.team ?? '—',
            tfoScore: safeScore(t.tfo_score),
            ownerHandle: owner,
            lowLi: lowLiOwners.has(owner),
          };
        })
        .filter((t) => t.tfoScore > 70)
        .sort((a, b) => b.tfoScore - a.tfoScore)
        .slice(0, 5)
        .map(({ lowLi: _l, ...rest }) => rest);
    }
  } catch (err) {
    console.error('[league] trade targets failed:', err);
  }

  const managerTargets = leagueIntel
    .filter((m) => !m.isYou && m.liScore < 50)
    .sort((a, b) => a.liScore - b.liScore)
    .slice(0, 3)
    .map((m) => ({
      handle: m.handle,
      note:
        m.tradeTendency === 'Passive' || m.tradeTendency === 'Rare'
          ? 'Low league activity. Open to selling.'
          : `${m.draftStyle} manager. Target via ${m.overpaysFor}.`,
      liScore: m.liScore,
    }));

  const scoring = league.scoring_settings ?? sleeperLeague?.scoring_settings ?? {};
  const settingsObj = (sleeperLeague?.settings ?? league.settings ?? {}) as Record<string, unknown>;
  const isSuperflex = (sleeperLeague?.roster_positions ?? []).includes('SUPER_FLEX');
  const teRec = scoring.te_rec ?? scoring.rec ?? 0;

  const signals: LeagueDetailData['signals'] = [
    {
      icon: '⭐',
      name: 'Scoring Format Impact',
      description: `${scoringLabel(scoring as Record<string, number>)}${isSuperflex ? ' + Superflex boosts QB value' : ''}`,
    },
    {
      icon: '🏗',
      name: 'Roster Construction',
      description:
        strengths.length > 0
          ? `Your ${strengths[0]?.toLowerCase() ?? 'core'} leads the league`
          : 'Most teams weak at TE and RB depth',
    },
    {
      icon: '💎',
      name: 'Premium Positions',
      description: isSuperflex ? 'QB, WR, Elite TE have biggest edge' : 'WR, RB, Elite TE have biggest edge',
    },
    {
      icon: '📈',
      name: 'League Trends',
      description: 'Rookie overpaying elevated in dynasty markets',
    },
    {
      icon: '📉',
      name: 'Buy Low Window',
      description: `Week ${Math.max(1, currentWeek - 2)}-${currentWeek} historically active trade window`,
    },
  ];

  const badge = leagueBadge(league.status, league.league_type);
  const totalTeams = league.total_rosters ?? sleeperLeague?.total_rosters ?? 12;

  const footerStats = {
    playersTracked: 0,
    boomPlayers: 0,
    bustPlayers: 0,
    avgDynastyRating: 0,
    lastUpdatedMinutes: minutesAgo(lastUpdated),
    leagueCount: allLeagues.length,
  };

  try {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });
    footerStats.playersTracked = count ?? 0;
  } catch {
    // ignore
  }

  try {
    const { data: allTfo } = await supabase
      .from('formula_scores')
      .select('tfo_score, verdict')
      .in('player_id', myPlayerIds.length ? myPlayerIds : ['__none__']);
    const vals = (allTfo ?? []).map((r) => safeScore(r.tfo_score)).filter((s) => s > 0);
    if (vals.length) {
      footerStats.avgDynastyRating =
        Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
    for (const r of allTfo ?? []) {
      const v = normalizeVerdict(r.verdict, safeScore(r.tfo_score));
      if (isBoomVerdict(v)) footerStats.boomPlayers += 1;
      if (isBustVerdict(v)) footerStats.bustPlayers += 1;
    }
  } catch {
    // ignore
  }

  return {
    league,
    allLeagues,
    header: {
      initials: leagueInitials(league.name),
      name: league.name,
      badge,
      subtitle: `${totalTeams} Teams · ${isSuperflex ? 'Superflex · ' : ''}${scoringLabel(scoring as Record<string, number>)} · ${league.season ?? nflState?.season ?? '2025'} Season`,
      teamGrade: teamGradeFromScore(compositeScore),
      teamGradeNumeric: compositeScore,
      tfoTeamScore,
      tfoPercentile: tfoPercentile(tfoTeamScore),
      contenderScore: compositeScore,
      contenderLabel: contenderLabel(compositeScore),
      rosterConstruction: rosterLabel.label,
      rosterConstructionPct: rosterLabel.pct,
      lastUpdated: formatLastUpdated(lastUpdated),
    },
    yourTeam: {
      tfoTeamScore,
      record: `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`,
      pointsFor: Math.round(pointsFor * 10) / 10,
      projectedFinish,
      playoffOdds,
      championshipOdds,
      strengths,
      needsAttention: needs,
      topPlayers,
    },
    leagueIntel,
    standings,
    tradeTargets,
    managerTargets,
    signals,
    settings: {
      leagueName: league.name,
      players: totalTeams,
      rosterSize: parseRosterPositions(sleeperLeague?.roster_positions),
      pointsPer: scoringLabel(scoring as Record<string, number>),
      tePremium: teRec > 1 ? `${teRec} PPR` : 'None',
      rookieDraft: `${Number(settingsObj.draft_rounds ?? 4)} Rounds`,
      tradeDeadline: `Week ${Number(settingsObj.trade_deadline ?? 14)}`,
      playoffWeeks: String(settingsObj.playoff_week_start ?? '15, 16, 17'),
      maxPf: settingsObj.max_keepers ? String(settingsObj.max_keepers) : 'None',
    },
    footer: footerStats,
  };
}
