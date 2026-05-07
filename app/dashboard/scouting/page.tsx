'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Crosshair, Filter, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import AppBackground from '@/components/AppBackground';
import { createClient } from '@/lib/supabase/client';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';
import {
  ageCurveMultiplier,
  normalizeKtcTo100,
  type CalculateTFOScoreInput,
  type TFOPosition,
  type TFOVerdict,
} from '@/lib/tfo/formula';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import { getRadarMetrics } from '@/components/dashboard/radarMetrics';
import SparklineGraph from '@/components/SparklineGraph';
import type { RadarMetric } from '@/components/dashboard/PlayerHubCard';
import { getPlayerPhotoUrl } from '@/lib/sleeper/playerPhotos';

type ScoutingPlayer = DynastyPlayer2026 & { playerId: string; sleeperId?: string };

interface RostRow {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
}

const F_MONO = { fontFamily: 'var(--font-mono-tactical), ui-monospace, monospace' } as const;

function stablePlayerId(p: DynastyPlayer2026): string {
  return `dynasty2026-${p.rank}-${p.name.replace(/\s+/g, '-').slice(0, 24)}`;
}

/** Same stable PRNG as lineup optimize `seededUnit`. */
function seededUnit(id: string, salt: number): number {
  let h = 0x811c9dc5;
  const input = `${id}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10001) / 10000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function buildTfoInput(p: ScoutingPlayer): CalculateTFOScoreInput {
  return {
    playerId: p.playerId,
    position: p.position as TFOPosition,
    age: p.age,
    team: p.team.toUpperCase(),
    ocScheme: schemeForTeam(p.team),
    opportunityScore: p.tfoOpportunityScore,
    olGrade: 70,
    wrCastGrade: 70,
    redZoneShare: 60,
    ktcValue: p.marketValue,
    ocYear: 3,
    rbUsageStyle: p.tfoRbUsageStyle ?? 'POWER',
    wrDeployment: p.tfoWrDeployment ?? 'SLOT',
    teamQbIsYoung: p.tfoTeamQbIsYoung,
  };
}

function marketValuePercentile(marketValue: number, sortedAsc: number[]): number {
  if (!sortedAsc.length) return 50;
  let idx = sortedAsc.findIndex((v) => v >= marketValue);
  if (idx === -1) idx = sortedAsc.length - 1;
  return (idx / Math.max(sortedAsc.length - 1, 1)) * 100;
}

function computeHiddenGems(list: ScoutingPlayer[]): ScoutingPlayer[] {
  if (!list.length) return [];
  const sortedAsc = Array.from(new Set(list.map((p) => p.marketValue))).sort((a, b) => a - b);
  const ranked = list
    .map((p) => {
      const norm = normalizeKtcTo100(p.marketValue);
      const gap = p.tfoScore - norm;
      const pct = marketValuePercentile(p.marketValue, sortedAsc);
      return { p, gap, pct };
    })
    .filter(({ p, gap: g0, pct }) => g0 > 0 && p.tfoScore > pct)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5)
    .map((x) => x.p);
  if (ranked.length) return ranked;
  return [...list]
    .map((p) => ({ p, gap: p.tfoScore - normalizeKtcTo100(p.marketValue) }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5)
    .map((x) => x.p);
}

function routePreset(
  position: string,
  scheme: string,
  wrDeployment: string | undefined,
): { go: number; slant: number; out: number; cross: number } {
  const sch = scheme.toLowerCase();
  const dep = (wrDeployment ?? 'SLOT').toUpperCase();

  if (position === 'WR' && sch.includes('mcvay') && dep === 'SLOT') {
    return { slant: 45, cross: 30, out: 15, go: 10 };
  }
  if (position === 'WR' && sch.includes('norv')) {
    return { go: 40, out: 30, slant: 20, cross: 10 };
  }
  if (position === 'RB' && sch.includes('reid')) {
    return { cross: 50, slant: 30, out: 15, go: 5 };
  }
  if (position === 'TE' && sch.includes('reid')) {
    return { cross: 45, slant: 25, out: 20, go: 10 };
  }
  return { go: 35, out: 25, slant: 25, cross: 15 };
}

function verdictEffMult(v: TFOVerdict): number {
  if (v === 'BOOM' || v === 'LEAN_BOOM') return 1.15;
  if (v === 'NEUTRAL') return 1.02;
  return 0.88;
}

function boomTrendLabel(v: TFOVerdict, tfoScore: number): 'boom' | 'bust' {
  if (v === 'BOOM' || v === 'LEAN_BOOM') return 'boom';
  if (v === 'BUST' || v === 'LEAN_BUST') return 'bust';
  return tfoScore >= 55 ? 'boom' : 'bust';
}

function radarPolygon(values: number[], cx: number, cy: number, r: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = cx + v * r * Math.cos(angle);
      const y = cy + v * r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function axisAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

function SeparationBars({ playerId, tfoScore }: { playerId: string; tfoScore: number }) {
  const labels = ['0 yd Cushion', '15 yd Cushion', '25 yd Cushion', '45 yd Cushion', 'Pass Block %'];
  const values = labels.map((_, i) =>
    clamp(Math.round(tfoScore * 0.55 + seededUnit(playerId, 90 + i) * 45), 8, 98),
  );
  const barColor = (v: number) =>
    v > 65 ? '#36E7A1' : v >= 45 ? '#22D3EE' : '#475569';

  return (
    <div className="mt-4">
      <p className="text-[10px] font-mono-tactical uppercase tracking-[0.14em] text-[#94A3B8] mb-2">
        Separation score (vs. man/zone)
      </p>
      <div className="flex items-end justify-center gap-2">
        {values.map((v, i) => (
          <div key={labels[i]} className="flex flex-col items-center gap-1">
            <div
              className="w-8 rounded-t-sm transition-all"
              style={{
                height: `${(v / 100) * 80}px`,
                backgroundColor: barColor(v),
                minHeight: 6,
              }}
            />
            <span
              className="text-[9px] text-center leading-tight text-[#64748B] max-w-[72px]"
              style={F_MONO}
            >
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrajectoryChart({ p, normalizedMarket }: { p: ScoutingPlayer; normalizedMarket: number }) {
  const W = 560;
  const H = 160;
  const pad = { l: 36, r: 12, t: 14, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const years = [2024, 2025, 2026, 2027, 2028];
  const pos = p.position as TFOPosition;
  const rb = p.tfoRbUsageStyle ?? 'POWER';

  const collegeSeries = years.map((_, i) => {
    if (i === 0) return p.tfoScore * 0.65;
    if (i === 1) return p.tfoScore;
    const ageOff = i - 1;
    return p.tfoScore * ageCurveMultiplier(pos, p.age + ageOff, rb);
  });

  const n0 = normalizedMarket;
  const v2024 = clamp(n0 * 0.92, 30, 100);
  const v2025 = clamp(normalizedMarket * (1 + p.delta / 100), 30, 100);
  const m = verdictEffMult(p.tfoVerdict);
  const v2026 = clamp(v2025 * m, 30, 100);
  const v2027 = clamp(v2026 * (m >= 1 ? 1.04 : 0.96), 30, 100);
  const v2028 = clamp(v2027 * (m >= 1 ? 1.03 : 0.97), 30, 100);
  const greenSeries = [v2024, v2025, v2026, v2027, v2028];

  const yMin = 30;
  const yMax = 100;
  const xScale = (i: number) => pad.l + (i / (years.length - 1)) * innerW;
  const yScale = (v: number) => pad.t + innerH - ((clamp(v, yMin, yMax) - yMin) / (yMax - yMin)) * innerH;

  const linePath = (series: number[]) =>
    series
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
      .join(' ');

  const areaPath = `${linePath(greenSeries)} L ${xScale(years.length - 1)} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;

  const delta = Math.round(p.tfoScore - normalizedMarket);
  const deltaPositive = delta >= 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[160px] min-w-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {[30, 50, 70, 90].map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={4} y={y + 4} fill="#64748B" fontSize={9} style={F_MONO}>
                {tick}%
              </text>
            </g>
          );
        })}
        {years.map((yr, i) => (
          <text
            key={yr}
            x={xScale(i)}
            y={H - 6}
            fill="#64748B"
            fontSize={10}
            textAnchor="middle"
            style={F_MONO}
          >
            {yr}
          </text>
        ))}
        <path d={areaPath} fill="rgba(54,231,161,0.08)" />
        <path
          d={linePath(collegeSeries)}
          fill="none"
          stroke="#A78BFA"
          strokeWidth={2}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d={linePath(greenSeries)}
          fill="none"
          stroke="#36E7A1"
          strokeWidth={2}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <text
          x={W - pad.r}
          y={H - pad.b + 4}
          fill={deltaPositive ? '#22D3EE' : '#EF4444'}
          fontSize={24}
          textAnchor="end"
          style={{ fontFamily: 'var(--font-display), Bebas Neue, Impact, sans-serif' }}
        >
          {deltaPositive ? '+' : ''}
          {delta}% WIN PROBABILITY
        </text>
        <g>
          <circle cx={pad.l} cy={H - 10} r={4} fill="#A78BFA" />
          <text x={pad.l + 10} y={H - 6} fill="#94A3B8" fontSize={10} style={F_MONO}>
            College Scouting Model
          </text>
        </g>
        <g>
          <circle cx={pad.l + 148} cy={H - 10} r={4} fill="#36E7A1" />
          <text x={pad.l + 158} y={H - 6} fill="#94A3B8" fontSize={10} style={F_MONO}>
            Live NFL Efficiency
          </text>
        </g>
      </svg>
    </div>
  );
}

