'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import SparklineGraph from '@/components/SparklineGraph';
import OpenInSleeper from '@/components/OpenInSleeper';
import DynastyThreeYearSection from '@/components/portfolio/DynastyThreeYearSection';
import type { SleeperPlayerLite } from '@/lib/portfolio/dynastyThreeYear';
import { nflLogoUrl } from '@/lib/nfl/teamLogo';
import { calculatePlayerDynastyScore } from '@/lib/values/engine';

const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
const SNAPSHOT_KEY = 'bb_portfolio_value_hist_v1';

/** Rough dynasty portfolio share by position (for heatmap depth). */
const EXPECTED_SHARE: Record<(typeof KEY_POSITIONS)[number], number> = {
  QB: 0.09,
  RB: 0.34,
  WR: 0.44,
  TE: 0.13,
};

type Pos = (typeof KEY_POSITIONS)[number];

interface LeagueRow {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

interface RostRow {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: Record<string, number> | null;
}

interface PlayerRow {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

type HeatLevel = 'strong' | 'thin' | 'weak';

function ktcLetter(avg: number): string {
  if (!avg || Number.isNaN(avg)) return '—';
  if (avg >= 4800) return 'A';
  if (avg >= 3800) return 'B';
  if (avg >= 2900) return 'C';
  if (avg >= 1900) return 'D';
  return 'F';
}

function letterStyles(letter: string): string {
  if (letter === 'A') return 'text-[var(--gold)] border-[var(--gold)]/35 bg-[var(--gold)]/10';
  if (letter === 'B' || letter === 'C') return 'text-[var(--indigo-light)] border-[var(--indigo)]/30 bg-[var(--indigo)]/12';
  if (letter === 'D') return 'text-[var(--cyan)] border-[var(--cyan)]/25 bg-[var(--cyan)]/10';
  return 'text-[var(--text-muted)] border-[var(--border)] bg-white/[0.03]';
}

function normPos(p: string) {
  const u = (p ?? '').toUpperCase();
  if (u === 'DST') return 'DEF';
  return u as Pos | string;
}

function ktFor(pid: string, pmap: Record<string, PlayerRow>, kmap: Record<string, number>, bb: Record<string, number>): number {
  const p = pmap[pid];
  if (!p) return 0;
  const k = kmap[p.full_name.toLowerCase()] ?? 0;
  const b = bb[pid];
  return typeof b === 'number' && b > 0 ? b : k;
}

function heatLevelFor(
  pos: Pos,
  count: number,
  ktcSum: number,
  portfolioKtc: number,
  numLeagues: number
): HeatLevel {
  const share = portfolioKtc > 0 ? ktcSum / portfolioKtc : 0;
  const exp = EXPECTED_SHARE[pos];
  const minBodies = Math.max(1, Math.ceil(numLeagues * (pos === 'QB' ? 1.2 : pos === 'TE' ? 2 : pos === 'RB' ? 4 : 4.5)));
  if (count < numLeagues || share < exp * 0.45) return 'weak';
  if (count >= minBodies && share >= exp * 0.78) return 'strong';
  return 'thin';
}

const HEAT_STYLES: Record<HeatLevel, string> = {
  strong: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  thin: 'bg-amber-500/20 text-amber-200 border-amber-500/35',
  weak: 'bg-red-500/15 text-red-300 border-red-400/35',
};

type SortKey = 'player' | 'pos' | 'value' | 'age';

interface HistEntry {
  t: number;
  totalKtc: number;
  totalBbvWeighted?: number;
}

function readHist(): HistEntry[] {
  try {
    const raw = globalThis.localStorage?.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((row) =>
        typeof row === 'object' &&
        row !== null &&
        't' in row &&
        'totalKtc' in row &&
        typeof (row as HistEntry).t === 'number' &&
        typeof (row as HistEntry).totalKtc === 'number'
          ? (row as HistEntry)
          : null
      )
      .filter((x): x is HistEntry => x !== null)
      .slice(-16);
  } catch {
    return [];
  }
}

function persistHist(entries: HistEntry[]) {
  try {
    globalThis.localStorage?.setItem(SNAPSHOT_KEY, JSON.stringify(entries.slice(-16)));
  } catch {
    /* noop */
  }
}

function escapeCsv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [rosterByLeague, setRosterByLeague] = useState<Record<string, RostRow>>({});
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [bbvMap, setBbvMap] = useState<Record<string, number>>({});
  const [spark, setSpark] = useState<number[]>([]);
  const [weekWins, setWeekWins] = useState<{ got: number; total: number }>({ got: 0, total: 0 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortByLeague, setSortByLeague] = useState<Record<string, { key: SortKey; asc: boolean }>>({});

  const nflWeek = useMemo(() => {
    const d = new Date();
    const s = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - s.getTime();
    return Math.min(18, Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)) % 18 || 9));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      setLoading(true);
      try {
        await fetch('/api/sync', { method: 'POST' });
      } catch {
        /* best-effort */
      }
      if (cancelled) return;

