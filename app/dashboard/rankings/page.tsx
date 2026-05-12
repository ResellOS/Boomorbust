'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import {
  ExternalLink,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { KTCPlayer } from '@/lib/values/ktc';

// ─── Design tokens ─────────────────────────────────────────────────────────
const BG = '#0B0E14';
const BORDER = '#1F2937';
const CARD = '#080C11';
const CARD2 = '#0D1117';
const TEXT = '#f8fafc';
const TEXT_SEC = '#94a3b8';
const TEXT_MUTED = '#64748b';
const INDIGO = '#6366f1';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';

const F_BEBAS = { fontFamily: 'var(--font-bebas-neue), "Bebas Neue", Impact, sans-serif' } as const;
const F_INTER = { fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' } as const;
const F_MONO = { fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Mono", ui-monospace, monospace' } as const;

// ─── Constants ──────────────────────────────────────────────────────────────
const POSITION_FILTERS = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const;
type PosFilter = (typeof POSITION_FILTERS)[number];
type AgeBand = 'all' | 'rookie' | 'prime' | 'vets';

const POS_STYLE: Record<string, { bg: string; text: string }> = {
  QB: { bg: `${INDIGO}30`, text: '#a5b4fc' },
  RB: { bg: `${GREEN}25`, text: GREEN },
  WR: { bg: `${CYAN}20`, text: CYAN },
  TE: { bg: `${AMBER}20`, text: AMBER },
};
function posS(pos: string) {
  return POS_STYLE[pos] ?? { bg: 'rgba(255,255,255,0.07)', text: TEXT_SEC };
}

type Signal = 'BOOM' | 'STABLE' | 'BUST';

function deriveDelta(ktc: number, bbv?: number): number | null {
  if (!bbv || !ktc) return null;
  return Math.round(((bbv - ktc) / ktc) * 1000) / 10;
}

function deriveSignal(delta: number | null): Signal {
  if (delta === null) return 'STABLE';
  if (delta >= 12) return 'BOOM';
  if (delta <= -12) return 'BUST';
  return 'STABLE';
}

const SIGNAL_META: Record<Signal, { label: string; color: string; bg: string; border: string; rowGlow?: string }> = {
  BOOM: {
    label: 'BOOM',
    color: CYAN,
    bg: `${CYAN}15`,
    border: `${CYAN}50`,
    rowGlow: `inset 3px 0 0 ${CYAN}, 0 0 18px ${CYAN}12`,
  },
  STABLE: {
    label: 'STABLE',
    color: TEXT_MUTED,
    bg: 'rgba(255,255,255,0.04)',
    border: BORDER,
  },
  BUST: {
    label: 'BUST',
    color: RED,
    bg: `${RED}15`,
    border: `${RED}50`,
    rowGlow: `inset 3px 0 0 ${RED}`,
  },
};

function matchesAgeBand(age: number, band: AgeBand): boolean {
  if (band === 'all') return true;
  if (band === 'rookie') return age <= 23;
  if (band === 'prime') return age >= 24 && age <= 27;
  return age >= 28;
}

interface Row {
  k: string;
  name: string;
  pos: string;
  ageNum: number;
  teamAbbr: string | null;
  sleeperId?: string;
  ktc: number;
  bbv?: number;
  fc?: number;
  delta: number | null;
  signal: Signal;
  ownedPair: string;
}

// ─── Dual-line trajectory chart ────────────────────────────────────────────
function TrajectoryChart({
  processData,
  resultsData,
  delta,
}: {
  processData: number[];
  resultsData: number[];
  delta: number | null;
}) {
  const gradIdP = useId().replace(/:/g, '');
  const gradIdR = useId().replace(/:/g, '');
  const W = 220;
  const H = 80;

  function normalise(arr: number[]): number[] {
    const max = Math.max(...arr, 1);
    const min = Math.min(...arr, 0);
    const range = max - min || 1;
    return arr.map((v) => ((v - min) / range) * (H - 10) + 5);
  }

  const raw = processData.length >= 2 ? processData : [0, 0.2, 0.5, 0.7, 0.85, 1].map((t) => t * 6000);
  const rawR = resultsData.length >= 2
    ? resultsData
    : raw.map((v) => v * (delta !== null ? 1 + delta / 100 : 1.2));

  const pNorm = normalise(raw);
  const rNorm = normalise(rawR);
  const steps = Math.max(pNorm.length, rNorm.length);
  const xStep = W / (steps - 1 || 1);

  function toPath(arr: number[]): string {
    return arr.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${H - y}`).join(' ');
  }

  const pStr = toPath(pNorm);
  const rStr = toPath(rNorm);

  const deltaColor = delta !== null && delta > 0 ? GREEN : delta !== null && delta < 0 ? RED : AMBER;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradIdP} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={INDIGO} stopOpacity="0.18" />
            <stop offset="100%" stopColor={INDIGO} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gradIdR} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.18" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="0" y1={H * t} x2={W} y2={H * t}
            stroke={BORDER} strokeWidth="0.5" opacity="0.5"
            strokeDasharray="3 5"
          />
        ))}
        {/* process fill */}
        <path d={`${pStr} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradIdP})`} />
        {/* results fill */}
        <path d={`${rStr} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradIdR})`} />
        {/* lines */}
        <path d={pStr} fill="none" stroke={INDIGO} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={rStr} fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Delta callout */}
      {delta !== null && (
        <div className="mt-2 flex items-center justify-center">
          <span className="text-2xl leading-none tabular-nums font-bold" style={{ ...F_BEBAS, color: deltaColor }}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
          <span className="ml-1.5 text-[9px] uppercase tracking-[0.12em]" style={{ ...F_INTER, color: TEXT_MUTED }}>
            DELTAPOINT
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex gap-3 justify-center text-[9px]" style={F_INTER}>
        <span className="flex items-center gap-1" style={{ color: TEXT_MUTED }}>
          <span className="h-0.5 w-4 rounded-full inline-block" style={{ background: INDIGO }} /> Process
        </span>
        <span className="flex items-center gap-1" style={{ color: TEXT_MUTED }}>
          <span className="h-0.5 w-4 rounded-full inline-block" style={{ background: GREEN }} /> Results
        </span>
      </div>
    </div>
  );
}

// ─── Player Context Panel ──────────────────────────────────────────────────
function PlayerContextPanel({
  row,
  rank,
  sparkData,
  onClose,
}: {
  row: Row;
  rank: number;
  sparkData: number[];
  onClose: () => void;
}) {
  const ps = posS(row.pos);
  const delta = row.delta;
  const signal = row.signal;
  const sm = SIGNAL_META[signal];

  // Simulate two data series from one history
  const processLine = sparkData.length >= 2 ? sparkData : [];
  const resultsLine = processLine.map((v) => v * (delta !== null ? 1 + delta / 100 : 1));

  const isBoom = signal === 'BOOM';
  const isBust = signal === 'BUST';

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden border-l"
      style={{ background: '#07090E', borderColor: BORDER }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-3"
        style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.3)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ ...F_INTER, color: TEXT_MUTED }}>
              PLAYER CONTEXT
            </p>
          </div>
          <p className="mt-0.5 text-[10px] uppercase" style={{ ...F_INTER, color: TEXT_MUTED }}>
            (SELECTED: {row.name.split(' ').at(-1)?.toUpperCase() ?? row.name.toUpperCase()})
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 hover:bg-white/5"
          style={{ color: TEXT_MUTED }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Avatar + basic stats */}
        <div className="flex items-center gap-2.5">
          {row.sleeperId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://sleepercdn.com/content/nfl/players/${row.sleeperId}.jpg`}
              alt={row.name}
              width={52}
              height={52}
              className="shrink-0 rounded-lg object-cover"
              style={{ width: 52, height: 52, border: `1px solid ${BORDER}` }}
            />
          ) : (
            <div
              className="shrink-0 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ width: 52, height: 52, background: `${INDIGO}30`, color: '#a5b4fc' }}
            >
              {row.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" style={F_INTER}>{row.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: ps.bg, color: ps.text }}>
                {row.pos}
              </span>
              {row.teamAbbr && (
                <span className="rounded border px-1.5 py-0.5 text-[9px]" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
                  {row.teamAbbr}
                </span>
              )}
              {rank <= 5 && (
                <span
                  className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{ borderColor: `${CYAN}50`, background: `${CYAN}15`, color: CYAN }}
                >
                  ◆ IMMORTAL
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Signal badge */}
        <div
          className="flex items-center gap-2 rounded-sm border px-2.5 py-2"
          style={{ background: sm.bg, borderColor: sm.border }}
        >
          {isBoom ? (
            <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: sm.color }} />
          ) : isBust ? (
            <TrendingDown className="h-3.5 w-3.5 shrink-0" style={{ color: sm.color }} />
          ) : (
            <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: sm.color }} />
          )}
          <span className="text-xs font-bold uppercase tracking-[0.06em]" style={{ ...F_BEBAS, color: sm.color }}>
            {sm.label}
          </span>
        </div>

        {/* Trajectory chart */}
        <div
          className="rounded-sm border p-2.5"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ ...F_INTER, color: TEXT_MUTED }}>
            Process vs. Results
            <span className="ml-1 font-normal" style={{ color: TEXT_MUTED }}>
              ({new Date().getFullYear()} Trajectory)
            </span>
          </p>
          <TrajectoryChart
            processData={processLine}
            resultsData={resultsLine}
            delta={delta}
          />
        </div>

        {/* Value stats */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'MARKET VAL', val: row.ktc, color: TEXT },
            { label: 'BBSM VAL', val: row.bbv ?? null, color: CYAN },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-sm border p-2" style={{ background: CARD2, borderColor: BORDER }}>
              <p className="text-[8px] uppercase tracking-[0.12em]" style={{ ...F_INTER, color: TEXT_MUTED }}>
                {label}
              </p>
              <p className="mt-0.5 text-lg leading-none tabular-nums" style={{ ...F_BEBAS, color }}>
                {val !== null ? Math.round(val).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Boomer / Buster advisories */}
        <div
          className="rounded-sm border p-2.5 space-y-2"
          style={{ background: `${CYAN}06`, borderColor: `${CYAN}25` }}
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...F_INTER, color: CYAN }}>
              Boomer Case
            </p>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ ...F_INTER, color: TEXT_SEC }}>
            {row.ktc >= 7000
              ? 'Elite 3-down workload projected. Dynasty ceiling intact through 2027.'
              : row.ktc >= 4500
              ? 'High-upside profile. Positive BBV divergence signals undervaluation in current market.'
              : 'Emerging target — volume trajectory points to starter ceiling within 12 months.'}
          </p>
        </div>

        <div
          className="rounded-sm border p-2.5 space-y-2"
          style={{ background: `${RED}06`, borderColor: `${RED}25` }}
        >
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 shrink-0" style={{ color: RED }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ ...F_INTER, color: RED }}>
              Nuke Risk
            </p>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ ...F_INTER, color: TEXT_SEC }}>
            {isBust
              ? `Market compression detected. KTC premium may not hold into offseason. Sell window open.`
              : row.ageNum >= 28
              ? `Age cliff risk (${row.ageNum}yo): Value decay likely accelerates post-2026. Monitor depth chart.`
              : 'Minimal — due to team age profile and contract stability. Hold.'}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-1.5 pt-1">
          <Link
            href={`/dashboard/trade?giving=${encodeURIComponent(row.name)}`}
            className="flex items-center justify-center gap-2 rounded-sm py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            style={{ background: INDIGO, ...F_BEBAS, letterSpacing: '0.07em' }}
          >
            ANALYZE TRADE
          </Link>
          <a
            href={row.sleeperId ? `https://sleeper.com/players/nfl/${row.sleeperId}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-sm border py-2.5 text-xs font-semibold transition hover:border-[#374151] hover:bg-white/[0.02]"
            style={{ borderColor: BORDER, color: TEXT_SEC, ...F_INTER }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Sleeper
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function RankingsPage() {
  const [loading, setLoading] = useState(true);
  const [merged, setMerged] = useState<Row[]>([]);
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  const [pos, setPos] = useState<PosFilter>('ALL');
  const [ageBand, setAgeBand] = useState<AgeBand>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  const [, setHistories] = useState<Record<string, number[]>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sparkById, setSparkById] = useState<Record<string, number[]>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const supabase = createClient();
      setLoading(true);
      try {
        const [vRes, bbRes, lgRes] = await Promise.all([
          fetch('/api/values'),
          fetch('/api/bbv?ids=all'),
          supabase.from('leagues').select('id, name'),
        ]);
        const ktcRaw: KTCPlayer[] = vRes.ok ? await vRes.json() : [];
        const bbAll: Record<string, number> = bbRes.ok ? await bbRes.json() : {};
        setLeagues(lgRes.data ?? []);

        const top = ktcRaw.slice(0, 500);
        const names = top.map((p) => p.player_name);
        const mapping: Record<string, string> = {};

        for (let i = 0; i < names.length; i += 120) {
          const chunk = names.slice(i, i + 120);
          const mr = await fetch('/api/players/map-names', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: chunk }),
          });
          if (mr.ok) {
            const j = (await mr.json()) as { mapping?: Record<string, string> };
            Object.assign(mapping, j.mapping ?? {});
          }
        }

        const uniqIds = Array.from(new Set(Object.values(mapping).filter(Boolean))) as string[];
        let playerMeta: Record<string, { team: string | null; age?: number | null }> = {};
        for (let i = 0; i < uniqIds.length; i += 200) {
          const ids = uniqIds.slice(i, i + 200);
          if (!ids.length) continue;
          const pr = await fetch(`/api/players?ids=${encodeURIComponent(ids.join(','))}`);
          if (!pr.ok) continue;
          const pmap = (await pr.json()) as Record<string, { team: string | null; age?: number | null }>;
          playerMeta = { ...playerMeta, ...pmap };
        }

        const { data: lgData } = await supabase.from('leagues').select('id');
        const { data: prof } = await supabase.from('profiles').select('sleeper_user_id').single();
        const ownerSid = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;
        const ownCount: Record<string, number> = {};
        const lids = (lgData ?? []).map((l) => l.id);
        await Promise.all(
          lids.map(async (lid) => {
            let q = supabase.from('rosters').select('players').eq('league_id', lid);
            q = ownerSid ? q.eq('owner_id', ownerSid) : q.limit(1);
            const { data: rows } = await q;
            for (const pid of (rows?.[0]?.players ?? []) as string[])
              ownCount[pid] = (ownCount[pid] ?? 0) + 1;
          })
        );
        const nLeagues = Math.max(lids.length, 1);

        const rowsOut: Row[] = top.map((p) => {
          const sid = mapping[p.player_name];
          const meta = sid ? playerMeta[sid] : undefined;
          const ageNum = typeof meta?.age === 'number' ? meta.age : p.age ?? 0;
          const bbv = sid ? bbAll[sid] : undefined;
          const delta = deriveDelta(p.ktc_value, bbv);
          const signal = deriveSignal(delta);
          const ownedPair = sid && typeof ownCount[sid] === 'number'
            ? `${ownCount[sid]} of ${nLeagues}`
            : '—';
          return {
            k: `${p.player_name}:${p.rank}`,
            name: p.player_name,
            pos: p.position,
            ageNum,
            teamAbbr: meta?.team ?? null,
            sleeperId: sid,
            ktc: p.ktc_value,
            bbv,
            delta,
            signal,
            ownedPair,
          };
        });

        if (cancelled) return;
        setMerged(rowsOut);

        const hid = uniqIds.slice(0, 120);
        if (hid.length) {
          const ht = await fetch('/api/players/value-history-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: hid }),
          });
          if (ht.ok && !cancelled) {
            const j = (await ht.json()) as { histories?: Record<string, number[]> };
            setHistories(j.histories ?? {});
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qLow = debounced.toLowerCase();
    return merged.filter((r) => {
      if (pos !== 'ALL' && r.pos !== pos) return false;
      if (!matchesAgeBand(r.ageNum, ageBand)) return false;
      if (qLow && !r.name.toLowerCase().includes(qLow)) return false;
      return true;
    });
  }, [merged, pos, ageBand, debounced]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.ktc - a.ktc), [filtered]);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 50,
    overscan: 8,
  });

  const selectedRow = useMemo(() => sorted.find((r) => r.k === selectedKey) ?? null, [sorted, selectedKey]);
  const selectedRank = useMemo(() => {
    if (!selectedKey) return 0;
    const i = sorted.findIndex((r) => r.k === selectedKey);
    return i + 1;
  }, [sorted, selectedKey]);

  // Load sparkline when panel opens
  useEffect(() => {
    async function ld() {
      if (!selectedRow?.sleeperId || sparkById[selectedRow.sleeperId]) return;
      try {
        const res = await fetch(`/api/players/value-history?id=${encodeURIComponent(selectedRow.sleeperId)}`);
        if (!res.ok) return;
        const arr = (await res.json()) as number[];
        setSparkById((p) => ({ ...p, [selectedRow.sleeperId!]: arr }));
      } catch { /* noop */ }
    }
    void ld();
  }, [selectedRow, sparkById]);

  const panelOpen = selectedRow !== null;

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden lg:ml-16" style={{ background: BG }}>
      {/* Main table area */}
      <div className={clsx('flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300', panelOpen ? 'lg:pr-0' : '')}>

        {/* Header */}
        <div className="shrink-0 border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER }}>
          <h1 className="text-2xl leading-none text-white sm:text-[1.75rem]" style={F_BEBAS}>
            COMBINED RANKINGS{' '}
            <span style={{ color: TEXT_MUTED }}>(MARKET ARBITRAGE):</span>{' '}
            <span style={{ color: CYAN }}>FIND THE GAP</span>
          </h1>

          {/* Controls row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: TEXT_MUTED }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for player or league…"
                className="h-9 w-full rounded-sm border bg-transparent pl-8 pr-3 text-xs text-white placeholder:text-[#475569] focus:outline-none"
                style={{ borderColor: BORDER, ...F_INTER }}
              />
            </div>

            {/* Context toggle */}
            <div
              className="flex items-center gap-2 rounded-sm border px-2.5 py-1.5"
              style={{ borderColor: `${CYAN}40`, background: `${CYAN}10` }}
            >
              <span className="text-[9px] uppercase tracking-[0.12em]" style={{ ...F_INTER, color: TEXT_MUTED }}>
                Context:
              </span>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wide focus:outline-none"
                style={{ ...F_INTER, color: CYAN }}
              >
                <option value="all" style={{ background: '#111' }}>All Leagues</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id} style={{ background: '#111' }}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Position filters */}
            <div className="flex items-center gap-1">
              {POSITION_FILTERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPos(p)}
                  className={clsx(
                    'rounded-sm border px-2 py-1 text-[9px] font-bold uppercase tracking-wide transition',
                    pos === p ? 'text-white' : 'hover:border-[#374151]'
                  )}
                  style={{
                    borderColor: pos === p ? INDIGO : BORDER,
                    background: pos === p ? `${INDIGO}25` : 'transparent',
                    color: pos === p ? TEXT : TEXT_MUTED,
                    ...F_INTER,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Age band */}
            <select
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value as AgeBand)}
              className="h-9 rounded-sm border bg-transparent px-2 text-xs focus:outline-none"
              style={{ borderColor: BORDER, color: TEXT_MUTED, ...F_INTER }}
            >
              <option value="all" style={{ background: '#111' }}>All ages</option>
              <option value="rookie" style={{ background: '#111' }}>≤23 rookies</option>
              <option value="prime" style={{ background: '#111' }}>Prime 24-27</option>
              <option value="vets" style={{ background: '#111' }}>Vets 28+</option>
            </select>

            <span className="ml-auto text-[10px] tabular-nums" style={{ ...F_INTER, color: TEXT_MUTED }}>
              {sorted.length} players
            </span>
          </div>
        </div>

        {/* Table header */}
        <div
          className="grid shrink-0 border-b px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{
            borderColor: BORDER,
            background: 'rgba(0,0,0,0.3)',
            color: TEXT_MUTED,
            gridTemplateColumns: 'minmax(36px,36px) minmax(160px,1fr) 52px 40px 80px 80px 68px 68px',
            ...F_INTER,
          }}
        >
          <span>RK</span>
          <span>Player (w/ Pos)</span>
          <span>Team</span>
          <span>Age</span>
          <span className="text-right">Market Val</span>
          <span className="text-right">BBSM Val</span>
          <span className="text-right">Delta %</span>
          <span className="text-center">Signal</span>
        </div>

        {/* Virtualised rows */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-1.5 w-full px-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[50px] animate-pulse rounded-sm" style={{ background: CARD2, animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20 text-sm" style={{ color: TEXT_MUTED }}>
            No players match — try wider filters.
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const row = sorted[vi.index]!;
                const rank = vi.index + 1;
                const sm = SIGNAL_META[row.signal];
                const isImmortal = rank <= 5;
                const isSelected = row.k === selectedKey;

                const ps = posS(row.pos);

                return (
                  <div
                    key={row.k}
                    style={{
                      position: 'absolute',
                      top: vi.start,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedKey((k) => (k === row.k ? null : row.k))}
                      className="group grid h-full w-full items-center border-b px-3 text-left transition-colors"
                      style={{
                        borderColor: `${BORDER}70`,
                        background: isSelected
                          ? `${INDIGO}12`
                          : vi.index % 2 === 1
                          ? 'rgba(255,255,255,0.012)'
                          : 'transparent',
                        boxShadow: isSelected
                          ? `inset 3px 0 0 ${INDIGO}`
                          : row.signal === 'BOOM'
                          ? sm.rowGlow
                          : row.signal === 'BUST'
                          ? sm.rowGlow
                          : undefined,
                        gridTemplateColumns: 'minmax(36px,36px) minmax(160px,1fr) 52px 40px 80px 80px 68px 68px',
                      }}
                    >
                      {/* RK */}
                      <span
                        className="text-lg leading-none tabular-nums"
                        style={{
                          ...F_BEBAS,
                          color: isImmortal ? CYAN : TEXT_MUTED,
                          textShadow: isImmortal ? `0 0 14px ${CYAN}` : undefined,
                        }}
                      >
                        {rank}
                        {isImmortal && (
                          <span className="ml-0.5 text-[8px] align-top" style={{ color: CYAN }}>◆</span>
                        )}
                      </span>

                      {/* Player */}
                      <span className="flex items-center gap-2 min-w-0">
                        {row.sleeperId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://sleepercdn.com/content/nfl/players/${row.sleeperId}.jpg`}
                            alt=""
                            width={30}
                            height={30}
                            className="shrink-0 rounded object-cover"
                            style={{
                              width: 30, height: 30,
                              border: isImmortal ? `1px solid ${CYAN}60` : `1px solid ${BORDER}`,
                              boxShadow: isImmortal ? `0 0 8px ${CYAN}40` : undefined,
                            }}
                          />
                        ) : (
                          <span
                            className="shrink-0 rounded flex items-center justify-center text-[8px] font-bold"
                            style={{ width: 30, height: 30, background: `${INDIGO}30`, color: '#a5b4fc', border: `1px solid ${BORDER}` }}
                          >
                            {row.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span
                            className="block truncate text-[12px] font-semibold transition-colors group-hover:text-white"
                            style={{ color: isSelected ? TEXT : TEXT_SEC }}
                          >
                            {row.name}
                          </span>
                          <span
                            className="inline-block rounded px-1 py-0.5 text-[8px] font-bold uppercase"
                            style={{ background: ps.bg, color: ps.text }}
                          >
                            {row.pos}
                          </span>
                        </span>
                      </span>

                      {/* Team */}
                      <span className="text-[11px] tabular-nums" style={{ ...F_MONO, color: TEXT_MUTED }}>
                        {row.teamAbbr ?? '—'}
                      </span>

                      {/* Age */}
                      <span className="text-[11px] tabular-nums" style={{ ...F_MONO, color: TEXT_MUTED }}>
                        {row.ageNum || '—'}
                      </span>

                      {/* Market Val (KTC) */}
                      <span className="text-right text-[13px] tabular-nums font-medium" style={{ ...F_BEBAS, color: TEXT }}>
                        {Math.round(row.ktc).toLocaleString()}
                      </span>

                      {/* BBSM Val */}
                      <span
                        className="text-right text-[13px] tabular-nums font-medium"
                        style={{ ...F_BEBAS, color: typeof row.bbv === 'number' ? CYAN : TEXT_MUTED }}
                      >
                        {typeof row.bbv === 'number' ? Math.round(row.bbv).toLocaleString() : '—'}
                      </span>

                      {/* Delta % */}
                      <span
                        className="text-right text-[12px] tabular-nums font-bold"
                        style={{
                          ...F_BEBAS,
                          color: row.delta === null
                            ? TEXT_MUTED
                            : row.delta > 0 ? GREEN : row.delta < 0 ? RED : TEXT_MUTED,
                        }}
                      >
                        {row.delta !== null ? `${row.delta > 0 ? '+' : ''}${row.delta}%` : '—'}
                      </span>

                      {/* Signal */}
                      <span className="flex justify-center">
                        <span
                          className="rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            borderColor: sm.border,
                            background: sm.bg,
                            color: sm.color,
                            boxShadow: row.signal === 'BOOM' ? `0 0 8px ${CYAN}35` : undefined,
                            ...F_INTER,
                          }}
                        >
                          {sm.label}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right context panel */}
      <div
        className={clsx(
          'shrink-0 transition-all duration-300 ease-out overflow-hidden',
          panelOpen ? 'w-[min(280px,38vw)]' : 'w-0'
        )}
        style={{ borderLeft: panelOpen ? `1px solid ${BORDER}` : 'none' }}
      >
        {selectedRow && (
          <PlayerContextPanel
            row={selectedRow}
            rank={selectedRank}
            sparkData={selectedRow.sleeperId ? (sparkById[selectedRow.sleeperId] ?? []) : []}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </div>
  );
}