function RouteHeatmap({
  position,
  team,
  wrDeployment,
}: {
  position: string;
  team: string;
  wrDeployment: string | undefined;
}) {
  const scheme = schemeForTeam(team);
  const { go, slant, out, cross } = routePreset(position, scheme, wrDeployment);
  const rows = [
    { label: 'Go', pct: go, heat: 'hot' as const },
    { label: 'Slant', pct: slant, heat: 'warm' as const },
    { label: 'Out', pct: out, heat: 'mid' as const },
    { label: 'Cross', pct: cross, heat: cross >= 30 ? 'warm' : 'cold' as const },
  ];

  const heatBg = (h: (typeof rows)[0]['heat']) => {
    if (h === 'hot') return 'rgba(54,231,161,0.45)';
    if (h === 'warm') return 'rgba(34,211,238,0.28)';
    if (h === 'mid') return 'rgba(99,102,241,0.22)';
    return 'rgba(59,130,246,0.12)';
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-white/[0.08]"
      style={{ width: 200, height: 160, background: '#0a0f18' }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: 16 + i * 16,
            height: 1,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 100%',
        }}
      />
      <div className="absolute top-2 left-2 right-2 flex flex-col gap-2 z-10">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded px-2 py-1 text-[10px] font-mono-tactical border border-white/10"
            style={{
              backgroundColor: heatBg(r.heat),
              color: '#e2e8f0',
            }}
          >
            {r.label} {r.pct}%
          </div>
        ))}
      </div>
    </div>
  );
}