      const [{ data: leagueData }, profileRes] = await Promise.all([
        supabase.from('leagues').select('id, name, season, total_rosters, scoring_settings').order('season', { ascending: false }),
        supabase.from('profiles').select('sleeper_user_id').single(),
      ]);

      if (cancelled) return;

      const leagueList = (leagueData ?? []) as LeagueRow[];
      const ownerSid = profileRes.data?.sleeper_user_id ? String(profileRes.data.sleeper_user_id) : null;
      setLeagues(leagueList);

      const rosterMap: Record<string, RostRow> = {};
      await Promise.all(
        leagueList.map(async (lg) => {
          const { data: rows } = ownerSid
            ? await supabase.from('rosters').select('*').eq('league_id', lg.id).eq('owner_id', ownerSid)
            : await supabase.from('rosters').select('*').eq('league_id', lg.id).limit(1);
          if (rows?.length) {
            const yours = ownerSid ? rows.find((row) => String((row as RostRow).owner_id) === ownerSid) ?? rows[0] : rows[0];
            rosterMap[lg.id] = yours as RostRow;
          }
        })
      );
      if (cancelled) return;
      setRosterByLeague(rosterMap);

      const valsRes = await fetch('/api/values');
      const kLower: Record<string, number> = {};
      if (valsRes.ok) {
        const arr: { player_name: string; ktc_value: number }[] = await valsRes.json();
        for (const row of arr) kLower[row.player_name.toLowerCase()] = row.ktc_value;
      }
      if (cancelled) return;
      setKtcMap(kLower);

      const allIds = Array.from(new Set(Object.values(rosterMap).flatMap((r) => r.players ?? []))).slice(0, 280);
      let pmap: Record<string, PlayerRow> = {};
      let bbLocal: Record<string, number> = {};
      if (allIds.length) {
        const [pRes, bbvRes] = await Promise.all([
          fetch(`/api/players?ids=${encodeURIComponent(allIds.join(','))}`),
          fetch(`/api/bbv?ids=${encodeURIComponent(allIds.join(','))}`).catch(() => null),
        ]);
        pmap = pRes.ok ? await pRes.json() : {};
        bbLocal = bbvRes?.ok ? await bbvRes.json() : {};
      }
      if (cancelled) return;
      setPlayers(pmap);
      setBbvMap(bbLocal);

