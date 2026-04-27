'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { calculatePlayerDynastyScore } from '@/lib/values/engine';

const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

type Trend = 'rising' | 'stable' | 'declining';
const TREND_COLORS: Record<Trend, string> = {
  rising:   'bg-green-400',
  stable:   'bg-[#94A3B8]',
  declining: 'bg-red-400',
};

interface PlayerData {
  full_name: string;
  position: string;
  age: number | null;
  injury_status: string | null;
}
type PlayerMap = Record<string, PlayerData>;

interface League {
  id: string;
  name: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

interface LeagueRoster {
  leagueId: string;
  leagueName: string;
  players: string[];
}

interface PositionStats {
  position: string;
  count: number;
  avg_ktc: number;
  trends: Trend[];
  has_rising: boolean;
}

interface HeatmapCell {
  count: number;
  level: 'strong' | 'thin' | 'empty';
}

function heatmapLevel(count: number): HeatmapCell['level'] {
  if (count >= 3) return 'strong';
  if (count >= 1) return 'thin';
  return 'empty';
}
const HEATMAP_COLORS: Record<HeatmapCell['level'], string> = {
  strong: 'bg-green-500/30 text-green-300',
  thin:   'bg-amber-500/20 text-amber-400',
  empty:  'bg-red-500/15 text-red-400',
};

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#1E293B] rounded-2xl p-5 border border-white/5 space-y-2">
            <div className="h-3 w-16 shimmer rounded" />
            <div className="h-7 w-24 shimmer rounded" />
          </div>
        ))}
      </div>
      <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 space-y-3">
        <div className="h-4 w-32 shimmer rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [rosters, setRosters] = useState<LeagueRoster[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerMap>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: lgs }, ktcRes] = await Promise.all([
        supabase.from('leagues').select('id, name, total_rosters, scoring_settings'),
        fetch('/api/values'),
      ]);

      const leagueList: League[] = lgs ?? [];
      setLeagues(leagueList);

      if (ktcRes.ok) {
        const ktcData: { player_name: string; ktc_value: number }[] = await ktcRes.json();
        const map: Record<string, number> = {};
        for (const p of ktcData) map[p.player_name.toLowerCase()] = p.ktc_value;
        setKtcMap(map);
      }

      // Fetch roster for each league
      const rosterResults = await Promise.all(
        leagueList.map(async (lg) => {
          const { data } = await supabase
            .from('rosters')
            .select('players')
            .eq('league_id', lg.id)
            .limit(1)
            .single();
          return {
            leagueId: lg.id,
            leagueName: lg.name,
            players: (data?.players ?? []) as string[],
          };
        })
      );
      setRosters(rosterResults);

      // Fetch all unique player IDs
      const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players))).slice(0, 200);
      if (allIds.length) {
        const res = await fetch(`/api/players?ids=${allIds.join(',')}`);
        if (res.ok) setAllPlayers(await res.json());
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ktcFor(playerId: string): number {
    const p = allPlayers[playerId];
    if (!p) return 0;
    return ktcMap[p.full_name.toLowerCase()] ?? 0;
  }

  // ── Aggregate stats ────────────────────────────────────────────────────────
  // Deduplicate players across leagues by player_id for summary stats
  const uniquePlayerIds = Array.from(new Set(rosters.flatMap((r) => r.players)));
  const totalKTC = uniquePlayerIds.reduce((s, id) => s + ktcFor(id), 0);
  const totalPlayers = uniquePlayerIds.length;
  const avgKTC = totalPlayers ? Math.round(totalKTC / totalPlayers) : 0;

  // ── Per-position breakdown ─────────────────────────────────────────────────
  const posStats: PositionStats[] = KEY_POSITIONS.map((pos) => {
    const posPlayers = uniquePlayerIds.filter((id) => allPlayers[id]?.position === pos);
    const values = posPlayers.map((id) => ktcFor(id)).filter((v) => v > 0);
    const avg_ktc = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
    const trends: Trend[] = posPlayers
      .map((id) => {
        const p = allPlayers[id];
        const v = ktcFor(id);
        if (!p || !v) return null;
        return calculatePlayerDynastyScore(p, v).trend;
      })
      .filter((t): t is Trend => t !== null);

    return {
      position: pos,
      count: posPlayers.length,
      avg_ktc,
      trends,
      has_rising: trends.includes('rising'),
    };
  });

  // ── Concentration heatmap ──────────────────────────────────────────────────
  // Cell: how many players at each (league × position)
  const heatmap: Record<string, Record<string, HeatmapCell>> = {};
  for (const roster of rosters) {
    heatmap[roster.leagueId] = {};
    for (const pos of KEY_POSITIONS) {
      const count = roster.players.filter((id) => allPlayers[id]?.position === pos).length;
      heatmap[roster.leagueId][pos] = { count, level: heatmapLevel(count) };
    }
  }

  const topPlayers = uniquePlayerIds
    .map((id) => ({ id, ktc: ktcFor(id), player: allPlayers[id] }))
    .filter((p) => p.player && p.ktc > 0)
    .sort((a, b) => b.ktc - a.ktc)
    .slice(0, 5);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="h-8 w-48 shimmer rounded mb-2" />
          <div className="h-4 w-32 shimmer rounded" />
        </div>
        <PortfolioSkeleton />
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dynasty Portfolio</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">
          Cross-League Roster Intelligence
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total KTC', value: totalKTC.toLocaleString() },
          { label: 'Unique Players', value: totalPlayers },
          { label: 'Avg Player Value', value: avgKTC.toLocaleString() },
          { label: 'Active Leagues', value: leagues.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1E293B] rounded-2xl p-5 border border-white/5">
            <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Top assets */}
      {topPlayers.length > 0 && (
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 mb-6">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-4">Top Assets</p>
          <div className="space-y-2">
            {topPlayers.map(({ id, ktc, player }) => {
              if (!player) return null;
              const score = calculatePlayerDynastyScore(player, ktc);
              return (
                <div key={id} className="flex items-center gap-3 text-sm">
                  <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded', {
                    'bg-purple-500/20 text-purple-300': player.position === 'QB',
                    'bg-green-500/20 text-green-300': player.position === 'RB',
                    'bg-cyan-500/20 text-cyan-300': player.position === 'WR',
                    'bg-amber-500/20 text-amber-400': player.position === 'TE',
                  })}>
                    {player.position}
                  </span>
                  <span className="text-white flex-1">{player.full_name}</span>
                  {player.age && <span className="text-[#94A3B8] text-xs">{player.age}y</span>}
                  <span className="text-[#6366F1] font-semibold">{ktc.toLocaleString()}</span>
                  <span title={score.age_curve_note} className={clsx('text-xs w-3 text-center', TREND_COLORS[score.trend] === 'bg-green-400' ? 'text-green-400' : score.trend === 'declining' ? 'text-red-400' : 'text-[#94A3B8]')}>
                    {score.trend === 'rising' ? '↑' : score.trend === 'declining' ? '↓' : '→'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-position breakdown */}
      <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 mb-6">
        <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-4">Position Breakdown</p>
        <div className="space-y-4">
          {posStats.map((ps) => (
            <div key={ps.position} className="grid grid-cols-[48px_1fr_auto] gap-4 items-center">
              <span className={clsx('text-xs font-semibold px-2 py-1 rounded text-center', {
                'bg-purple-500/20 text-purple-300': ps.position === 'QB',
                'bg-green-500/20 text-green-300': ps.position === 'RB',
                'bg-cyan-500/20 text-cyan-300': ps.position === 'WR',
                'bg-amber-500/20 text-amber-400': ps.position === 'TE',
              })}>
                {ps.position}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#CBD5E1] text-sm">{ps.count} player{ps.count !== 1 ? 's' : ''}</span>
                  {ps.avg_ktc > 0 && (
                    <span className="text-[#94A3B8] text-xs">· avg {ps.avg_ktc.toLocaleString()} KTC</span>
                  )}
                  {!ps.has_rising && ps.count > 0 && (
                    <span className="text-xs text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">
                      No rising tier
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {ps.trends.map((t, i) => (
                    <span key={i} className={clsx('w-2 h-2 rounded-full inline-block', TREND_COLORS[t])} title={t} />
                  ))}
                </div>
              </div>
              <span className="text-right text-sm text-[#94A3B8] hidden sm:block">
                {ps.trends.filter((t) => t === 'rising').length}↑ {ps.trends.filter((t) => t === 'declining').length}↓
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Concentration heatmap */}
      {leagues.length > 0 && (
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-4">
            Concentration Heatmap
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-[#94A3B8] font-normal text-xs pb-3 pr-4 min-w-[140px]">League</th>
                  {KEY_POSITIONS.map((pos) => (
                    <th key={pos} className="text-center text-[#94A3B8] font-normal text-xs pb-3 px-2 w-16">{pos}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-1">
                {leagues.map((lg, i) => (
                  <tr key={lg.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                    <td className="text-[#CBD5E1] pr-4 py-2 text-xs truncate max-w-[140px]">{lg.name}</td>
                    {KEY_POSITIONS.map((pos) => {
                      const cell = heatmap[lg.id]?.[pos];
                      return (
                        <td key={pos} className="px-2 py-2 text-center">
                          <span className={clsx('inline-block w-8 h-8 rounded-lg text-xs font-semibold leading-8', cell ? HEATMAP_COLORS[cell.level] : 'bg-white/5 text-[#475569]')}>
                            {cell?.count ?? 0}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-4 text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/30 inline-block" />Strong (3+)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 inline-block" />Thin (1-2)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/15 inline-block" />Empty</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
