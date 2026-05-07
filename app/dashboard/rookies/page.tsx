'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Loader2, Search, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import type { FFigGrade, FFigPosition } from '@/lib/ffig/engine';
import { espnNflLogoUrl, nflTeamDisplayName } from '@/lib/nfl/espnTeam';

type Tier = 'free' | 'pro' | 'elite';
type UiTier =
  | 'ALL'
  | 'DIAMOND'
  | 'GEM'
  | 'STARTER'
  | 'DEPTH'
  | 'FADE'
  | 'HARD_FADE';
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
const UI_GRADES: UiTier[] = [
  'ALL',
  'DIAMOND',
  'GEM',
  'STARTER',
  'DEPTH',
  'FADE',
  'HARD_FADE',
];

const TIER_META: Record<Exclude<UiTier, 'ALL'>, { label: string; className: string }> = {
  DIAMOND: { label: 'DIAMOND', className: 'text-[var(--gold)] bg-[var(--gold)]/15 border-[var(--gold)]/40' },
  GEM: { label: 'GEM', className: 'text-[var(--indigo-light)] bg-[var(--indigo)]/18 border-[var(--indigo)]/40' },
  STARTER: { label: 'STARTER', className: 'text-[var(--cyan)] bg-[var(--cyan)]/12 border-[var(--cyan)]/35' },
  DEPTH: { label: 'DEPTH', className: 'text-[var(--text-secondary)] bg-white/[0.06] border-[var(--border)]' },
  FADE: { label: 'FADE', className: 'text-[var(--amber)] bg-[var(--amber)]/14 border-[var(--amber)]/35' },
  HARD_FADE: { label: 'HARD FADE', className: 'text-red-400 bg-red-500/15 border-red-500/35' },
};

const TIER_LETTERS: Record<Exclude<UiTier, 'ALL'>, FFigGrade[]> = {
  DIAMOND: ['A+'],
  GEM: ['A'],
  STARTER: ['B+', 'B'],
  DEPTH: ['C+', 'C'],
  FADE: ['D'],
  HARD_FADE: ['F'],
};

function letterTier(g: FFigGrade): Exclude<UiTier, 'ALL'> {
  if (g === 'A+') return 'DIAMOND';
  if (g === 'A') return 'GEM';
  if (g === 'B+' || g === 'B') return 'STARTER';
  if (g === 'C+' || g === 'C') return 'DEPTH';
  if (g === 'D') return 'FADE';
  return 'HARD_FADE';
}

