'use client';

// PNG export uses html2canvas (listed in package.json dependencies).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import type { LineupRecommendation } from '@/lib/sitstart/engine';
import type { GameWeather } from '@/lib/external/weather';
import type { LineupOptimizePlayerRow, LineupOptimizeResponse } from '@/app/api/lineup/optimize/route';
import type { ProjectionCardData } from '@/app/api/cards/projection/route';
import ProjectionCard from '@/components/cards/ProjectionCard';
import { espnNflLogoUrl } from '@/lib/nfl/espnTeam';

type EnrichedRec = LineupRecommendation & {
  matchup_grade: string;
  confidence: number;
  opponent_abbr: string | null;
  /** Full API row for lineup-specific UI (scores, flags, weather text). */
  optRow?: LineupOptimizePlayerRow;
};

interface OptApi {
  recommendations: EnrichedRec[];
  gaugePct: number;
  projectedStarterPoints: number;
  summaryChecks: string[];
  meta?: LineupOptimizeResponse['meta'];
}

function matchupGradeToApproxRank(mg: number): number {
  const r = Math.round(32 - ((mg - 30) / 65) * 31);
  return Math.max(1, Math.min(32, r));
}

function lineupRowToEnriched(r: LineupOptimizePlayerRow): EnrichedRec {
  const recommendation: EnrichedRec['recommendation'] =
    r.verdict === 'FLEX' ? 'FLEX' : r.verdict === 'START' ? 'START' : 'SIT';
  const mid = (r.projectedPoints.low + r.projectedPoints.high) / 2;
  const isDome = r.weather.condition === 'Dome';
  const precip =
    r.weather.condition === 'Rain' || r.weather.condition === 'Snow' ? Math.min(95, 55 + r.weather.score * 0.2) : 12;
  const gw: GameWeather = {
    is_dome: isDome,
    wind_mph: r.weather.score < 68 ? 16 : 9,
    precip_chance: Math.round(precip),
    temp_f: r.weather.temp,
  };

  return {
    player_id: r.playerId,
    player_name: r.playerName,
    position: r.position,
    team: r.team,
    recommendation,
    projected_points: Math.round(mid * 10) / 10,
    composite_score: r.startScore,
    explanation: `${r.reasoning} (${r.verdictDetail})`,
    weather: gw,
    matchup_label: `${r.opponent} · matchup ${Math.round(r.matchupGrade)}`,
    matchup_rank: matchupGradeToApproxRank(r.matchupGrade),
    opponent_abbr: r.opponent,
    matchup_grade: String(Math.round(r.matchupGrade)),
    confidence: Math.round(r.tfoScore),
    optRow: r,
  };
}

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'] as const;
const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  FLEX: 'bg-yellow-500/20 text-yellow-400',
  K: 'bg-gray-500/20 text-gray-300',
  DEF: 'bg-red-500/15 text-red-300',
  DST: 'bg-red-500/15 text-red-300',
};
interface LeagueOpt {
  id: string;
  name: string;
  scoring_settings: Record<string, number> | null;
}

function weekOfYear(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - s.getTime();
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
}

function defaultNflWeek() {
  return Math.min(18, Math.max(1, weekOfYear(new Date()) % 18 || 12));
}

/** Sleeper DST → DEF grouping */
function slotKey(pos: string) {
  const u = (pos ?? '').toUpperCase();
  if (u === 'DST') return 'DEF';
  return u;
}

function lineupWeekKey(uid: string) {
  return `bb_lineup_opt_${isoWeekUid()}_${uid.slice(0, 10)}`;
}
function isoWeekUid() {
  const t = new Date();
  const wk = Math.floor((Number(t) - Number(new Date(t.getFullYear(), 0, 1))) / 604800000);
  return `${t.getFullYear()}-wk${wk}`;
}

/** Emoji next to opponent from API weather.condition / score */
function lineupWeatherGlyph(condition: string, score: number): string {
  const c = condition.toLowerCase();
  if (condition === 'Dome' || score >= 95) return '🏟️';
  if (c.includes('rain')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('cloud') || c.includes('fog')) return '🌫️';
  return '☀️';
}