      /* Week wins */
      let win = 0;
      let tot = 0;
      const wk = Math.min(18, nflWeek);
      for (const lg of leagueList) {
        const r = rosterMap[lg.id];
        if (!r?.roster_id) continue;
        try {
          const res = await fetch(`https://api.sleeper.app/v1/league/${lg.id}/matchups/${wk}`);
          if (!res.ok) continue;
          const arr = (await res.json()) as Array<{ roster_id?: number; points?: number; matchup_id?: number }>;
          const row = arr.find((x) => x.roster_id === r.roster_id);
          if (!row || row.points === undefined) continue;
          const opp = arr.find((x) => x.matchup_id === row.matchup_id && x.roster_id !== r.roster_id);
          if (opp?.points === undefined) continue;
          tot++;
          if (row.points > opp.points) win++;
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setWeekWins({ got: win, total: tot });
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [nflWeek]);

  const aggregates = useMemo(() => {
    let totalPortfolioKtc = 0;
    let pureKtcOnly = 0;
    let totalBbvListed = 0;
    let bbvPieces = 0;

    type Hold = {
      leagues: Set<string>;
      combinedKtc: number;
      name: string;
      position: string;
    };
    const holdingMap = new Map<string, Hold>();

    const posCount: Record<Pos, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
    const posKtc: Record<Pos, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };

    for (const lg of leagues) {
      const r = rosterByLeague[lg.id];
      const ids = r?.players ?? [];
      for (const pid of ids) {
        const p = players[pid];
        const kt = ktFor(pid, players, ktcMap, bbvMap);
        const rawB = bbvMap[pid];
        totalPortfolioKtc += kt;
        if (p?.full_name) pureKtcOnly += ktcMap[p.full_name.toLowerCase()] ?? 0;
        if (typeof rawB === 'number' && rawB > 0) {
          totalBbvListed += rawB;
          bbvPieces++;
        }

        if (p) {
          const pos = normPos(p.position);
          if (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') {
            posCount[pos]++;
            posKtc[pos] += kt;
          }

          let h = holdingMap.get(pid);
          if (!h) {
            h = { leagues: new Set(), combinedKtc: 0, name: p.full_name, position: p.position };
            holdingMap.set(pid, h);
          }
          h.leagues.add(lg.id);
          h.combinedKtc += kt;
        }
      }
    }

    const topHoldings = Array.from(holdingMap.entries())
      .map(([id, h]) => ({
        id,
        name: h.name,
        position: h.position,
        leagueCount: h.leagues.size,
        combinedKtc: h.combinedKtc,
      }))
      .filter((x) => x.combinedKtc > 0)
      .sort((a, b) => b.combinedKtc - a.combinedKtc)
      .slice(0, 5);

    const posShareKtc: Record<Pos, number> = { ...posKtc };
    const denom = totalPortfolioKtc > 0 ? totalPortfolioKtc : 1;
    for (const pos of KEY_POSITIONS) posShareKtc[pos] = posKtc[pos] / denom;

    let maxPos: Pos = 'RB';
    let maxShare = 0;
    for (const pos of KEY_POSITIONS) {
      if (posShareKtc[pos] > maxShare) {
        maxShare = posShareKtc[pos];
        maxPos = pos;
      }
    }

    const uniqueIds = Array.from(new Set(Object.values(rosterByLeague).flatMap((r) => r.players ?? [])));
    let scoreNum = 0;
    let scoreDen = 0;
    for (const id of uniqueIds) {
      const kt = ktFor(id, players, ktcMap, bbvMap);
      const row = players[id];
      if (row && kt > 0) {
        scoreNum += calculatePlayerDynastyScore(row, kt).value;
        scoreDen += 1;
      }
    }
    const avgDyn = scoreDen ? scoreNum / scoreDen : 0;
    const portfolioLetter = ktcLetter(avgDyn);

    const leagueHealth = { contenders: 0, rebuilders: 0, middling: 0 };
    for (const lg of leagues) {
      const r = rosterByLeague[lg.id];
      const ids = r?.players ?? [];
      let sum = 0;
      let n = 0;
      for (const id of ids) {
        const v = ktFor(id, players, ktcMap, bbvMap);
        if (v > 0) {
          sum += v;
          n += 1;
        }
      }
      const avg = n ? sum / n : 0;
      if (avg >= 3700) leagueHealth.contenders++;
      else if (avg < 2600 && n > 0) leagueHealth.rebuilders++;
      else if (n > 0) leagueHealth.middling++;
    }

    return {
      /** Sum of canonical KTC (catalog), all roster appearances */
      headlineKtc: pureKtcOnly,
      /** Blended KT/BB used for internals */
      blendedKtcSum: totalPortfolioKtc,
      totalBbvSum: totalBbvListed,
      hasBbv: bbvPieces > 0,
      topHoldings,
      posCount,
      posKtc,
      concentration: maxShare > 0.35 ? { pos: maxPos, pct: Math.round(maxShare * 100) } : null,
      portfolioLetter,
      leagueHealth,
    };
  }, [leagues, rosterByLeague, players, ktcMap, bbvMap]);

