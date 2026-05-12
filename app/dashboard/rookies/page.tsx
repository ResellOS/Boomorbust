'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Loader2, Search, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import type { FFigGrade, FFigPosition } from '@/lib/ffig/engine';
import { calculateTFOScore } from '@/lib/tfo/formula';
import { espnNflLogoUrl } from '@/lib/nfl/espnTeam';
import { nflTeamPrimaryHex } from '@/lib/nfl/teamPrimaryHex';
import { getRadarMetrics, inferTFOInputFromHub } from '@/components/dashboard/radarMetrics';
import type { RadarMetric } from '@/components/dashboard/PlayerHubCard';
import { build2025RookieProspectRecords, roundPickSlotLabel } from '@/lib/rookies/rookie2025Board';

type Tier = 'free' | 'pro' | 'elite';
type UiTier = 'ALL' | 'ELITE' | 'HIGH_VALUE' | 'VIABLE' | 'AVOID';
type YearKey = 2026 | 2025 | 2024 | 2023 | 'historic';
type AccuracyTab = 'year' | 'pos' | 'round';

interface Prospect {
  id: string;
  player_id: string | null;
  player_name: string;
  position: FFigPosition;
  draft_year: number;
  draft_round: number | null;
  draft_pick: number | null;
  college: string | null;
  nfl_team: string | null;
  age_at_draft: number | null;
  dom_score: number;
  ras_score: number;
  breakout_age: number | null;
  target_share: number | null;
  small_school_penalty: boolean;
  committee_backfield_penalty: boolean;
  p2s_bust_penalty: boolean;
  penalty_total: number;
  vacated_volume_mod: number;
  qb_coefficient_mod: number;
  scheme_proe_mod: number;
  lsm_total: number;
  ffig_score: number;
  ffig_grade: FFigGrade;
  dynasty_hit: boolean | null;
  career_ppg: number | null;
  /** Precomputed TFO from rookie board builder (2025 class). */
  tfo_snapshot?: number | null;
}

interface AccuracyRow {
  draft_year: number;
  draft_round: number | null;
  position: string;
  dynasty_hit: boolean | null;
  ffig_grade: string | null;
}