const FLAG_CHIP: Record<string, { label: string; className: string }> = {
  AGE_CLIFF: { label: 'Age Risk', className: 'bg-amber-500/15 text-amber-200 border-amber-500/35' },
  SCHEME_MISMATCH: { label: 'Scheme Risk', className: 'bg-red-500/15 text-red-300 border-red-500/35' },
  NEW_OC: { label: 'New OC', className: 'bg-amber-500/15 text-amber-200 border-amber-500/35' },
  ELITE_OPPORTUNITY: { label: 'Elite Opp', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' },
  RZ_MONSTER: { label: 'RZ Monster', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' },
  WEAK_SUPPORT: { label: 'Weak Cast', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

function gradeFromTfoScore(score: number): string {
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH_VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

function boomNeutralBustChip(verdict: string): { label: string; style: CSSProperties } {
  if (verdict === 'START') return { label: 'BOOM', style: { color: '#36E7A1', borderColor: '#36E7A155', backgroundColor: '#36E7A114' } };
  if (verdict === 'FLEX') return { label: 'NEUTRAL', style: { color: '#94A3B8', borderColor: '#94A3B855', backgroundColor: '#94A3B814' } };
  return { label: 'BUST', style: { color: '#EF4444', borderColor: '#EF444455', backgroundColor: '#EF444414' } };
}

function OptimalGauge({ pct }: { pct: number }) {
  const c = pct >= 78 ? '#36E7A1' : pct >= 58 ? '#FBBF24' : '#EF4444';
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gid = 'gauge-lineup-strength';
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 sm:w-40 sm:h-40 shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--indigo)" />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

function findClosePairs(recs: EnrichedRec[]): Array<{
  player_a: string;
  player_b: string;
  position: string;
  projected_a: number;
  projected_b: number;
  matchup_a: string;
  matchup_b: string;
}> {
  const out: Array<{
    player_a: string;
    player_b: string;
    position: string;
    projected_a: number;
    projected_b: number;
    matchup_a: string;
    matchup_b: string;
  }> = [];
  const filtered = [...recs];
  type K = Exclude<(typeof POSITION_ORDER)[number], 'FLEX'>;
  for (const pos of POSITION_ORDER) {
    if (pos === 'FLEX') {
      const flex = filtered.filter((r) => r.recommendation === 'FLEX');
      for (let i = 0; i + 1 < flex.length; i++) {
        const a = flex[i]!;
        const b = flex[i + 1]!;
        if (Math.abs(a.projected_points - b.projected_points) <= 2) {
          out.push({
            player_a: a.player_name,
            player_b: b.player_name,
            position: `${a.position}/${b.position}`,
            projected_a: a.projected_points,
            projected_b: b.projected_points,
            matchup_a: a.matchup_label,
            matchup_b: b.matchup_label,
          });
        }
      }
      continue;
    }
      const grp = filtered
      .filter((r) => slotKey(r.position) === pos)
      .sort((x, y) => y.projected_points - x.projected_points);
    for (let i = 0; i + 1 < grp.length; i++) {
      const a = grp[i]!;
      const b = grp[i + 1]!;
      if (Math.abs(a.projected_points - b.projected_points) <= 2) {
        out.push({
          player_a: a.player_name,
          player_b: b.player_name,
          position: pos as K,
          projected_a: a.projected_points,
          projected_b: b.projected_points,
          matchup_a: a.matchup_label,
          matchup_b: b.matchup_label,
        });
      }
    }
  }
  return out.slice(0, 6);
}

export default function LineupPage() {
  const supabase = createClient();

  const [leagues, setLeagues] = useState<LeagueOpt[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [week, setWeek] = useState(defaultNflWeek());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OptApi | null>(null);
  const [recsFlat, setRecsFlat] = useState<EnrichedRec[]>([]);
  const [starterIds, setStarterIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [borderlineStream, setBorderlineStream] = useState('');
  const [borderlineLoading, setBorderlineLoading] = useState(false);
  const [oppPts, setOppPts] = useState<number | null>(null);
  const [userPts, setUserPts] = useState<number | null>(null);
  const [benchLeft, setBenchLeft] = useState<number | null>(null);
  const [tier, setTier] = useState<'free' | 'pro' | 'elite'>('free');
  const [weeklyUses, setWeeklyUses] = useState(0);
  const [userId, setUserId] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardData, setCardData] = useState<ProjectionCardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [loadingCardPlayerId, setLoadingCardPlayerId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const FREE_CAP = 5;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session?.user?.id && setUserId(data.session.user.id));
    supabase
      .from('profiles')
      .select('preference_data,is_paid')
      .single()
      .then(({ data: d }) => {
        if (!d) return;
        const pref =
          (d.preference_data && typeof d.preference_data === 'object' ? d.preference_data : {}) as Record<string, unknown>;
        let t: typeof tier = 'free';
        if (pref.subscription_tier === 'elite') t = 'elite';
        else if (d.is_paid) t = 'pro';
        setTier(t);
      }, () => {});
    supabase.from('leagues').select('id, name, scoring_settings').then(({ data }) => {
      setLeagues(data ?? []);
      if (data?.length && !selectedLeague) setSelectedLeague(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    try {
      const v = globalThis.localStorage?.getItem(lineupWeekKey(userId));
      setWeeklyUses(v ? Number(v) || 0 : 0);
    } catch {
      setWeeklyUses(0);
    }
  }, [userId]);

  function bumpFreeUsageCounter() {
    if (tier !== 'free') return;
    setWeeklyUses((p) => {
      const n = p + 1;
      try {
        if (userId) globalThis.localStorage?.setItem(lineupWeekKey(userId), String(n));
      } catch {}
      return n;
    });
  }

  function appendAccuracyHistory(gaugePct: number, wk: number) {
    try {
      const hist = JSON.parse(globalThis.localStorage?.getItem('bb_lineup_accuracy') ?? '[]') as Array<{ week: number; pct: number; at: string }>;
      hist.unshift({ week: wk, pct: gaugePct, at: new Date().toISOString() });
      globalThis.localStorage?.setItem('bb_lineup_accuracy', JSON.stringify(hist.slice(0, 52)));
    } catch {}
  }

  const freeBlocked = tier === 'free' && weeklyUses >= FREE_CAP;

  async function handleOpenCard(player: LineupOptimizePlayerRow) {
    setCardLoading(true);
    setLoadingCardPlayerId(player.playerId);
    try {
      const res = await fetch('/api/cards/projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
          team: player.team,
          week: data?.meta?.week ?? week,
          season: data?.meta?.season ?? String(new Date().getFullYear()),
          tfoScore: player.tfoScore,
          grade: gradeFromTfoScore(player.tfoScore),
          verdict: player.verdict,
          projectedPoints: player.projectedPoints,
          matchupGrade: player.matchupGrade,
          opponent: player.opponent,
          weather: player.weather,
          flags: player.flags,
          reasoning: player.reasoning,
          startScore: player.startScore,
        }),
      });
      if (!res.ok) throw new Error('Card failed');
      const json = (await res.json()) as ProjectionCardData;
      setCardData(json);
      setShowCardModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCardLoading(false);
      setLoadingCardPlayerId(null);
    }
  }

  async function handleDownloadCard() {
    if (!cardRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#060910',
    });
    const link = document.createElement('a');
    link.download = `boom-or-bust-${cardData?.playerName ?? 'player'}-wk${cardData?.week ?? ''}.png`
      .toLowerCase()
      .replace(/\s+/g, '-');
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function optimize() {
    if (!selectedLeague || loading || freeBlocked) return;
    setLoading(true);
    setData(null);
    setRecsFlat([]);
    setBenchLeft(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('sleeper_user_id').eq('id', u.user.id).single();

      const ownerSid = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;
      let rosterQuery = supabase.from('rosters').select('roster_id, owner_id, players, starters, settings').eq('league_id', selectedLeague);
      rosterQuery = ownerSid ? rosterQuery.eq('owner_id', ownerSid) : rosterQuery.limit(1);
      const { data: rows } = await rosterQuery;

      const rosterRow = Array.isArray(rows) ? rows?.[0] ?? null : rows;
      const starterArr = ((rosterRow?.starters ?? []) as string[]).slice(0, 20);

      setStarterIds(new Set(starterArr));

      if (rosterRow?.roster_id === undefined) {
        setLoading(false);
        return;
      }

      const season = String(new Date().getFullYear());

      const res = await fetch('/api/lineup/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeague,
          rosterId: rosterRow.roster_id,
          week,
          season,
        }),
      });

      const raw = await res.json().catch(() => null);
      if (!res.ok || !raw?.players) {
        console.error(raw?.error ?? 'optimize failed');
        setLoading(false);
        return;
      }

      const payload = raw as LineupOptimizeResponse;

      const recommendations = payload.players.map(lineupRowToEnriched);

      const optPayload: OptApi = {
        recommendations,
        gaugePct: payload.gaugePct,
        projectedStarterPoints: payload.projectedStarterPoints,
        summaryChecks: payload.summaryChecks,
        meta: payload.meta,
      };
      bumpFreeUsageCounter();
      appendAccuracyHistory(optPayload.gaugePct, week);

      const playerIds: string[] = ((rosterRow?.players ?? []) as string[]).slice(0, 60);

      const matchRes = await fetch(`https://api.sleeper.app/v1/league/${selectedLeague}/matchups/${week}`);
      if (matchRes.ok && rosterRow?.roster_id !== undefined) {
        const mx = (await matchRes.json()) as Array<{
          roster_id: number;
          matchup_id?: number;
          points?: number;
          players_points?: Record<string, number>;
        }>;
        const row = mx?.find((m) => m.roster_id === rosterRow!.roster_id);
        const oppSame =
          typeof row?.matchup_id === 'number'
            ? mx?.find((m) => m.matchup_id === row.matchup_id && m.roster_id !== rosterRow!.roster_id)
            : undefined;
        if (typeof row?.points === 'number') setUserPts(row.points);
        if (typeof oppSame?.points === 'number') setOppPts(oppSame.points);

        let left = null as number | null;
        if (row?.players_points && starterArr.length && playerIds.length) {
          const pp = row.players_points;
          const starterSet = new Set(starterArr);
          const benchIds = playerIds.filter((pid) => !starterSet.has(pid));
          const benchTotals = benchIds.map((pid) => ({ pid, v: pp[pid] ?? 0 }));
          const benchSum = benchTotals.reduce((a, x) => a + Math.max(x.v, 0), 0);
          const weakestStarter = starterArr.map((sid) => pp[sid] ?? 0).sort((a, b) => a - b)[0] ?? 0;
          left = benchTotals.some((x) => x.v > weakestStarter)
            ? Math.round((benchTotals.reduce((m, x) => Math.max(m, x.v), 0) - weakestStarter) * 10) / 10
            : Math.max(0, Math.round((benchSum * 0.15) * 10) / 10);
        }
        setBenchLeft(left);
      } else {
        setUserPts(null);
        setOppPts(null);
        setBenchLeft(null);
      }

      setData(optPayload);
      setRecsFlat(optPayload.recommendations);

      const pairs = findClosePairs(optPayload.recommendations);
      setBorderlineStream('');
      if (pairs.length) {
        setBorderlineLoading(true);
        try {
          const br = await fetch('/api/lineup/borderline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs }),
          });
          if (!br.ok || !br.body) {
            setBorderlineLoading(false);
          } else {
            const rd = br.body.getReader();
            const dec = new TextDecoder();
            let acc = '';
            while (true) {
              const { done, value } = await rd.read();
              if (done) break;
              acc += dec.decode(value, { stream: true });
              setBorderlineStream(acc);
            }
          }
        } catch {
          setBorderlineStream('Close calls unavailable right now.');
        } finally {
          setBorderlineLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  const grouped = useMemo(() => {
    const g: Record<string, EnrichedRec[]> = {};
    for (const p of POSITION_ORDER) g[p] = [];
    const list = [...recsFlat];

    list.forEach((r) => {
      if (r.recommendation === 'FLEX') {
        g.FLEX!.push(r);
      } else {
        const key = slotKey(r.position ?? '');
        if (key === 'PICK') return;
        if (!g[key]) g[key] = [];
        if (POSITION_ORDER.includes(key as (typeof POSITION_ORDER)[number]) && key !== 'FLEX') g[key].push(r);
      }
    });

    for (const k of POSITION_ORDER) {
      g[k]?.sort((a, b) => b.projected_points - a.projected_points);
    }
    return g;
  }, [recsFlat]);

  const summaryChecksThree = useMemo(() => {
    const raw = data?.summaryChecks ?? [];
    const out = [...raw];
    while (out.length < 3) out.push('—');
    return out.slice(0, 3);
  }, [data?.summaryChecks]);

  const starterSetMemo = starterIds;

  const gaugeColor =
    data && data.gaugePct >= 78
      ? 'text-[#36E7A1]'
      : data && data.gaugePct >= 58
        ? 'text-[#FBBF24]'
        : data
          ? 'text-[#EF4444]'
          : 'text-[var(--text-muted)]';

  const gaugeAccentHex =
    data && data.gaugePct >= 78 ? '#36E7A1' : data && data.gaugePct >= 58 ? '#FBBF24' : data ? '#EF4444' : '#94a3b8';

  let accuracyTrail: Array<{ week: number; pct: number; at: string }> = [];
  try {
    accuracyTrail = JSON.parse(globalThis.localStorage?.getItem('bb_lineup_accuracy') ?? '[]') as typeof accuracyTrail;
  } catch {
    accuracyTrail = [];
  }

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 lg:pb-12 pt-8 lg:pt-10 space-y-10">
        <header>
          <h1 className="display font-normal text-[clamp(2rem,5vw,2.85rem)] text-white lg:text-[2.85rem] leading-tight">Sit/Start Optimizer</h1>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
            <label className="block min-w-[200px] flex-1">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">League</span>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-white text-sm"
              >
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full sm:w-40">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Week</span>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-white text-sm"
              >
                {[...Array(18)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Week {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {tier === 'free' && (
            <p className="text-sm mt-4 text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
              Weekly optimizer runs:{' '}
              <span className="text-[var(--gold)] font-semibold">{weeklyUses}</span> / {FREE_CAP} (upgrade for unlimited)
            </p>
          )}
        </header>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            disabled={loading || !selectedLeague || freeBlocked}
            onClick={() => void optimize()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--indigo)] px-8 py-4 text-white font-bold display tracking-wide disabled:opacity-45 shadow-[0_0_40px_rgba(99,102,241,0.35)] hover:brightness-105 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimizing…
              </>
            ) : (
              'Build optimal board'
            )}
          </button>
        </div>

        {(loading || data) && (
          <>
            {/* Summary */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-6 lg:p-8 shadow-[var(--shadow-card)]">
              <div className="flex flex-col lg:flex-row gap-10 items-center">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <OptimalGauge pct={data?.gaugePct ?? 0} />
                    <span className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none ${gaugeColor}`}>
                      <span className="display text-5xl">{data?.gaugePct ?? '—'}%</span>
                      <span className="text-[11px] uppercase tracking-[0.2em] mt-2 text-[var(--text-muted)] text-center px-2 leading-tight">
                        LINEUP STRENGTH
                      </span>
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="display text-xl text-white">
                      Week {data?.meta?.week ?? week}
                      {data?.meta?.season ? (
                        <span className="text-[var(--text-muted)] text-base font-normal"> · {data.meta.season}</span>
                      ) : null}
                    </p>
                    <p
                      className="display text-2xl sm:text-3xl mt-2 tracking-wide font-bold tabular-nums"
                      style={{ color: gaugeAccentHex }}
                    >
                      PROJ: {data?.projectedStarterPoints != null ? data.projectedStarterPoints.toFixed(1) : '—'} pts
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mt-3" style={{ fontFamily: 'var(--font-body)' }}>
                      Model blend: TFO + matchup + weather · Starters only in projection sum
                      {typeof userPts === 'number' ? (
                        <span className="block mt-3 text-[var(--text-muted)] text-xs">
                          Recorded matchup: <span className="text-emerald-300">{userPts.toFixed(2)}</span>
                          {typeof oppPts === 'number' ? (
                            <>
                              {' '}
                              vs opponent <span className="text-amber-200">{oppPts.toFixed(2)}</span>
                            </>
                          ) : (
                            ''
                          )}
                        </span>
                      ) : (
                        <span className="block mt-3 text-[11px] text-[var(--text-muted)]">Live scores appear after Sleeper posts weekly results.</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex-1 w-full lg:w-auto lg:ml-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {summaryChecksThree.map((chk, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl border border-[var(--border)] px-4 py-3 bg-[var(--bg-secondary)]/70"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-[var(--text-secondary)] leading-snug">{chk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Groups */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-40 shimmer rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/50" />
                ))}
              </div>
            ) : (
              <section className="space-y-8">
                {POSITION_ORDER.filter((slot) => (grouped[slot]?.length ?? 0) > 0).map((slot) => (
                  <div key={slot} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="display text-2xl text-white">{slot}</p>
                      <span className="text-[11px] text-[var(--text-muted)] font-body uppercase tracking-wider">Starter · Bench</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
                      {grouped[slot]!.map((r) => {
                        const opt = r.optRow;
                        const verdictForChip = opt?.verdict ?? r.recommendation;
                        const bnb = boomNeutralBustChip(verdictForChip);
                        const bench = !starterSetMemo.has(r.player_id);
                        const consider =
                          bench &&
                          r.projected_points > 0 &&
                          grouped[slot]!
                            .filter((x) => starterSetMemo.has(x.player_id) && slotKey(x.position) === slotKey(r.position))
                            .some((sx) => r.projected_points > sx.projected_points);

                        return (
                          <div
                            key={r.player_id}
                            className={clsx(
                              'rounded-2xl border p-5 transition-colors hover:border-[var(--border-hover)]',
                              starterSetMemo.has(r.player_id) ? 'border-emerald-500/45 bg-emerald-500/[0.06]' : 'border-[var(--border)] bg-[var(--bg-secondary)]/60 opacity-92'
                            )}
                          >
                            <button
                              type="button"
                              className="w-full flex items-start gap-3 text-left"
                              onClick={() => setExpanded((v) => (v === r.player_id ? null : r.player_id))}
                              aria-expanded={expanded === r.player_id}
                            >
                              <Image
                                src={`https://sleepercdn.com/content/nfl/players/${r.player_id}.jpg`}
                                alt=""
                                width={56}
                                height={56}
                                className="rounded-xl object-cover w-14 h-14 shrink-0 border border-white/10"
                                unoptimized
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 items-start justify-between gap-y-2">
                                  <div>
                                    <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded', POSITION_COLORS[slotKey(r.position)] ?? POSITION_COLORS.DEF)}>
                                      {r.position}
                                    </span>
                                    <p className="text-white font-semibold text-base mt-2">{r.player_name}</p>
                                    {opt?.flags?.length ? (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {opt.flags.map((f) => {
                                          const fc = FLAG_CHIP[f];
                                          if (!fc) return null;
                                          return (
                                            <span
                                              key={f}
                                              className={clsx('text-[10px] px-2 py-0.5 rounded-md border font-semibold', fc.className)}
                                            >
                                              {fc.label}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <p className="text-xs text-[var(--text-muted)] mt-2">
                                      {r.team ? `${r.position} · ${r.team}` : r.position}
                                    </p>
                                    {opt ? (
                                      <p className="text-xs text-[var(--text-secondary)] mt-1 flex flex-wrap items-center gap-1.5">
                                        <span aria-hidden>{lineupWeatherGlyph(opt.weather.condition, opt.weather.score)}</span>
                                        <span>
                                          vs <span className="text-white font-medium">{opt.opponent}</span>
                                          <span className="text-[var(--text-muted)]">
                                            {' '}
                                            · {opt.weather.temp}° · {opt.weather.condition}
                                          </span>
                                        </span>
                                      </p>
                                    ) : typeof r.matchup_rank === 'number' ? (
                                      <p className="text-xs text-[var(--text-muted)] mt-1">
                                        vs {r.opponent_abbr ?? '?'} ({r.matchup_grade} matchup · def rank {r.matchup_rank})
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                                    {opt ? (
                                      <button
                                        type="button"
                                        title="Generate card"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleOpenCard(opt);
                                        }}
                                        disabled={cardLoading}
                                        className="flex shrink-0 items-center justify-center rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-sm text-[#64748B] transition hover:bg-[rgba(255,255,255,0.08)] hover:text-[#94A3B8] disabled:opacity-50"
                                        style={{ width: 28, height: 28 }}
                                      >
                                        {loadingCardPlayerId === opt.playerId ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                        ) : (
                                          '📤'
                                        )}
                                      </button>
                                    ) : null}
                                    <span
                                      className="inline-flex shrink-0 text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wide"
                                      style={bnb.style}
                                    >
                                      {bnb.label}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[13px] text-[var(--text-secondary)]">
                                  {opt ? (
                                    <>
                                      <span>
                                        Start <span className="text-white tabular-nums">{Math.round(opt.startScore)}</span>
                                      </span>
                                      <span>
                                        TFO <span className="text-white tabular-nums">{Math.round(opt.tfoScore)}</span>
                                      </span>
                                      <span>
                                        Matchup <span className="text-white tabular-nums">{Math.round(opt.matchupGrade)}</span>
                                      </span>
                                      <span>
                                        Proj{' '}
                                        <span className="text-white tabular-nums">
                                          {opt.projectedPoints.low.toFixed(1)}–{opt.projectedPoints.high.toFixed(1)}
                                        </span>
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span>
                                        Projection <span className="text-white">{r.projected_points.toFixed(1)}</span>
                                      </span>
                                      <span className="text-[var(--indigo-light)]">{r.confidence}% conf</span>
                                    </>
                                  )}
                                  {consider ? (
                                    <span className="text-[var(--gold)] text-[11px] font-semibold uppercase border border-[var(--gold)]/40 rounded-full px-2 py-0.5">
                                      Consider starting
                                    </span>
                                  ) : (
                                    starterSetMemo.has(r.player_id) && (
                                      <span className="text-emerald-400/90 text-[11px] font-semibold uppercase">Starter lineup</span>
                                    )
                                  )}
                                  {expanded === r.player_id ? <ChevronDown className="w-5 h-5 ml-auto" /> : <ChevronRight className="w-5 h-5 ml-auto" />}
                                </div>
                              </div>
                            </button>
                            {expanded === r.player_id && (
                              <div className="text-sm mt-4 pt-4 border-t border-[var(--border)] text-[var(--text-secondary)] leading-relaxed space-y-2">
                                {opt ? (
                                  <>
                                    <p className="text-white/95">{opt.reasoning}</p>
                                    <p className="text-[var(--text-muted)] text-xs">{opt.verdictDetail}</p>
                                  </>
                                ) : (
                                  <p>{r.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Close calls */}
            {(borderlineLoading || borderlineStream) && (
              <section className="rounded-2xl border border-purple-500/25 bg-purple-950/30 p-6">
                <p className="display text-xl text-white mb-4">Close Calls</p>
                {borderlineLoading && !borderlineStream && (
                  <Loader2 className="w-5 h-5 text-[var(--indigo-light)] animate-spin" />
                )}
                <div className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">{borderlineStream}</div>
              </section>
            )}

            {/* Bench mistakes */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-6">
              <p className="display text-xl text-white mb-2">Bench mistakes</p>
              {typeof benchLeft === 'number' ? (
                <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
                  You left <span className="text-[var(--gold)] font-semibold">{benchLeft}</span> hypothetical points vs your weakest flagged starter when actuals post.
                  Stack accuracy trending from your weekly gauge trail.
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Actual bench mistakes populate once Sleeper reports final player scoring for the week.</p>
              )}
              {accuracyTrail.length > 0 && (
                <ul className="mt-4 space-y-1 text-xs text-[var(--text-muted)]">
                  {accuracyTrail.slice(0, 5).map((row, i) => (
                    <li key={i}>
                      Week {row.week}: {row.pct}% optimal · {new Date(row.at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {!loading && !data && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center text-[var(--text-muted)]">
            Select league + week, then build your board. FantasyPros projections + ESPN DVOA ranks power the matchup grades.
          </div>
        )}
      </main>

      {showCardModal && cardData ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
          }}
          role="presentation"
          onClick={() => {
            setShowCardModal(false);
            setCardData(null);
          }}
        >
          <div
            className="flex max-h-[90vh] flex-col items-center gap-3 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Projection share card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-[480px] max-w-full shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCardModal(false);
                  setCardData(null);
                }}
                className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-[11px] font-semibold text-[#94A3B8] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ✕ Close
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadCard()}
                className="rounded-full border border-[rgba(54,231,161,0.25)] bg-[rgba(54,231,161,0.1)] px-3 py-1.5 text-[11px] font-semibold text-[#36E7A1] transition hover:bg-[rgba(54,231,161,0.18)]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ⬇ Download PNG
              </button>
            </div>
            <ProjectionCard
              data={cardData}
              cardRef={cardRef}
              playerImageUrl={`https://sleepercdn.com/content/nfl/players/${cardData.playerId}.jpg`}
              teamLogoUrl={espnNflLogoUrl(cardData.team) ?? undefined}
              showShareButton
            />
          </div>
        </div>
      ) : null}
    </AppBackground>
  );
}
