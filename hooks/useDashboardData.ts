'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  calculateLeagueHealthScore,
  classifyAsset,
  derivePrimarySignal,
  getAssetDistribution,
  type AssetDistribution,
  type RankedPlayer,
} from '@/lib/health/leagueHealthScore';
import { getEmpirePulse } from '@/lib/berman/empirePulse';

// ── DB row shapes (mirrors Supabase schema) ──────────────────────────────────

interface LeagueRow {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
}

interface RostRow {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  settings: Record<string, number> | null;
}

interface PlayerRow {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface LeagueSummary {
  id: string;
  name: string;
  ticker: string;
  healthScore: number;
  primarySignal: 'BOOM' | 'BUST' | 'STABLE';
  empirePulse: string;
  rosterValue: number;
}

export interface SummaryStats {
  totalLeagues: number;
  activeTrades: number;
  portfolioValue: number;
}

export interface DashboardData {
  loading: boolean;
  summaryStats: SummaryStats;
  leagueList: LeagueSummary[];
  assetDistribution: AssetDistribution;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveTicker(name: string, index: number): string {
  const words = (name || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  const suffix = String(index + 1).padStart(2, '0');
  if (words.length >= 2) {
    return (words[0]![0] ?? 'L') + (words[1]![0] ?? 'G') + suffix;
  }
  return (words[0]?.slice(0, 2) ?? 'LG') + suffix;
}

function buildRankedPlayers(
  ids: string[],
  players: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
): RankedPlayer[] {
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  const byPos: Record<string, Array<{ id: string; value: number; age: number | null; name: string }>> = {};
  
  for (const id of ids) {
    const p = players[id];
    if (!p) continue;
    const pos = p.position?.toUpperCase() || 'UNKNOWN';
    if (!SKILL.has(pos)) continue;
    
    // FIX FOR CRASH
    const playerNameLower = p.full_name?.toLowerCase() ?? "";
    const val = ktcMap[playerNameLower] ?? 0;
    
    if (!byPos[pos]) byPos[pos] = [];
    byPos[pos]!.push({ id, value: val, age: p.age, name: p.full_name });
  }

  const ranked: RankedPlayer[] = [];
  for (const [pos, group] of Object.entries(byPos)) {
    group.sort((a, b) => b.value - a.value);
    for (let i = 0; i < group.length; i++) {
      const p = group[i]!;
      ranked.push({
        id: p.id,
        name: p.name,
        position: pos,
        age: p.age,
        ktcValue: p.value,
        positionRank: i + 1,
      });
    }
  }
  return ranked;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardData(): DashboardData {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [rosterByLeague, setRosterByLeague] = useState<Record<string, RostRow>>({});
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [activeTrades, setActiveTrades] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [{ data: leagueData }, profileRes] = await Promise.all([
        supabase
          .from('leagues')
          .select('id, name, season, total_rosters')
          .order('season', { ascending: false }),
        supabase.from('profiles').select('sleeper_user_id').single(),
      ]);
      if (cancelled) return;

      const leagueList = (leagueData ?? []) as LeagueRow[];
      const ownerSid = profileRes.data?.sleeper_user_id
        ? String(profileRes.data.sleeper_user_id)
        : null;
      setLeagues(leagueList);

      const rosterMap: Record<string, RostRow> = {};
      await Promise.all(
        leagueList.map(async (lg) => {
          const { data: rows } = ownerSid
            ? await supabase.from('rosters').select('*').eq('league_id', lg.id).eq('owner_id', ownerSid)
            : await supabase.from('rosters').select('*').eq('league_id', lg.id).limit(1);
          if (rows?.length) {
            const yours = ownerSid
              ? (rows.find((r) => String((r as RostRow).owner_id) === ownerSid) ?? rows[0])
              : rows[0];
            rosterMap[lg.id] = yours as RostRow;
          }
        }),
      );
      if (cancelled) return;
      setRosterByLeague(rosterMap);

      const valsRes = await fetch('/api/values');
      const kLower: Record<string, number> = {};
      if (valsRes.ok) {
        const arr: { player_name: string; ktc_value: number }[] = await valsRes.json();
        // FIX FOR POTENTIAL NULL NAMES
        for (const row of arr) {
            if (row.player_name) kLower[row.player_name.toLowerCase()] = row.ktc_value;
        }
      }
      if (cancelled) return;
      setKtcMap(kLower);

      const allIds = Array.from(
        new Set(Object.values(rosterMap).flatMap((r) => r.players ?? [])),
      ).slice(0, 280);
      let pmap: Record<string, PlayerRow> = {};
      if (allIds.length) {
        const pRes = await fetch(`/api/players?ids=${encodeURIComponent(allIds.join(','))}`);
        if (pRes.ok) pmap = await pRes.json();
      }
      if (cancelled) return;
      setPlayers(pmap);

      let tradeCount = 0;
      const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      await Promise.all(
        leagueList.slice(0, 10).map(async (lg) => {
          try {
            const res = await fetch(`https://api.sleeper.app/v1/league/${lg.id}/transactions/1`);
            if (!res.ok) return;
            const txns: Array<{ type: string; status: string; created: number }> = await res.json();
            tradeCount += txns.filter(
              (t) => t.type === 'trade' && (t.status === 'pending' || t.created > recentCutoff),
            ).length;
          } catch { /* best-effort */ }
        }),
      );
      if (!cancelled) {
        setActiveTrades(tradeCount);
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  return useMemo<DashboardData>(() => {
    if (loading) {
      return {
        loading: true,
        summaryStats: { totalLeagues: 0, activeTrades: 0, portfolioValue: 0 },
        leagueList: [],
        assetDistribution: { diamonds: 0, gems: 0, starters: 0, nukes: 0 },
      };
    }

    const allIds = Array.from(
      new Set(Object.values(rosterByLeague).flatMap((r) => r?.players ?? [])),
    );
    const globalRanked = buildRankedPlayers(allIds, players, ktcMap);
    const globalRankIndex = new Map(globalRanked.map((r) => [r.id, r.positionRank]));

    let calculatedPortfolioValue = 0;

    const leagueList: LeagueSummary[] = leagues.map((lg, i) => {
      const r = rosterByLeague[lg.id];
      const ids = r?.players ?? [];

      const leagueRanked = buildRankedPlayers(ids, players, ktcMap).map((rp) => ({
        ...rp,
        positionRank: globalRankIndex.get(rp.id) ?? rp.positionRank,
      }));

      const healthScore = calculateLeagueHealthScore({
        rankedPlayers: leagueRanked,
        extra1stRoundPicks: 0,
      });

      // FIX FOR LINE 261 AREA CRASH
      const rosterValue = ids.reduce((sum, id) => {
        const p = players[id];
        const playerNameLower = p?.full_name?.toLowerCase() ?? null;
        const playerVal = playerNameLower ? (ktcMap[playerNameLower] ?? 0) : 0;
        return sum + playerVal;
      }, 0);
      
      calculatedPortfolioValue += rosterValue;

      return {
        id: lg.id,
        name: lg.name ?? 'Unknown League',
        ticker: deriveTicker(lg.name ?? 'LG', i),
        healthScore,
        primarySignal: derivePrimarySignal(healthScore),
        empirePulse: getEmpirePulse(healthScore),
        rosterValue,
      };
    });

    const uniqueRanked = Array.from(
      new Map(globalRanked.map((r) => [r.id, r])).values(),
    );
    const assetDistribution = getAssetDistribution(uniqueRanked);

    return {
      loading: false,
      summaryStats: {
        totalLeagues: leagues.length,
        activeTrades,
        portfolioValue: calculatedPortfolioValue,
      },
      leagueList,
      assetDistribution,
    };
  }, [loading, leagues, rosterByLeague, players, ktcMap, activeTrades]);
}