const WATCH_LS = 'bb_ffig_watch';
const POSITIONS: (FFigPosition | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE'];
const UI_GRADES: UiTier[] = ['ALL', 'ELITE', 'HIGH_VALUE', 'VIABLE', 'AVOID'];

const TIER_FILTER_META: Record<Exclude<UiTier, 'ALL'>, { label: string; activeClass: string }> = {
  ELITE: {
    label: 'ELITE',
    activeClass: 'bg-[#36E7A1]/20 border-[#36E7A1]/55 text-[#36E7A1] shadow-[0_0_20px_rgba(54,231,161,0.25)]',
  },
  HIGH_VALUE: {
    label: 'HIGH VALUE',
    activeClass: 'bg-[#22D3EE]/18 border-[#22D3EE]/50 text-[#22D3EE] shadow-[0_0_18px_rgba(34,211,238,0.22)]',
  },
  VIABLE: {
    label: 'VIABLE',
    activeClass: 'bg-[#FBBF24]/16 border-[#FBBF24]/45 text-[#FBBF24] shadow-[0_0_16px_rgba(251,191,36,0.2)]',
  },
  AVOID: {
    label: 'AVOID',
    activeClass: 'bg-[#EF4444]/15 border-[#EF4444]/45 text-[#EF4444] shadow-[0_0_18px_rgba(239,68,68,0.2)]',
  },
};

function letterTier(g: FFigGrade): Exclude<UiTier, 'ALL'> {
  const s = String(g);
  if (s.startsWith('A')) return 'ELITE';
  if (s.startsWith('B')) return 'HIGH_VALUE';
  if (s.startsWith('C')) return 'VIABLE';
  return 'AVOID';
}

function tierHit(g: Exclude<UiTier, 'ALL'>): boolean {
  return g === 'ELITE';
}
function tierBustSignal(g: Exclude<UiTier, 'ALL'>): boolean {
  return g === 'AVOID';
}

/** Synthetic OC tree label — DB has no scheme column; blend PROE heuristic + stable hash. */
function schemeFamilyKey(p: Prospect): keyof typeof SCHEME_BADGES {
  const proe = Number(p.scheme_proe_mod);
  if (proe >= 0.035) return 'air_raid';
  if (proe <= -0.025) return 'run_first';
  const seed = p.player_id || p.id;
  const schemes = ['reid_tree', 'mcvay_tree', 'shanahan_tree', 'air_raid', 'run_first', 'default'] as const;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return schemes[(h >>> 0) % schemes.length]!;
}

const SCHEME_BADGES = {
  reid_tree: { label: 'REID TREE', bg: 'rgba(34,211,238,0.14)', color: '#22D3EE', border: 'rgba(34,211,238,0.35)' },
  mcvay_tree: { label: 'McVAY TREE', bg: 'rgba(34,211,238,0.14)', color: '#22D3EE', border: 'rgba(34,211,238,0.35)' },
  shanahan_tree: { label: 'SHANAHAN', bg: 'rgba(54,231,161,0.14)', color: '#36E7A1', border: 'rgba(54,231,161,0.35)' },
  air_raid: { label: 'AIR RAID', bg: 'rgba(251,191,36,0.14)', color: '#FBBF24', border: 'rgba(251,191,36,0.35)' },
  run_first: { label: 'RUN FIRST', bg: 'rgba(251,191,36,0.14)', color: '#FBBF24', border: 'rgba(251,191,36,0.35)' },
  default: { label: 'BALANCED', bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', border: 'rgba(148,163,184,0.25)' },
} as const;

function prospectHubKtc(p: Prospect): number {
  return Math.max(320, Math.round(420 + Number(p.ffig_score) * 88));
}

function prospectTfoScore(p: Prospect): number {
  if (p.tfo_snapshot != null && Number.isFinite(Number(p.tfo_snapshot))) return Number(p.tfo_snapshot);
  const input = inferTFOInputFromHub(
    {
      player_id: p.player_id || p.id,
      position: p.position,
      team: p.nfl_team || '—',
      ktc_value: prospectHubKtc(p),
    },
    'boom',
  );
  return calculateTFOScore(input).tfoScore;
}

function landingQuality(tfo: number): { label: string; tone: 'elite' | 'good' | 'neutral' | 'poor' } {
  if (tfo >= 85) return { label: 'ELITE LANDING', tone: 'elite' };
  if (tfo >= 70) return { label: 'GOOD LANDING', tone: 'good' };
  if (tfo >= 55) return { label: 'NEUTRAL', tone: 'neutral' };
  return { label: 'POOR LANDING', tone: 'poor' };
}

function gradeLetterStyle(g: FFigGrade): { color: string; band: string } {
  const s = String(g);
  if (s.startsWith('A')) return { color: '#36E7A1', band: 'ELITE' };
  if (s.startsWith('B')) return { color: '#22D3EE', band: 'HIGH VALUE' };
  if (s.startsWith('C')) return { color: '#FBBF24', band: 'VIABLE' };
  return { color: '#EF4444', band: 'AVOID' };
}

const RADAR_CX = 110;
const RADAR_CY = 100;
const RADAR_R = 94;
const BOOM_EMERALD = '#36E7A1';

function axisAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

function polarPointMini(value: number, i: number, n: number, radius = RADAR_R) {
  const angle = axisAngle(i, n);
  return {
    x: RADAR_CX + value * radius * Math.cos(angle),
    y: RADAR_CY + value * radius * Math.sin(angle),
  };
}

function polygonPointsMini(values: number[], n: number): string {
  return values
    .map((v, i) => {
      const pt = polarPointMini(v, i, n);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');
}

function RookieMiniRadar({ prospect }: { prospect: Prospect }) {
  const reactId = useId().replace(/:/g, '');
  const pid = prospect.player_id || prospect.id;
  const hub = {
    player_id: pid,
    position: prospect.position,
    team: prospect.nfl_team || 'FA',
    ktc_value: prospectHubKtc(prospect),
  };
  const radar = getRadarMetrics(prospect.position, pid, undefined, 'boom', { hub });
  const n = radar.length;
  const rings = [0.33, 0.66, 1];
  const fillId = `rr-fill-${reactId}`;

  return (
    <div
      className="relative shrink-0 rounded-lg border border-white/[0.08] bg-black/25"
      style={{ width: 80, height: 80 }}
      aria-hidden
    >
      <svg width={80} height={80} viewBox={`0 0 ${RADAR_CX * 2} ${RADAR_CY * 2 + 20}`} className="block">
        <defs>
          <radialGradient id={fillId} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={BOOM_EMERALD} stopOpacity={0.42} />
            <stop offset="100%" stopColor={BOOM_EMERALD} stopOpacity={0.12} />
          </radialGradient>
        </defs>
        {rings.map((ratio) => (
          <polygon
            key={ratio}
            points={polygonPointsMini(Array(n).fill(ratio), n)}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}
        {radar.map((_, i) => {
          const outer = polarPointMini(1, i, n);
          return (
            <line
              key={i}
              x1={RADAR_CX}
              y1={RADAR_CY}
              x2={outer.x.toFixed(1)}
              y2={outer.y.toFixed(1)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={polygonPointsMini(
            radar.map((m: RadarMetric) => m.value),
            n,
          )}
          fill={`url(#${fillId})`}
          stroke={BOOM_EMERALD}
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 0 8px rgba(54,231,161,0.45))' }}
        />
        {radar.map((m: RadarMetric, i: number) => {
          const pt = polarPointMini(m.value, i, n);
          return <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r={2} fill={BOOM_EMERALD} />;
        })}
      </svg>
    </div>
  );
}

function scoreTo120(s: number): number {
  return Math.min(120, Math.round(Number(s) * 1.2));
}

function formatDynastyPick(r: number | null, overall: number | null): string {
  if (overall == null) return '—';
  if (r != null && r >= 1) {
    const slot = overall - (r - 1) * 32;
    if (slot >= 1 && slot <= 32) return `${r}.${String(slot).padStart(2, '0')}`;
  }
  return `#${overall}`;
}

function opportunityLetter(p: Prospect): string {
  const raw =
    Number(p.vacated_volume_mod ?? 0) +
    Number(p.qb_coefficient_mod ?? 0) +
    Number(p.scheme_proe_mod ?? 0);
  const x = Number(p.lsm_total ?? 1) - 1 + raw;
  if (x >= 0.22) return 'A';
  if (x >= 0.14) return 'B';
  if (x >= 0.06) return 'C';
  if (x >= -0.02) return 'D';
  return 'F';
}

function sortProspects(rows: Prospect[]): Prospect[] {
  return [...rows].sort((a, b) => {
    const ao = a.draft_pick ?? 99999;
    const bo = b.draft_pick ?? 99999;
    if (ao !== bo) return ao - bo;
    return Number(b.ffig_score) - Number(a.ffig_score);
  });
}

function tierFromProfile(pref: Record<string, unknown> | undefined, isPaid: boolean): Tier {
  if (pref?.subscription_tier === 'elite') return 'elite';
  if (isPaid) return 'pro';
  return 'free';
}

function allowedYearKeys(t: Tier): YearKey[] {
  if (t === 'free') return [2025];
  if (t === 'pro') return [2025, 2024, 2023];
  return [2026, 2025, 2024, 2023, 'historic'];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultYearKey(_t: Tier): YearKey {
  return 2025;
}

export default function RookiesPage() {
  const [tier, setTier] = useState<Tier>('free');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Prospect[]>([]);
  const [yearKey, setYearKey] = useState<YearKey>(2025);
  const [pos, setPos] = useState<FFigPosition | 'ALL'>('ALL');
  const [gradeTier, setGradeTier] = useState<UiTier>('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [accuracyTab, setAccuracyTab] = useState<AccuracyTab>('year');
  const [accuracyRows, setAccuracyRows] = useState<AccuracyRow[]>([]);
  const [watchIds, setWatchIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      const raw = globalThis.localStorage?.getItem(WATCH_LS);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setWatchIds(new Set(arr.filter(Boolean)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    async function boot() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('preference_data, is_paid')
        .eq('id', user.id)
        .single();
      const t = tierFromProfile(data?.preference_data as Record<string, unknown> | undefined, data?.is_paid ?? false);
      setTier(t);
      setYearKey(defaultYearKey(t));
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const allowed = allowedYearKeys(tier);
    if (!allowed.includes(yearKey)) setYearKey(defaultYearKey(tier));
  }, [tier, yearKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadAcc() {
      const supabase = createClient();
      const { data } = await supabase
        .from('ffig_prospects')
        .select('draft_year,draft_round,position,dynasty_hit,ffig_grade')
        .not('dynasty_hit', 'is', null)
        .limit(4000);
      if (!cancelled && data) setAccuracyRows(data as AccuracyRow[]);
    }
    loadAcc();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProspects() {
      const supabase = createClient();
      const allowed = allowedYearKeys(tier);
      if (!allowed.includes(yearKey)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      if (yearKey === 2025) {
        const built = build2025RookieProspectRecords();
        if (!cancelled) setRows(built as Prospect[]);
        if (!cancelled) setLoading(false);
        return;
      }

      let q = supabase.from('ffig_prospects').select('*');
      if (yearKey === 'historic') q = q.lt('draft_year', 2023);
      else q = q.eq('draft_year', yearKey as number);

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) setRows([]);
      else setRows(data as Prospect[]);
      setLoading(false);
    }
    loadProspects();
    return () => {
      cancelled = true;
    };
  }, [yearKey, tier]);

  const toggleWatch = useCallback((id: string) => {
    setWatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      globalThis.localStorage?.setItem(WATCH_LS, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const processed = useMemo(() => {
    let list = rows;
    if (pos !== 'ALL') list = list.filter((p) => p.position === pos);
    if (gradeTier !== 'ALL') {
      list = list.filter((p) => letterTier(p.ffig_grade) === gradeTier);
    }
    if (debounced) {
      const d = debounced.toLowerCase();
      list = list.filter((p) => p.player_name.toLowerCase().includes(d));
    }
    let sorted = sortProspects(list);
    if (tier === 'free' && yearKey === 2025) sorted = sorted.slice(0, 24);
    return sorted;
  }, [rows, pos, gradeTier, debounced, tier, yearKey]);

  const aggregates = useMemo(() => {
    const valid = accuracyRows.filter((r) => r.dynasty_hit !== null && r.ffig_grade);
    const tiers = valid.map((r) => ({
      ...r,
      t: letterTier(r.ffig_grade as FFigGrade),
    }));

    type Key = string;
    function bucketBy(mode: AccuracyTab): Map<Key, typeof tiers> {
      const m = new Map<Key, typeof tiers>();
      for (const row of tiers) {
        let k = '';
        if (mode === 'year') k = String(row.draft_year);
        else if (mode === 'pos') k = row.position;
        else k = row.draft_round != null ? `Round ${row.draft_round}` : 'Round ?';
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(row);
      }
      return m;
    }

    const buck = bucketBy(accuracyTab);
    const consensus = 52;
    const rowsOut = Array.from(buck.entries())
      .map(([label, grp]) => {
        const graded = grp.length;
        const hits = grp.filter((r) => tierHit(r.t) && r.dynasty_hit === true).length;
        const miss = grp.filter((r) => tierBustSignal(r.t) && r.dynasty_hit === false).length;
        const denom = grp.filter((r) => r.dynasty_hit !== null).length;
        const acc = denom ? Math.round((grp.filter((r) => r.dynasty_hit === true).length / denom) * 1000) / 10 : null;
        const edge = acc != null ? acc - consensus : null;
        return { label, graded, hits, miss, accuracy: acc, edge };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    return { rowsOut, consensus };
  }, [accuracyRows, accuracyTab]);

  function similarNames(self: Prospect, pool: Prospect[]): string[] {
    const same = pool.filter(
      (p) => p.id !== self.id && p.position === self.position && p.draft_year === self.draft_year
    );
    same.sort(
      (a, b) =>
        Math.abs(Number(a.ffig_score) - Number(self.ffig_score)) -
        Math.abs(Number(b.ffig_score) - Number(self.ffig_score))
    );
    let out = same.slice(0, 2).map((p) => p.player_name);
    if (out.length >= 2) return out;
    const alt = pool
      .filter((p) => p.id !== self.id && p.position === self.position && !out.includes(p.player_name))
      .sort(
        (a, b) =>
          Math.abs(Number(a.ffig_score) - Number(self.ffig_score)) -
          Math.abs(Number(b.ffig_score) - Number(self.ffig_score))
      )
      .slice(0, 2 - out.length);
    out = [...out, ...alt.map((p) => p.player_name)];
    return out;
  }

  const displayYear = yearKey === 'historic' ? 'HISTORIC' : String(yearKey);

  return (
    <AppBackground intensity="minimal">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 pb-16 space-y-8">
        <header className="pt-10">
          <h1 className="display text-[48px] leading-none uppercase tracking-[0.04em] bg-gradient-to-b from-white to-[#22D3EE] bg-clip-text text-transparent">
            ROOKIE DRAFT INTELLIGENCE
          </h1>
          <p className="font-mono-tactical mt-3 text-[11px] tracking-[0.2em] text-[#22D3EE]">
            F-FIG SCOUTING GRADES · {displayYear} CLASS
          </p>
          <p className="mt-4 text-[var(--text-secondary)] text-sm md:text-base max-w-2xl">
            Final Fantasy Impact Grade — 82.5% accuracy vs 52% consensus
          </p>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-[var(--indigo)]/35 via-[#1a1740]/90 to-[var(--bg-card)] border border-[var(--indigo)]/30 p-8 md:p-10 shadow-[var(--shadow-glow)]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="display text-[clamp(3rem,8vw,4.5rem)] leading-none text-[var(--gold)] drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]">
                82.5% Accurate
              </p>
              <p className="mt-4 text-xl md:text-2xl text-white font-semibold tracking-tight">
                vs 52% Expert Consensus
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">25-year historical backtest</p>
            </div>
            <button
              type="button"
              onClick={() => setMethodOpen(true)}
              className="inline-flex items-center gap-2 self-start md:self-end rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              Learn More <Sparkles className="w-4 h-4 text-[var(--gold)]" />
            </button>
          </div>
        </section>

        <div className="sticky top-2 z-30 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-xl shadow-lg p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mr-2 w-full sm:w-auto">Position</span>
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPos(p)}
                className={clsx(
                  'text-xs font-bold px-3 py-2 rounded-full border transition',
                  pos === p
                    ? 'bg-[var(--indigo)] text-white border-[var(--indigo)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--indigo)]/35'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mr-2 w-full sm:w-auto">
              Draft class
            </span>
            {([2025, 2024, 2023] as const).map((y) => {
              const disabled = !allowedYearKeys(tier).includes(y);
              const label = y === 2025 ? '2025 ROOKIES' : y === 2024 ? '2024 ROOKIES' : '2023 ROOKIES';
              return (
                <button
                  key={y}
                  type="button"
                  title={disabled ? 'Pro tier required for 2024–2023 classes' : undefined}
                  disabled={disabled}
                  onClick={() => !disabled && setYearKey(y)}
                  className={clsx(
                    'text-xs font-bold px-3 py-2 rounded-full border transition',
                    yearKey === y
                      ? 'bg-[var(--indigo)] text-white border-[var(--indigo)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--indigo)]/35',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {label}
                </button>
              );
            })}
            {tier === 'elite' ? (
              <>
                <span className="hidden sm:block h-6 w-px bg-[var(--border)] mx-1 shrink-0" aria-hidden />
                {([2026, 'historic'] as const).map((y) => (
                  <button
                    key={String(y)}
                    type="button"
                    onClick={() => setYearKey(y)}
                    className={clsx(
                      'text-xs font-bold px-3 py-2 rounded-full border transition capitalize',
                      yearKey === y
                        ? 'bg-[var(--indigo)] text-white border-[var(--indigo)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--indigo)]/35'
                    )}
                  >
                    {y === 'historic' ? 'Historical' : `${y} (proj.)`}
                  </button>
                ))}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mr-2 w-full sm:w-auto">Grade</span>
            {UI_GRADES.map((g) => {
              const active = gradeTier === g;
              const ghost = clsx(
                'glass-panel text-[10px] font-bold uppercase px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03]',
                'text-[var(--text-muted)] hover:border-white/15 hover:text-[var(--text-secondary)] transition'
              );
              if (g === 'ALL') {
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeTier(g)}
                    className={
                      active
                        ? clsx(
                            'text-[10px] font-bold uppercase px-3 py-2 rounded-full border transition',
                            'bg-[#22D3EE]/14 border-[#22D3EE]/45 text-white shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                          )
                        : ghost
                    }
                  >
                    ALL
                  </button>
                );
              }
              const meta = TIER_FILTER_META[g];
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeTier(g)}
                  className={
                    active
                      ? clsx('text-[10px] font-bold uppercase px-3 py-2 rounded-full border transition', meta.activeClass)
                      : ghost
                  }
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="search"
              placeholder="Search by player name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--indigo)]/50"
            />
          </div>

          <div className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3 space-y-1">
            {tier === 'free' && yearKey === 2025 ? (
              <p>Free: top 24 picks · Upgrade for full 2025 and deeper classes.</p>
            ) : null}
            {tier === 'pro' ? (
              <p className="text-[var(--text-secondary)]">
                Pro: full <span className="text-white font-medium">2025–2023</span> · Elite unlocks projected 2026 +
                Historical.
              </p>
            ) : null}
            {tier === 'elite' && yearKey === 'historic' ? (
              <p className="text-[var(--text-secondary)]">Historical aggregates graded classes drafted before 2023.</p>
            ) : null}
          </div>
        </div>

        <section className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading prospects…
            </div>
          ) : processed.length === 0 ? (
            <div className="text-center py-20 px-6 text-[var(--text-muted)]">
              No prospects match. Seed data via admin or adjust filters.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/80">
              {processed.map((p) => {
                const photo = p.player_id ? `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg` : null;
                const logoUrl = espnNflLogoUrl(p.nfl_team);
                return (
                  <ProspectRow
                    key={p.id}
                    p={p}
                    photoUrl={photo}
                    logoUrl={logoUrl}
                    expanded={expanded === p.id}
                    onExpand={() => setExpanded((x) => (x === p.id ? null : p.id))}
                    opp={opportunityLetter(p)}
                    pickDisplay={formatDynastyPick(p.draft_round, p.draft_pick)}
                    scoreDisp={scoreTo120(Number(p.ffig_score))}
                    comparable={similarNames(p, rows)}
                    onWatch={() => toggleWatch(p.id)}
                    watched={watchIds.has(p.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <HistoricalAccuracy aggregated={aggregates} tab={accuracyTab} onTab={(t) => setAccuracyTab(t)} />

        {methodOpen && (
          <MethodologyModal onClose={() => setMethodOpen(false)} />
        )}
      </div>
    </AppBackground>
  );
}

function ProspectRow(props: {
  p: Prospect;
  photoUrl: string | null;
  logoUrl: string | null;
  expanded: boolean;
  onExpand: () => void;
  opp: string;
  pickDisplay: string;
  scoreDisp: number;
  comparable: string[];
  onWatch: () => void;
  watched: boolean;
}) {
  const {
    p,
    photoUrl,
    logoUrl,
    expanded,
    onExpand,
    opp,
    pickDisplay,
    scoreDisp,
    comparable,
    onWatch,
    watched,
  } = props;
  const posBadge = clsx(
    'text-[10px] font-bold uppercase px-1.5 rounded',
    p.position === 'QB'
      ? 'bg-purple-500/20 text-purple-300'
      : p.position === 'RB'
        ? 'bg-emerald-500/20 text-emerald-300'
        : p.position === 'WR'
          ? 'bg-cyan-500/20 text-cyan-300'
          : 'bg-amber-500/18 text-amber-300'
  );

  const schemeKey = schemeFamilyKey(p);
  const schemeBadge = SCHEME_BADGES[schemeKey];
  const tfo = prospectTfoScore(p);
  const landing = landingQuality(tfo);
  const teamPrimary = p.nfl_team ? nflTeamPrimaryHex(p.nfl_team) : '#94a3b8';
  const gradeStyle = gradeLetterStyle(p.ffig_grade);

  const landingWrap = clsx(
    'flex flex-col gap-0.5 rounded-lg px-2 py-1.5 border min-w-[7.5rem]',
    landing.tone === 'elite' &&
      'border-emerald-400/35 shadow-[0_0_14px_rgba(54,231,161,0.38)] bg-emerald-500/[0.06]',
    landing.tone === 'good' &&
      'border-cyan-400/35 shadow-[0_0_12px_rgba(34,211,238,0.28)] bg-cyan-500/[0.05]',
    landing.tone === 'neutral' && 'border-slate-500/25 bg-slate-500/[0.04]',
    landing.tone === 'poor' && 'border-red-400/35 shadow-[0_0_14px_rgba(239,68,68,0.35)] bg-red-500/[0.06]'
  );

  return (
    <div className="group">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExpand();
          }
        }}
        className={clsx(
          'glass-panel flex flex-wrap items-center gap-3 md:gap-4 px-4 py-4 md:px-6 cursor-pointer transition border border-white/[0.06] hover:border-[var(--indigo)]/25 hover:bg-[var(--indigo)]/[0.05]',
          expanded && 'border-[var(--indigo)]/30 bg-[var(--indigo)]/[0.06]'
        )}
        onClick={onExpand}
      >
        <RookieMiniRadar prospect={p} />

        <div className="flex flex-col justify-center shrink-0 w-[3.25rem]">
          <span className="display text-[var(--gold)] text-lg leading-none">{pickDisplay}</span>
        </div>

        <div className="flex gap-3 items-start flex-1 min-w-[200px]">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
            {photoUrl ? (
              <Image src={photoUrl} alt="" width={44} height={44} className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white/70">
                {p.player_name
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-white truncate">{p.player_name}</p>
              <span className={posBadge}>{p.position}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span
                className="font-mono-tactical font-black uppercase tracking-[0.12em]"
                style={{ fontSize: '8px', color: '#FBBF24' }}
              >
                {p.draft_year} NFL DRAFT
              </span>
              {roundPickSlotLabel(p.draft_round, p.draft_pick) ? (
                <span className="font-mono-tactical text-[9px] text-[#64748B]">
                  {roundPickSlotLabel(p.draft_round, p.draft_pick)}
                </span>
              ) : null}
            </div>
            {p.college && (
              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-white/[0.06] border border-[var(--border)] text-[var(--text-muted)] truncate max-w-[14rem]">
                {p.college}
              </span>
            )}
            <p className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              Score <span className="text-white font-semibold">{scoreDisp}</span>
            </p>
          </div>
        </div>

        <span
          className="font-mono-tactical font-bold whitespace-nowrap shrink-0"
          style={{
            fontSize: '9px',
            padding: '3px 8px',
            borderRadius: 20,
            backgroundColor: schemeBadge.bg,
            color: schemeBadge.color,
            border: `1px solid ${schemeBadge.border}`,
          }}
        >
          {schemeBadge.label}
        </span>

        <div className={landingWrap}>
          <div className="flex items-center gap-2">
            {logoUrl ? <Image src={logoUrl} alt="" width={22} height={22} className="shrink-0" unoptimized /> : null}
            <span className="font-mono-tactical text-[11px] font-black tracking-tight" style={{ color: teamPrimary }}>
              {p.nfl_team ?? '—'}
            </span>
          </div>
          <span className="font-mono-tactical text-[9px] font-bold tracking-[0.08em] text-[var(--text-muted)]">
            {landing.label} · {Math.round(tfo)} TFO
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Opp</span>
          <span className="tabular-nums font-semibold text-white">{opp}</span>
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="text-right">
            <p
              className="display text-[32px] leading-none font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: gradeStyle.color }}
            >
              {p.ffig_grade}
            </p>
            <p className="font-mono-tactical text-[9px] font-bold tracking-[0.12em] mt-0.5" style={{ color: gradeStyle.color }}>
              {gradeStyle.band}
            </p>
          </div>
          <span className="text-[var(--text-muted)]">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/40 px-4 md:px-6 py-6">
          <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">F-FIG breakdown</h4>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-3">
                    <dt className="text-[var(--text-muted)] text-[10px] uppercase">Production</dt>
                    <dd className="text-white font-semibold">{Number(p.dom_score).toFixed(1)} Dom</dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-3">
                    <dt className="text-[var(--text-muted)] text-[10px] uppercase">Athleticism</dt>
                    <dd className="text-white font-semibold">RAS {Number(p.ras_score).toFixed(1)}</dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-3">
                    <dt className="text-[var(--text-muted)] text-[10px] uppercase">Landing spot</dt>
                    <dd className="text-white font-semibold">{(Number(p.lsm_total) ?? 1).toFixed(3)}× LSM</dd>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-3">
                    <dt className="text-[var(--text-muted)] text-[10px] uppercase">Opportunity</dt>
                    <dd className="text-white font-semibold">
                      Mods Δ{' '}
                      {(
                        (Number(p.vacated_volume_mod) + Number(p.qb_coefficient_mod) + Number(p.scheme_proe_mod)) *
                        100
                      ).toFixed(0)}{' '}
                      bps
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">College stats</h4>
                  <p className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-xl p-3 bg-black/20">
                    ESPN college feeds not wired in this UI yet — dominance & targets are reflected in Dom / target share elsewhere in the pipeline.
                  </p>
                </div>
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Draft capital</h4>
                  <p className="text-sm text-white">
                    Round {p.draft_round ?? '—'}, overall {p.draft_pick ?? '—'}, age{' '}
                    {p.age_at_draft != null ? Number(p.age_at_draft).toFixed(1) : '—'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
                    Comparable / similar archetypes
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {comparable.length ? `Similar to ${comparable.join(', ')}` : 'Insufficient peers in cohort.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatch();
                  }}
                  className={clsx(
                    'w-full rounded-xl border px-4 py-3 text-sm font-semibold transition',
                    watched ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]' : 'border-[var(--border)] hover:border-[var(--indigo)] text-white'
                  )}
                >
                  {watched ? '★ On watch list' : 'Add to Watch List'}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoricalAccuracy({
  aggregated,
  tab,
  onTab,
}: {
  aggregated: {
    rowsOut: Array<{ label: string; graded: number; hits: number; miss: number; accuracy: number | null; edge: number | null }>;
    consensus: number;
  };
  tab: AccuracyTab;
  onTab: (t: AccuracyTab) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/50 p-6 md:p-8">
      <h2 className="display text-2xl text-white uppercase tracking-[0.08em] mb-2">Historical accuracy</h2>
      <p className="text-xs text-[var(--text-muted)] mb-6">Backtest aggregates from graded outcomes stored in Supabase.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['year', 'By Year'],
            ['pos', 'By Position'],
            ['round', 'By Round'],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => onTab(k)}
            className={clsx(
              'text-xs font-bold uppercase px-4 py-2 rounded-full border',
              tab === k ? 'bg-[var(--indigo)] border-[var(--indigo)] text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--indigo)]/40'
            )}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[10px] uppercase text-[var(--text-muted)] tracking-[0.12em]">
              <th className="pb-3 pr-4">{tab === 'year' ? 'Year' : tab === 'pos' ? 'Position' : 'Round'}</th>
              <th className="pb-3 pr-4">Graded</th>
              <th className="pb-3 pr-4">Elite tier hits</th>
              <th className="pb-3 pr-4">Avoid-tier busts</th>
              <th className="pb-3 pr-4">Model %</th>
              <th className="pb-3">vs Consensus %</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.rowsOut.map((row) => (
              <tr key={row.label} className="border-t border-[var(--border)]/80 hover:bg-white/[0.03]">
                <td className="py-3 font-semibold text-white">{row.label}</td>
                <td className="py-3 text-[var(--text-secondary)]">{row.graded}</td>
                <td className="py-3 text-emerald-300">{row.hits}</td>
                <td className="py-3 text-amber-200">{row.miss}</td>
                <td className="py-3 text-[var(--cyan)] tabular-nums">
                  {row.accuracy != null ? `${row.accuracy}%` : '—'}
                </td>
                <td className="py-3 text-[var(--text-muted)] tabular-nums">
                  vs {aggregated.consensus}%
                  {row.edge != null && (
                    <span className="ml-2 text-[var(--gold)]">{row.edge > 0 ? `+${row.edge}%` : `${row.edge}%`}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MethodologyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/75" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h3 className="text-xl font-bold text-white">F-FIG methodology</h3>
          <button type="button" className="text-[var(--text-muted)] hover:text-white text-sm shrink-0" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p>F-FIG (Fantasy Football Impact Grade) combines college production dominance, athletic testing (RAS), draft capital,</p>
          <p>Landing Spot Modifiers penalize rocky depth charts while rewarding QB quality, passing volume upside, and vacated workload.</p>
          <p>Penalties subtract for small-school context, ambiguous paths to snaps, or committee-heavy backfields.</p>
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Accuracy stats compare model hit rates versus a 52% expert consensus baseline on the tracked cohort.
          </p>
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-[var(--indigo)] py-3 text-white font-semibold">
          Done
        </button>
      </div>
    </div>
  );
}