  useEffect(() => {
    if (loading) return;
    const total = aggregates.headlineKtc;
    if (!total) {
      setSpark([]);
      return;
    }
    const hist = readHist();
    const now = Date.now();
    const last = hist[hist.length - 1];
    const rounded = Math.round(total);
    if (!last || Math.round(last.totalKtc) !== rounded) {
      hist.push({ t: now, totalKtc: total, totalBbvWeighted: aggregates.totalBbvSum });
      persistHist(hist);
    }
    const trimmed = hist.slice(-8).map((h) => h.totalKtc);
    setSpark(trimmed.length >= 2 ? trimmed : trimmed.length === 1 ? [trimmed[0]!, trimmed[0]!] : [total, total]);
  }, [loading, aggregates.headlineKtc, aggregates.totalBbvSum]);

  const weekChange = (() => {
    const h = readHist();
    if (h.length < 2) return null;
    const a = h[h.length - 2]!.totalKtc;
    const b = h[h.length - 1]!.totalKtc;
    if (!a) return null;
    return ((b - a) / a) * 100;
  })();

  /** Distinct skill players across all synced leagues for 3-year TFO window. */
  const dynastyRosterPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lg of leagues) {
      for (const pid of rosterByLeague[lg.id]?.players ?? []) {
        const p = players[pid];
        if (!p) continue;
        const pos = normPos(p.position);
        if (pos === 'QB' || pos === 'RB' || pos === 'WR' || pos === 'TE') ids.add(pid);
      }
    }
    return Array.from(ids);
  }, [leagues, rosterByLeague, players]);

  const playersLiteById = useMemo(() => players as Record<string, SleeperPlayerLite>, [players]);

  const heatCells = useMemo(() => {
    const nl = Math.max(1, leagues.length);
    const pk = aggregates.blendedKtcSum;
    const out = {} as Record<Pos, { count: number; ktc: number; level: HeatLevel; addDepth: boolean }>;
    for (const pos of KEY_POSITIONS) {
      const count = aggregates.posCount[pos];
      const ktcSum = aggregates.posKtc[pos];
      const level = heatLevelFor(pos, count, ktcSum, pk, nl);
      out[pos] = { count, ktc: ktcSum, level, addDepth: level === 'weak' };
    }
    return out;
  }, [aggregates.posCount, aggregates.posKtc, aggregates.blendedKtcSum, leagues.length]);

  const alerts = useMemo(() => {
    const out: Array<{ tone: 'red' | 'purple' | 'cyan'; text: string }> = [];

    let rbStarterOld = 0;
    for (const lg of leagues) {
      const starters = rosterByLeague[lg.id]?.starters ?? [];
      for (const sid of starters) {
        const p = players[sid];
        if (!p) continue;
        if ((normPos(p.position) as string) === 'RB' && typeof p.age === 'number' && p.age >= 28) rbStarterOld++;
      }
    }
    if (rbStarterOld >= 3) {
      out.push({
        tone: 'red',
        text: `Portfolio Risk — ${rbStarterOld} of your starting RB spots are rostered by players 28+ years old.`,
      });
    }

    let thinWrLeagues = 0;
    for (const lg of leagues) {
      const ids = rosterByLeague[lg.id]?.players ?? [];
      const wr = ids.filter((id) => normPos(players[id]?.position ?? '') === 'WR').length;
      if (wr < 3 && ids.length > 5) thinWrLeagues++;
    }
    if (thinWrLeagues >= 5) {
      out.push({
        tone: 'purple',
        text: `Opportunity — You're thin at WR in ${thinWrLeagues} leagues. Trade RB depth?`,
      });
    }

    const ktcOnly = (pid: string) => {
      const p = players[pid];
      if (!p) return 0;
      return ktcMap[p.full_name.toLowerCase()] ?? 0;
    };
    const valueLeagueCount = new Map<string, { name: string; n: number }>();
    for (const lg of leagues) {
      for (const pid of rosterByLeague[lg.id]?.players ?? []) {
        const k = ktcOnly(pid);
        const b = bbvMap[pid];
        if (!k || typeof b !== 'number' || b <= 0) continue;
        if (b >= k * 1.15) {
          const p = players[pid];
          if (!p) continue;
          const cur = valueLeagueCount.get(pid) ?? { name: p.full_name, n: 0 };
          cur.n += 1;
          valueLeagueCount.set(pid, cur);
        }
      }
    }
    const valPick = Array.from(valueLeagueCount.values()).find((v) => v.n >= 2);
    if (valPick) {
      out.push({
        tone: 'cyan',
        text: `Value Play — ${valPick.name} shows ≥15% BBV premium vs KTC market in ${valPick.n} leagues.`,
      });
    }

    return out;
  }, [leagues, rosterByLeague, players, ktcMap, bbvMap]);

  const leagueSummaries = useMemo(() => {
    return leagues.map((lg) => {
      const r = rosterByLeague[lg.id];
      const ids = r?.players ?? [];
      let sum = 0;
      let n = 0;
      for (const id of ids) {
        const v = ktFor(id, players, ktcMap, bbvMap);
        if (v > 0) {
          sum += v;
          n += 1;
        }
      }
      const avg = n ? sum / n : 0;
      const letter = ktcLetter(avg);
      const rs = r?.settings ?? undefined;
      const wins = rs && typeof rs.wins === 'number' ? rs.wins : 0;
      const losses = rs && typeof rs.losses === 'number' ? rs.losses : 0;
      const rosterValue = ids.reduce((s, id) => s + ktFor(id, players, ktcMap, bbvMap), 0);
      return {
        league: lg,
        letter,
        record: `${wins}-${losses}`,
        logoUrl: nflLogoUrl(lg.id),
        rosterValue,
        rosterIds: ids,
      };
    });
  }, [leagues, rosterByLeague, players, ktcMap, bbvMap]);

  const getSort = useCallback(
    (leagueId: string) => sortByLeague[leagueId] ?? { key: 'value' as SortKey, asc: false },
    [sortByLeague]
  );

  const setSort = useCallback((leagueId: string, key: SortKey) => {
    setSortByLeague((prev) => {
      const cur = prev[leagueId] ?? { key: 'value', asc: false };
      const asc = cur.key === key ? !cur.asc : key === 'player' || key === 'pos';
      return { ...prev, [leagueId]: { key, asc } };
    });
  }, []);

  const sortedRosterRows = useCallback(
    (leagueId: string) => {
      const ids = leagueSummaries.find((x) => x.league.id === leagueId)?.rosterIds ?? [];
      const { key, asc } = getSort(leagueId);
      const rows = ids
        .map((id) => {
          const p = players[id];
          if (!p) return null;
          const ktc = ktcMap[p.full_name.toLowerCase()] ?? 0;
          const bbv = bbvMap[id];
          return {
            id,
            name: p.full_name,
            pos: p.position,
            team: p.team ?? '—',
            ktc,
            bbv: typeof bbv === 'number' ? bbv : null,
            age: p.age,
            inj: p.injury_status ?? '—',
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const cmp = (a: (typeof rows)[0], b: (typeof rows)[0]) => {
        let delta = 0;
        switch (key) {
          case 'player':
            delta = a.name.localeCompare(b.name);
            break;
          case 'pos':
            delta = a.pos.localeCompare(b.pos);
            break;
          case 'value': {
            const va = ktFor(a.id, players, ktcMap, bbvMap);
            const vb = ktFor(b.id, players, ktcMap, bbvMap);
            delta = va - vb;
            break;
          }
          case 'age':
            delta = (a.age ?? -1) - (b.age ?? -1);
            break;
          default:
            delta = 0;
        }
        return asc ? delta : -delta;
      };
      return [...rows].sort(cmp);
    },
    [leagueSummaries, players, ktcMap, bbvMap, getSort]
  );

  const exportLeagueCsv = useCallback(
    (leagueId: string, leagueName: string) => {
      const rows = sortedRosterRows(leagueId);
      const headers = ['Player', 'Position', 'Team', 'KTC', 'BBV', 'Age', 'Status'];
      const lines = [
        headers.join(','),
        ...rows.map((r) =>
          [
            escapeCsv(r.name),
            escapeCsv(r.pos),
            escapeCsv(String(r.team)),
            String(Math.round(r.ktc)),
            r.bbv != null ? String(Math.round(r.bbv)) : '',
            r.age ?? '',
            escapeCsv(String(r.inj)),
          ].join(',')
        ),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${leagueName.replace(/[^\w\s-]/g, '').slice(0, 48)}-roster.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [sortedRosterRows]
  );

  const portfolioSkeleton = (
    <div className="space-y-8 animate-pulse max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="h-14 w-2/3 max-w-lg shimmer rounded-lg bg-white/[0.06]" />
      <div className="grid md:grid-cols-3 gap-6">
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-48 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/50" />
        ))}
      </div>
      <div className="h-40 shimmer rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40" />
      <div className="h-64 shimmer rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40" />
    </div>
  );

  if (loading) {
    return <AppBackground intensity="subtle">{portfolioSkeleton}</AppBackground>;
  }

  const posLabel: Record<Pos, string> = {
    QB: 'QBs',
    RB: 'RBs',
    WR: 'WRs',
    TE: 'TEs',
  };

  const sumBbvLine =
    aggregates.hasBbv && aggregates.totalBbvSum > 0 ? Math.round(aggregates.totalBbvSum).toLocaleString() : null;

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 lg:pb-12 pt-8 lg:pt-10 space-y-10">
        <header className="glass-panel rounded-xl p-6 sm:p-8">
          <h1 className="display font-normal leading-none tracking-tight text-[var(--gold)] text-[clamp(2rem,5vw,3rem)]">
            DYNASTY PORTFOLIO
          </h1>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#64748B]">
            YOUR 3-YEAR EMPIRE WINDOW
          </p>
        </header>

        {alerts.map((a, i) => (
          <div
            key={i}
            className={clsx(
              'rounded-xl border px-4 py-3 text-sm leading-snug',
              a.tone === 'red' && 'border-red-500/40 bg-red-500/[0.08] text-red-100',
              a.tone === 'purple' &&
                'border-purple-500/35 bg-gradient-to-r from-purple-950/70 to-[var(--indigo)]/20 text-[var(--text-secondary)]',
              a.tone === 'cyan' && 'border-cyan-500/35 bg-cyan-950/25 text-cyan-100'
            )}
          >
            {a.text}
          </div>
        ))}

        {leagues.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-12 text-center">
            <p className="text-[var(--text-secondary)] mb-4">No synced leagues yet. Connect Sleeper from Settings.</p>
            <Link href="/dashboard/settings" className="inline-flex px-6 py-3 rounded-xl bg-[var(--indigo)] text-white font-semibold">
              Settings
            </Link>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-col gap-4 lg:min-h-[70vh] lg:gap-6">
              <div className="min-h-[300px] flex-[3] min-w-0">
                <DynastyThreeYearSection
                  rosterPlayerIds={dynastyRosterPlayerIds}
                  playersById={playersLiteById}
                  ktcByNameLower={ktcMap}
                />
              </div>
              <div className="flex-[2] min-h-0 min-w-0 space-y-10">
                <section className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {/* Total value */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-6 shadow-[var(--shadow-card)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Total portfolio value</p>
                <p className="display text-[2.65rem] sm:text-[2.85rem] text-[var(--gold)] leading-none">
                  {aggregates.headlineKtc ? aggregates.headlineKtc.toLocaleString() : '—'}
                </p>
                {sumBbvLine && (
                  <p className="mt-3 text-lg text-[var(--cyan)] font-semibold">
                    Σ BBV (crowdsourced Boom or Bust): {sumBbvLine}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-5 flex-wrap">
                  <div className="flex items-center gap-2">
                    {weekChange !== null ? (
                      <>
                        {weekChange >= 0 ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400" />
                        )}
                        <span
                          className={clsx(
                            'display text-lg',
                            weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {weekChange >= 0 ? '+' : ''}
                          {weekChange.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">Log more visits for week-over-week %</span>
                    )}
                    <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">vs prior snapshot</span>
                  </div>
                  <SparklineGraph data={spark} width={100} height={44} />
                </div>
              </div>

              {/* Exposure */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-6 shadow-[var(--shadow-card)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Exposure analysis</p>
                <p className="text-sm text-white display mb-3">Your top 5 holdings</p>
                <ul className="space-y-3">
                  {aggregates.topHoldings.map((h) => (
                    <li key={h.id} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://sleepercdn.com/content/nfl/players/${h.id}.jpg`}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-lg border border-[var(--border)] w-10 h-10 object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{h.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {h.leagueCount} league{h.leagueCount !== 1 ? 's' : ''} · {h.position}
                        </p>
                      </div>
                      <span className="text-[var(--gold)] font-semibold display text-lg shrink-0">
                        {Math.round(h.combinedKtc).toLocaleString()}
                      </span>
                    </li>
                  ))}
                  {!aggregates.topHoldings.length && (
                    <p className="text-sm text-[var(--text-muted)]">No graded assets yet.</p>
                  )}
                </ul>
                {aggregates.concentration && (
                  <p className="mt-4 text-sm border border-amber-500/35 rounded-xl px-3 py-2 bg-amber-500/[0.07] text-amber-100">
                    ⚠️ {aggregates.concentration.pct}% of portfolio KTC concentrated in{' '}
                    {posLabel[aggregates.concentration.pos]}
                  </p>
                )}
              </div>

              {/* League health */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-6 shadow-[var(--shadow-card)] flex flex-col">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">League health</p>
                <div className="flex items-start gap-4 flex-1">
                  <span
                    className={clsx(
                      'display text-7xl px-4 py-2 rounded-xl border leading-none shrink-0',
                      letterStyles(aggregates.portfolioLetter)
                    )}
                  >
                    {aggregates.portfolioLetter}
                  </span>
                  <div className="text-sm text-[var(--text-secondary)] space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
                    <p>
                      Dynasty score pool (distinct players). Breakdown:&nbsp;
                      <span className="text-emerald-300">{aggregates.leagueHealth.contenders} contenders</span>,{' '}
                      <span className="text-amber-200">{aggregates.leagueHealth.middling} middling</span>,{' '}
                      <span className="text-red-300/90">{aggregates.leagueHealth.rebuilders} rebuilds</span>.
                    </p>
                    <p>
                      Projected wins this week:{' '}
                      <span className="text-white font-semibold">{weekWins.total ? `${weekWins.got}/${weekWins.total}` : '—'}</span>{' '}
                      leagues tracked (live Sleeper projections).
                    </p>
                  </div>
                </div>
              </div>
                </section>

                {/* Heatmap */}
                <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-5 sm:p-8 shadow-[var(--shadow-card)]">
              <p className="display text-xl text-white mb-2">Position heatmap</p>
              <p className="text-xs text-[var(--text-muted)] mb-6">Depth &amp; value density across QB · RB · WR · TE (all leagues)</p>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="grid grid-cols-4 gap-4 min-w-[520px] sm:min-w-0">
                  {KEY_POSITIONS.map((pos) => {
                    const cell = heatCells[pos];
                    return (
                      <div
                        key={pos}
                        className={clsx(
                          'rounded-2xl border p-5 flex flex-col min-h-[160px]',
                          HEAT_STYLES[cell.level]
                        )}
                      >
                        <p className="display text-lg text-white/95 mb-1">{pos}</p>
                        <p className="text-3xl font-bold tabular-nums">{cell.count}</p>
                        <p className="text-xs mt-2 opacity-90">Bodies rostered</p>
                        <p className="mt-auto pt-4 text-sm font-semibold border-t border-white/10">
                          {Math.round(cell.ktc).toLocaleString()} KTC combined
                        </p>
                        {cell.addDepth && (
                          <span className="mt-3 inline-flex text-[10px] font-bold uppercase tracking-wider bg-black/25 px-2 py-1 rounded border border-white/15">
                            Add depth
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
                </section>

                {/* Accordions */}
                <section className="space-y-4">
              <h2 className="display text-lg text-white uppercase tracking-[0.12em]">League portfolios</h2>

              {leagueSummaries.map((ls) => {
                const open = expanded === ls.league.id;
                const sort = getSort(ls.league.id);
                const sorted = sortedRosterRows(ls.league.id);
                return (
                  <div key={ls.league.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex flex-wrap gap-4 items-center text-left px-4 sm:px-6 py-4 hover:bg-white/[0.03] transition"
                      onClick={() => setExpanded((e) => (e === ls.league.id ? null : ls.league.id))}
                      aria-expanded={open}
                    >
                      <Image src={ls.logoUrl} alt="" width={40} height={40} className="rounded-xl border border-[var(--border)]" />
                      <span className="flex-1 min-w-[160px]">
                        <span className="text-white font-semibold display text-lg block truncate">{ls.league.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{ls.record}</span>
                      </span>
                      <span className="text-[var(--text-secondary)] text-sm">
                        Total <span className="text-[var(--gold)] font-semibold">{Math.round(ls.rosterValue).toLocaleString()} KTC</span>
                      </span>
                      <span
                        className={clsx(
                          'inline-flex px-3 py-1 rounded-lg border text-lg display shrink-0',
                          letterStyles(ls.letter)
                        )}
                      >
                        {ls.letter}
                      </span>
                      {open ? <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />}
                    </button>

                    {open && (
                      <div className="border-t border-[var(--border)] px-4 sm:px-6 py-5 bg-[var(--bg-secondary)]/40">
                        <div className="flex flex-wrap gap-3 items-center mb-4">
                          <OpenInSleeper leagueId={ls.league.id} variant="button" className="!text-xs !py-2 !px-3 " />
                          <button
                            type="button"
                            onClick={() => exportLeagueCsv(ls.league.id, ls.league.name)}
                            className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg border border-[var(--border)] px-3 py-2 hover:border-[var(--border-hover)]"
                          >
                            <Download className="w-4 h-4" />
                            Export CSV
                          </button>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {(['player', 'pos', 'value', 'age'] as SortKey[]).map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSort(ls.league.id, key)}
                                className={clsx(
                                  'rounded-lg px-2 py-1 border',
                                  sort.key === key
                                    ? 'border-[var(--indigo)] bg-[var(--indigo)]/20 text-white'
                                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-white'
                                )}
                              >
                                {key}
                                {sort.key === key && (sort.asc ? ' ↑' : ' ↓')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-sm min-w-[640px]">
                            <thead>
                              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                                <th className="py-2 pr-3">Player</th>
                                <th className="py-2 pr-3">Pos</th>
                                <th className="py-2 pr-3">Team</th>
                                <th className="py-2 pr-3">KTC</th>
                                <th className="py-2 pr-3">BBV</th>
                                <th className="py-2 pr-3">Age</th>
                                <th className="py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.map((r) => (
                                <tr key={r.id} className="border-b border-[var(--border)]/70">
                                  <td className="py-2 pr-3 text-white">
                                    <div className="flex items-center gap-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`https://sleepercdn.com/content/nfl/players/${r.id}.jpg`}
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="rounded-lg w-8 h-8 object-cover shrink-0 border border-white/10"
                                      />
                                      <span>{r.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3">{r.pos}</td>
                                  <td className="py-2 pr-3">{r.team}</td>
                                  <td className="py-2 pr-3">{Math.round(r.ktc).toLocaleString()}</td>
                                  <td className="py-2 pr-3 text-[var(--cyan)]">{r.bbv != null ? Math.round(r.bbv).toLocaleString() : '—'}</td>
                                  <td className="py-2 pr-3">{r.age ?? '—'}</td>
                                  <td className="py-2 text-[var(--text-secondary)]">{r.inj}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </AppBackground>
  );
}