function tierHit(g: Exclude<UiTier, 'ALL'>): boolean {
  return g === 'DIAMOND' || g === 'GEM';
}
function tierBustSignal(g: Exclude<UiTier, 'ALL'>): boolean {
  return g === 'FADE' || g === 'HARD_FADE';
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

function defaultYearKey(t: Tier): YearKey {
  return t === 'elite' ? 2026 : 2025;
}

export default function RookiesPage() {
  const supabase = createClient();
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
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadProspects() {
      const allowed = allowedYearKeys(tier);
      if (!allowed.includes(yearKey)) {
        setLoading(false);
        return;
      }
      setLoading(true);
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
  }, [supabase, yearKey, tier]);

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
      const letters = TIER_LETTERS[gradeTier];
      list = list.filter((p) => letters.includes(p.ffig_grade));
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

  return (
    <AppBackground intensity="minimal">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 pb-16 space-y-8">
        <header className="pt-10">
          <h1 className="display text-[48px] leading-none text-[var(--text-primary)] uppercase tracking-[0.04em]">
            F-FIG Rookie Grades
          </h1>
          <p className="mt-3 text-[var(--text-secondary)] text-sm md:text-base max-w-2xl">
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
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mr-2 w-full sm:w-auto">Year</span>
            {(([2026, 2025, 2024, 2023, 'historic'] as const)).map((y) => {
              const disabled = !allowedYearKeys(tier).includes(y);
              return (
                <button
                  key={String(y)}
                  type="button"
                  title={
                    disabled
                      ? y === 2026 || y === 'historic'
                        ? 'Elite tier required'
                        : 'Pro tier required'
                      : undefined
                  }
                  disabled={disabled}
                  onClick={() => !disabled && setYearKey(y)}
                  className={clsx(
                    'text-xs font-bold px-3 py-2 rounded-full border transition capitalize',
                    yearKey === y
                      ? 'bg-[var(--indigo)] text-white border-[var(--indigo)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--indigo)]/35',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {y === 'historic' ? 'Historical' : y}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mr-2 w-full sm:w-auto">Grade</span>
            {UI_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeTier(g)}
                className={clsx(
                  'text-[10px] font-bold uppercase px-2 py-2 rounded-full border transition',
                  gradeTier === g
                    ? 'bg-[var(--indigo)] text-white border-[var(--indigo)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--indigo)]/35'
                )}
              >
                {g.replace('_', ' ')}
              </button>
            ))}
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border)]">
                  <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    <th className="py-4 pl-6 pr-2">Pick</th>
                    <th className="py-4 pr-2">Player</th>
                    <th className="py-4 pr-2">Pos</th>
                    <th className="py-4 pr-2">Grade</th>
                    <th className="py-4 pr-2">Score</th>
                    <th className="py-4 pr-2">Landing</th>
                    <th className="py-4 pr-2">Opp</th>
                    <th className="py-4 pr-4 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((p) => {
                    const ui = letterTier(p.ffig_grade);
                    const meta = TIER_META[ui];
                    const photo = p.player_id ? `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg` : null;
                    const logoUrl = espnNflLogoUrl(p.nfl_team);
                    return (
                      <FragmentRow
                        key={p.id}
                        p={p}
                        meta={meta}
                        photoUrl={photo}
                        logoUrl={logoUrl}
                        expanded={expanded === p.id}
                        onExpand={() =>
                          setExpanded((x) => (x === p.id ? null : p.id))
                        }
                        opp={opportunityLetter(p)}
                        pickDisplay={formatDynastyPick(p.draft_round, p.draft_pick)}
                        scoreDisp={scoreTo120(Number(p.ffig_score))}
                        comparable={similarNames(p, rows)}
                        onWatch={() => toggleWatch(p.id)}
                        watched={watchIds.has(p.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
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

function FragmentRow(props: {
  p: Prospect;
  meta: { label: string; className: string };
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
    meta,
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

  return (
    <>
      <tr
        className={clsx(
          'border-b border-[var(--border)]/80 hover:bg-[var(--indigo)]/[0.06] cursor-pointer transition group',
          expanded && 'bg-[var(--indigo)]/[0.06]'
        )}
        onClick={onExpand}
      >
        <td className="py-4 pl-6 align-top">
          <span className="display text-[var(--gold)] text-lg">{pickDisplay}</span>
        </td>
        <td className="py-4 align-top min-w-[200px]">
          <div className="flex gap-3 items-start">
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
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{p.player_name}</p>
              {p.college && (
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-white/[0.06] border border-[var(--border)] text-[var(--text-muted)] truncate max-w-[14rem]">
                  {p.college}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="py-4 align-middle">
          <span className={posBadge}>{p.position}</span>
        </td>
        <td className="py-4 align-middle">
          <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black', meta.className)}>
            {meta.label}
          </span>
        </td>
        <td className="py-4 align-middle text-[var(--text-primary)] tabular-nums">{scoreDisp}</td>
        <td className="py-4 align-middle">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <Image src={logoUrl} alt="" width={26} height={26} className="shrink-0" unoptimized />
            )}
            <span className="text-[var(--text-secondary)] text-xs truncate max-w-[8rem]">
              {p.nfl_team ? nflTeamDisplayName(p.nfl_team) : '—'}
            </span>
          </div>
        </td>
        <td className="py-4 align-middle">
          <span className="tabular-nums font-semibold text-white">{opp}</span>
        </td>
        <td className="py-4 pr-6 align-middle text-right text-[var(--text-muted)]">
          {expanded ? <ChevronUp className="w-4 h-4 inline-block" /> : <ChevronDown className="w-4 h-4 inline-block" />}
        </td>
      </tr>
      {expanded && (
        <tr key={`${p.id}-more`} className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/40">
          <td colSpan={8} className="px-6 py-6">
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
          </td>
        </tr>
      )}
    </>
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
              <th className="pb-3 pr-4">Diamond/Gem Hits</th>
              <th className="pb-3 pr-4">Fade busts</th>
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