function ReticleIdle() {
  return (
    <div className="relative flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <span
          className="absolute inset-6 border border-dashed border-[#22D3EE]/25 rounded-full animate-pulse"
          aria-hidden
        />
        <span
          className="absolute inset-10 border border-[#22D3EE]/15 rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
          aria-hidden
        />
        <Crosshair className="w-14 h-14 text-[#22D3EE]/40 animate-pulse" strokeWidth={1.25} />
      </div>
      <p className="mt-6 text-sm text-[var(--text-secondary)] text-center max-w-xs">
        Select a player from the waiver radar to begin analysis
      </p>
    </div>
  );
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left px-2 py-1.5 rounded-md border text-[10px] font-mono-tactical uppercase tracking-wide transition',
        active
          ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/10 text-[var(--cyan)]'
          : 'border-[var(--border)] bg-white/[0.03] text-[var(--text-muted)] hover:border-white/20',
      )}
    >
      {label}
    </button>
  );
}

export default function ScoutingPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<ScoutingPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutingPlayer | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [idToName, setIdToName] = useState<Record<string, string>>({});
  const [rosterByLeague, setRosterByLeague] = useState<Record<string, string[]>>({});
  const [leagueNames, setLeagueNames] = useState<{ id: string; name: string }[]>([]);
  const [rookiesOnly, setRookiesOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const initPick = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [rankRes, { data: leagueData }, profileRes] = await Promise.all([
          fetch('/api/rankings/dynasty-enriched'),
          supabase.from('leagues').select('id, name').order('season', { ascending: false }),
          supabase.from('profiles').select('sleeper_user_id').single(),
        ]);

        if (cancelled) return;

        const raw = rankRes.ok ? ((await rankRes.json()) as DynastyPlayer2026[]) : [];
        const base: ScoutingPlayer[] = raw.map((r) => ({
          ...r,
          playerId: stablePlayerId(r),
        }));

        const leagueList = (leagueData ?? []) as { id: string; name: string }[];
        const ownerSid = profileRes.data?.sleeper_user_id ? String(profileRes.data.sleeper_user_id) : null;

        const rosterMap: Record<string, string[]> = {};
        await Promise.all(
          leagueList.map(async (lg) => {
            const { data: rows } = ownerSid
              ? await supabase.from('rosters').select('*').eq('league_id', lg.id).eq('owner_id', ownerSid)
              : await supabase.from('rosters').select('*').eq('league_id', lg.id).limit(1);
            const arr = (rows ?? []) as RostRow[];
            const yours = ownerSid
              ? arr.find((row) => String(row.owner_id) === ownerSid) ?? arr[0]
              : arr[0];
            if (yours?.players?.length) rosterMap[lg.id] = yours.players;
            else rosterMap[lg.id] = [];
          }),
        );

        const allIds = Array.from(new Set(Object.values(rosterMap).flat())).filter(Boolean).slice(0, 400);
        let pmap: Record<string, { full_name?: string }> = {};
        if (allIds.length) {
          const pr = await fetch(`/api/players?ids=${allIds.join(',')}`);
          if (pr.ok) pmap = await pr.json();
        }

        const namesForMap = base.map((p) => p.name).slice(0, 400);
        let nameToSleeper: Record<string, string> = {};
        try {
          const mr = await fetch('/api/players/map-names', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: namesForMap }),
          });
          if (mr.ok) {
            const j = (await mr.json()) as { mapping?: Record<string, string> };
            nameToSleeper = j.mapping ?? {};
          }
        } catch {
          /* ignore */
        }

        const merged = base.map((p) => ({
          ...p,
          sleeperId: nameToSleeper[p.name],
        }));

        const owned = new Set<string>();
        const i2n: Record<string, string> = {};
        for (const id of allIds) {
          const fn = pmap[id]?.full_name?.trim();
          if (fn) i2n[id] = fn;
        }
        for (const id of allIds) {
          if (id) owned.add(id);
        }

        if (cancelled) return;
        setPlayers(merged);
        setOwnedIds(owned);
        setIdToName(i2n);
        setRosterByLeague(rosterMap);
        setLeagueNames(leagueList);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount bootstrap only

  const leagueIds = useMemo(() => leagueNames.map((l) => l.id), [leagueNames]);

  const playerOwned = useCallback(
    (p: ScoutingPlayer): boolean => {
      if (p.sleeperId && ownedIds.has(p.sleeperId)) return true;
      const ln = p.name.toLowerCase();
      for (const id of Array.from(ownedIds)) {
        if ((idToName[id]?.toLowerCase() ?? '') === ln) return true;
      }
      return false;
    },
    [ownedIds, idToName],
  );

  const onRosterInLeague = useCallback(
    (leagueId: string, p: ScoutingPlayer): boolean => {
      const ids = rosterByLeague[leagueId] ?? [];
      if (p.sleeperId && ids.includes(p.sleeperId)) return true;
      const ln = p.name.toLowerCase();
      for (const rid of ids) {
        if ((idToName[rid]?.toLowerCase() ?? '') === ln) return true;
      }
      return false;
    },
    [rosterByLeague, idToName],
  );

  const faMeta = useCallback(
    (p: ScoutingPlayer) => {
      const y = leagueIds.length;
      if (!y) return { fa: 0, label: '—', allOwned: false };
      let fa = 0;
      for (const lid of leagueIds) {
        if (!onRosterInLeague(lid, p)) fa++;
      }
      const allOwned = fa === 0;
      return {
        fa,
        label: allOwned ? 'Owned' : `FA in ${fa}/${y} Lgs`,
        allOwned,
      };
    },
    [leagueIds, onRosterInLeague],
  );

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const leagueHit =
      q.length > 0 && leagueNames.some((l) => l.name.toLowerCase().includes(q));

    return players.filter((p) => {
      if (rookiesOnly && p.age > 23) return false;
      if (availableOnly && playerOwned(p)) return false;
      if (!q) return true;
      if (leagueHit) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [players, rookiesOnly, availableOnly, searchQuery, leagueNames, playerOwned]);

  const hiddenGems = useMemo(() => computeHiddenGems(filteredPlayers), [filteredPlayers]);

  useEffect(() => {
    if (loading || initPick.current) return;
    const first = hiddenGems[0];
    if (first) {
      setSelectedPlayer(first);
      initPick.current = true;
    }
  }, [loading, hiddenGems]);

  const gemSparklineData = (p: ScoutingPlayer): number[] => {
    const norm = normalizeKtcTo100(p.marketValue);
    const prior = clamp(norm * 0.88, 5, 95);
    const cur = norm;
    const proj = clamp(norm + (p.tfoScore - norm) * 0.35, 5, 98);
    return [prior, cur, proj];
  };

  const radarForSelected = useMemo((): RadarMetric[] => {
    if (!selectedPlayer) return [];
    const input = buildTfoInput(selectedPlayer);
    const fid = selectedPlayer.sleeperId ?? selectedPlayer.playerId;
    const boom = boomTrendLabel(selectedPlayer.tfoVerdict, selectedPlayer.tfoScore) === 'boom' ? 'boom' : 'bust';
    return getRadarMetrics(selectedPlayer.position, fid, undefined, boom, { tfoInput: input });
  }, [selectedPlayer]);

  const RADAR_SZ = 180;
  const RADAR_CX = RADAR_SZ / 2;
  const RADAR_CY = RADAR_SZ / 2 - 4;
  const RADAR_R = 62;
  const rings = [0.33, 0.66, 1];

  const normMarketSel = selectedPlayer ? normalizeKtcTo100(selectedPlayer.marketValue) : 0;
  const deltaRating = selectedPlayer ? selectedPlayer.tfoScore - normMarketSel : 0;

  return (
    <AppBackground>
      <div className="min-h-screen text-[var(--text-primary)] pb-24 lg:pb-8" style={{ background: '#060910' }}>
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-6">
          <header className="mb-8">
            <h1
              className="uppercase tracking-[0.05em] font-black leading-tight"
              style={{
                fontFamily: 'var(--font-display), Bebas Neue, Impact, sans-serif',
                fontSize: 'clamp(28px, 4vw, 48px)',
                background: 'linear-gradient(180deg, #ffffff 0%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NFL Scouting Terminal
            </h1>
            <p
              className="mt-2 text-[13px] text-[#22D3EE] tracking-[0.2em] uppercase font-mono-tactical"
              style={F_MONO}
            >
              Process intelligence
            </p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-mono-tactical">Loading scouting intel…</span>
            </div>
          ) : (
            <div className="flex flex-col xl:flex-row gap-4 items-stretch">
              {/* Left — Waiver Radar */}
              <aside className="glass-panel shrink-0 p-4 flex flex-col gap-4 overflow-hidden w-full xl:w-[280px] xl:max-w-[280px]">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-mono-tactical uppercase tracking-[0.18em] text-white">
                    Waiver Radar
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((o) => !o)}
                    className="p-1.5 rounded-md border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/5"
                    aria-label="Toggle filters"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>

                {filtersOpen && (
                  <div className="flex flex-col gap-2">
                    <Toggle
                      active={availableOnly}
                      onClick={() => setAvailableOnly((x) => !x)}
                      label="Available in my leagues"
                    />
                    <Toggle active={rookiesOnly} onClick={() => setRookiesOnly((x) => !x)} label="Rookies only" />
                  </div>
                )}

                <input
                  type="search"
                  placeholder="SEARCH PLAYER OR LEAGUE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-[#94A3B8] placeholder:text-[#94A3B8]/70 outline-none focus:border-[var(--cyan)]/40 backdrop-blur-md"
                  style={F_MONO}
                />

                <div>
                  <p className="text-[10px] font-mono-tactical uppercase tracking-[0.16em] text-[#64748B] mb-3">
                    Top hidden gems
                  </p>
                  <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {hiddenGems.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">No gems match filters.</p>
                    ) : (
                      hiddenGems.map((g) => {
                        const { label, allOwned } = faMeta(g);
                        const spark = gemSparklineData(g);
                        const boom = boomTrendLabel(g.tfoVerdict, g.tfoScore) === 'boom';
                        return (
                          <button
                            key={g.playerId}
                            type="button"
                            onClick={() => setSelectedPlayer(g)}
                            className={clsx(
                              'text-left rounded-lg border p-2.5 transition hover:border-[var(--cyan)]/35',
                              selectedPlayer?.playerId === g.playerId
                                ? 'border-[var(--cyan)]/50 bg-[var(--cyan)]/8'
                                : 'border-white/10 bg-white/[0.02]',
                            )}
                          >
                            <div className="flex justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate text-sm">{g.name}</p>
                                <p className="text-[11px] text-[#22D3EE] truncate" style={F_MONO}>
                                  {g.position} · {g.team}
                                </p>
                              </div>
                              <SparklineGraph data={spark} width={40} height={20} />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span
                                className={clsx(
                                  'text-[10px] font-mono-tactical px-1.5 py-0.5 rounded border',
                                  allOwned
                                    ? 'border-white/15 text-[#64748B]'
                                    : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
                                )}
                              >
                                {label}
                              </span>
                              <span
                                className={clsx(
                                  'flex items-center gap-0.5 text-[10px] font-mono-tactical font-bold',
                                  boom ? 'text-emerald-400' : 'text-red-400',
                                )}
                              >
                                {boom ? (
                                  <>
                                    BOOM <TrendingUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    BUST <TrendingDown className="w-3 h-3" />
                                  </>
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>

              {/* Center — Deep Dive */}
              <main className="glass-panel flex-1 min-w-0 p-5 flex flex-col">
                <h2 className="text-xs font-mono-tactical uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">
                  Player Deep Dive
                  {selectedPlayer && (
                    <span className="text-white ml-2">(Selected: {selectedPlayer.name})</span>
                  )}
                </h2>

                {!selectedPlayer ? (
                  <ReticleIdle />
                ) : (
                  <>
                    <section className="border-b border-white/10 pb-6 mb-6">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        {selectedPlayer.sleeperId ? (
                          <Image
                            src={getPlayerPhotoUrl(selectedPlayer.sleeperId)}
                            alt=""
                            width={48}
                            height={48}
                            className="rounded-full border border-white/15 object-cover bg-black/40"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-sm font-bold text-white/70"
                            style={{ background: 'rgba(34,211,238,0.12)' }}
                          >
                            {selectedPlayer.firstName?.[0]}
                            {selectedPlayer.lastName?.[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-bold text-white truncate">{selectedPlayer.name}</p>
                          <p className="text-[12px] text-[var(--text-muted)]" style={F_MONO}>
                            {selectedPlayer.team} · {selectedPlayer.position}
                          </p>
                        </div>
                        {(() => {
                          const { label, allOwned } = faMeta(selectedPlayer);
                          return (
                            <span
                              className={clsx(
                                'text-[11px] font-mono-tactical px-2 py-1 rounded-full border shrink-0',
                                allOwned
                                  ? 'border-white/15 text-[#64748B]'
                                  : 'border-emerald-500/35 text-emerald-400 bg-emerald-500/10',
                              )}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </div>

                      <p
                        className="text-[10px] font-mono-tactical uppercase tracking-[0.14em] text-[#94A3B8] mb-2"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Predictive trajectory
                      </p>
                      <TrajectoryChart p={selectedPlayer} normalizedMarket={normMarketSel} />
                    </section>

                    <section>
                      <h3 className="text-sm uppercase tracking-[0.12em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                        Heatmap &amp; scheme fit
                      </h3>
                      <p className="text-[11px] text-[#64748B] font-mono-tactical mt-1 mb-4 uppercase tracking-wide">
                        Separator hotspots
                      </p>
                      <div className="flex flex-col lg:flex-row gap-6">
                        <RouteHeatmap
                          position={selectedPlayer.position}
                          team={selectedPlayer.team}
                          wrDeployment={selectedPlayer.tfoWrDeployment}
                        />
                        <div className="flex-1 rounded-lg border border-white/10 bg-black/25 p-4 min-h-[160px]">
                          <p className="text-[10px] font-mono-tactical text-[#22D3EE] mb-2">AI-SUMMARY:</p>
                          <p className="text-[11px] font-bold text-white uppercase tracking-wide mb-2">
                            True talent delta:
                          </p>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                            {selectedPlayer.tfoReasoning?.slice(0, 280)}
                            {(selectedPlayer.tfoReasoning?.length ?? 0) > 280 ? '…' : ''}
                          </p>
                          <p className="text-[12px] font-mono-tactical">
                            Value is{' '}
                            <span
                              className={clsx(
                                'font-bold',
                                deltaRating > 10
                                  ? 'text-emerald-400'
                                  : deltaRating < -10
                                    ? 'text-red-400'
                                    : 'text-slate-400',
                              )}
                            >
                              {deltaRating > 10 ? 'UNDERRATED' : deltaRating < -10 ? 'OVERRATED' : 'FAIRLY RATED'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </main>

              {/* Right — Efficiency */}
              <aside className="glass-panel shrink-0 p-4 flex flex-col w-full xl:w-[320px] xl:max-w-[320px]">
                <h2 className="text-xs font-mono-tactical uppercase tracking-[0.18em] text-[#94A3B8] mb-4">
                  WR Efficiency Matrix
                </h2>

                {!selectedPlayer ? (
                  <p className="text-xs text-[var(--text-muted)]">Select a player.</p>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <svg width={RADAR_SZ} height={RADAR_SZ} viewBox={`0 0 ${RADAR_SZ} ${RADAR_SZ}`}>
                        {rings.map((t) => (
                          <polygon
                            key={t}
                            points={radarPolygon(
                              radarForSelected.map(() => t),
                              RADAR_CX,
                              RADAR_CY,
                              RADAR_R,
                            )}
                            fill="none"
                            stroke="rgba(148,163,184,0.18)"
                            strokeWidth={1}
                          />
                        ))}
                        {radarForSelected.map((_, i) => {
                          const angle = axisAngle(i, radarForSelected.length);
                          const x2 = RADAR_CX + RADAR_R * Math.cos(angle);
                          const y2 = RADAR_CY + RADAR_R * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1={RADAR_CX}
                              y1={RADAR_CY}
                              x2={x2}
                              y2={y2}
                              stroke="rgba(148,163,184,0.25)"
                              strokeWidth={1}
                            />
                          );
                        })}
                        <polygon
                          points={radarPolygon(
                            radarForSelected.map((m) => m.value),
                            RADAR_CX,
                            RADAR_CY,
                            RADAR_R,
                          )}
                          fill="rgba(34,211,238,0.14)"
                          stroke="#22D3EE"
                          strokeWidth={1.5}
                        />
                        {radarForSelected.map((m, i) => {
                          const angle = axisAngle(i, radarForSelected.length);
                          const lx = RADAR_CX + (RADAR_R + 18) * Math.cos(angle);
                          const ly = RADAR_CY + (RADAR_R + 18) * Math.sin(angle);
                          return (
                            <text
                              key={m.label}
                              x={lx}
                              y={ly}
                              fill="#94A3B8"
                              fontSize={10}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={F_MONO}
                            >
                              {m.label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    <SeparationBars
                      playerId={selectedPlayer.sleeperId ?? selectedPlayer.playerId}
                      tfoScore={selectedPlayer.tfoScore}
                    />

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {(() => {
                        const rz = Math.round(38 + seededUnit(selectedPlayer.playerId, 77) * 52);
                        const rzColor =
                          rz > 60 ? 'text-emerald-400 border-emerald-500/30' : rz > 40 ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30';
                        const vs = Math.round(selectedPlayer.tfoScore - 50);
                        const vsColor = vs >= 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30';
                        return (
                          <>
                            <div className={clsx('rounded-lg border p-3 bg-white/[0.02]', rzColor)}>
                              <p className="text-[9px] font-mono-tactical uppercase text-[#64748B] mb-1">
                                Usage delta
                              </p>
                              <p className="text-xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
                                {rz}%
                              </p>
                              <p className="text-[10px] text-[#64748B] font-mono-tactical mt-1">Red Zone Targets</p>
                            </div>
                            <div className={clsx('rounded-lg border p-3 bg-white/[0.02]', vsColor)}>
                              <p className="text-[9px] font-mono-tactical uppercase text-[#64748B] mb-1">
                                Usage delta
                              </p>
                              <p className="text-xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
                                {vs >= 0 ? '+' : ''}
                                {vs}%
                              </p>
                              <p className="text-[10px] text-[#64748B] font-mono-tactical mt-1">vs Position Avg</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
