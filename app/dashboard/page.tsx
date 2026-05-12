'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { useDashboardSnapshot } from '@/hooks/useDashboardSnapshot';
import { useHubRotation } from '@/hooks/useHubRotation';
import ProjectionChart, { type PositionBreakdown } from '@/components/dashboard/ProjectionChart';
import PlayerHubCard from '@/components/dashboard/PlayerHubCard';
import StarTistCard from '@/components/dashboard/StarTistCard';
import RosterRester from '@/components/dashboard/RosterRester';
import WaiverWatchlist, { type WaiverTarget } from '@/components/dashboard/WaiverWatchlist';
import SleeperReport from '@/components/dashboard/SleeperReport';
import ExposureTracker from '@/components/dashboard/ExposureTracker';
import TradeAnalyzerNote from '@/components/dashboard/TradeAnalyzerNote';
import MyLeaguesCompact, { type CompactLeague } from '@/components/dashboard/MyLeaguesCompact';
import OvervaluedAssets from '@/components/dashboard/OvervaluedAssets';
import TradeHubSidebar, {
  type TopMoveRow,
  type LeagueStatusRow,
  type WaiverSidebarTarget,
} from '@/components/dashboard/TradeHubSidebar';
import CoachQuickAsk from '@/components/dashboard/CoachQuickAsk';
import RecommendedTargets from '@/components/dashboard/RecommendedTargets';
import TradeAnalyzePanel from '@/components/dashboard/TradeAnalyzePanel';
import WeeklyDynastyReport from '@/components/dashboard/WeeklyDynastyReport';
import LeagueSidebar from '@/components/dashboard/LeagueSidebar';
import DashboardNewsWire from '@/components/dashboard/DashboardNewsWire';
import NotificationBell from '@/components/dashboard/NotificationBell';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import { getRadarMetrics, type RadarHubContext } from '@/components/dashboard/radarMetrics';
import type { TFOVerdict } from '@/lib/tfo/formula';
import type { RotationPlayer, HubSpotlightPlayer } from '@/app/api/dashboard/snapshot/route';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';

const PLACEHOLDER_LEAGUES: CompactLeague[] = [
  { id: '1', name: 'Sync Pending', tone: 'gray', meta: 'Awaiting data' },
];

const PLACEHOLDER_WAIVERS: WaiverTarget[] = [];

function formatKtc(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
}

/** Empire headline: lowercase k (e.g. 679.8k). */
function formatKtcHeroMain(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toString();
}

function hubFromRotation(p: RotationPlayer, forecast: 'boom' | 'bust'): RadarHubContext {
  return {
    player_id: p.player_id,
    position: p.position,
    team: p.team,
    ktc_value: p.ktc_value,
    seasonAvgPpg: p.seasonAvgPpg,
    current_points: p.current_points,
    forecastDelta: p.forecastDelta,
    forecast,
  };
}

function TierInlineBadge({ tier }: { tier: 'free' | 'pro' | 'elite' }) {
  const styles =
    tier === 'elite'
      ? 'bg-[#FBBF24]/12 border-[#FBBF24]/35 text-[#FBBF24]'
      : tier === 'pro'
        ? 'bg-[#22D3EE]/12 border-[#22D3EE]/35 text-[#22D3EE]'
        : 'bg-white/5 border-white/10 text-[var(--text-muted)]';
  const label = tier === 'elite' ? 'Elite ✦' : tier === 'pro' ? 'Pro' : 'Free';
  return (
    <span
      className={clsx(
        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        styles,
      )}
    >
      {label}
    </span>
  );
}

function HubCardSkeleton({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={clsx(
        'glass-panel relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08]',
        compact ? 'p-2 min-h-[200px]' : 'p-4 min-h-0',
        className,
      )}
    >
      <div className="flex justify-between gap-2 mb-2">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-2.5 w-8" />
      </div>
      <div className={clsx('flex gap-2 mb-2', compact ? 'items-center' : 'items-center gap-3 mb-4')}>
        <div className={clsx('skeleton shrink-0 rounded-full', compact ? 'h-14 w-14' : 'h-[104px] w-[104px]')} />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="skeleton h-3 w-3/4 max-w-[120px]" />
          <div className="skeleton h-2.5 w-1/2 max-w-[72px]" />
        </div>
      </div>
      <div className={clsx('mt-auto rounded-lg bg-white/[0.04]', compact ? 'h-24' : 'h-32')}>
        <div className="skeleton h-full w-full rounded-lg opacity-40" />
      </div>
    </div>
  );
}

function CommandHubSkeleton({ className = '' }: { className?: string }) {
  return (
    <aside
      className={`slim-scroll flex flex-col gap-0 overflow-y-auto sticky top-0 self-start max-h-[calc(100vh-120px)] glass-panel rounded-none border-l border-white/[0.08] ${className}`}
    >
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
      <section className="px-3 py-2 border-b border-white/[0.06]">
        <div className="skeleton h-2 w-28 mb-2" />
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="skeleton h-10 w-full" />
          ))}
        </ul>
      </section>
      <section className="px-3 py-2 border-b border-white/[0.06] flex-1 min-h-0">
        <div className="skeleton h-2 w-24 mb-2" />
        <ul className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="skeleton h-5 w-full" />
          ))}
        </ul>
      </section>
      <div className="mt-auto shrink-0 border-t border-white/[0.06] px-2 py-2">
        <div className="flex gap-1 px-1 pb-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[26px] flex-1 skeleton rounded border border-white/[0.06]" />
          ))}
        </div>
      </div>
    </aside>
  );
}

function WaiverBlockSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-3 ${className}`}>
      <div className="flex justify-between mb-4">
        <div className="skeleton h-3 w-48" />
        <div className="skeleton h-5 w-28" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton min-h-[5.25rem] min-w-[220px] flex-1 max-w-[300px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function LowerGridSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-12 gap-2 lg:gap-3 shrink-0 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="col-span-12 sm:col-span-6 xl:col-span-3 glass-panel p-4 min-h-[140px]">
          <div className="skeleton h-3 w-20 mb-3" />
          <div className="skeleton h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function MyLeaguesSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-3 min-h-[120px] ${className}`}>
      <div className="skeleton h-3 w-32 mb-3" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SleeperReportSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-3 ${className}`}>
      <div className="skeleton h-5 w-64 mb-2" />
      <div className="skeleton h-2 w-40 mb-4" />
      <div className="slim-scroll space-y-2 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function normalizeTimeLabels(labels: string[], n: number): string[] {
  if (n !== 3) return labels;
  return ['Y-2', 'Y-1', 'Now'];
}

function isNflGameDayBanner(date = new Date()): boolean {
  const d = date.getDay();
  return d === 0 || d === 1 || d === 4;
}

function ProjectedWinBanner({ pct, wins, total }: { pct: number; wins: number; total: number }) {
  const rgb = pct > 70 ? '54, 231, 161' : pct >= 50 ? '251, 191, 36' : '239, 68, 68';
  return (
    <div
      className="px-4 py-2 text-center border-b"
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: `rgb(${rgb})`,
        background: `linear-gradient(180deg, rgba(${rgb}, 0.04) 0%, transparent 85%)`,
        borderBottomColor: `rgba(${rgb}, 0.3)`,
        borderBottomWidth: 1,
      }}
    >
      PROJECTED WIN: {pct}% ({wins}/{total} LEAGUES)
    </div>
  );
}

export default function DashboardPage() {
  const { error, hero, data } = useDashboardSnapshot();
  const [dynastyVerdictByName, setDynastyVerdictByName] = useState<Record<string, TFOVerdict>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/rankings/dynasty-enriched')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: DynastyPlayer2026[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        const m: Record<string, TFOVerdict> = {};
        for (const row of rows) {
          m[row.name.toLowerCase()] = row.tfoVerdict;
        }
        setDynastyVerdictByName(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  const setActiveLeagueId = useDashboardLeagueStore((s) => s.setActiveLeagueId);

  useEffect(() => {
    if (!data?.leagues?.length) return;
    const ids = new Set(data.leagues.map((l) => l.id));
    const cur = useDashboardLeagueStore.getState().activeLeagueId;
    if (cur !== null && !ids.has(cur)) {
      setActiveLeagueId(null);
    }
  }, [data?.leagues, setActiveLeagueId]);

  const ownedIds = useMemo(() => {
    const ids = data?.ownedPlayerIds;
    if (!ids?.length) return null as Set<string> | null;
    return new Set(ids);
  }, [data?.ownedPlayerIds]);

  const portfolioRows = useMemo(() => {
    const rows = data?.portfolioMvpByLeague ?? [];
    if (!ownedIds) return rows;
    return rows.filter((s) => ownedIds.has(s.player.player_id));
  }, [data?.portfolioMvpByLeague, ownedIds]);

  const resolvedHubLeagueId = useMemo(() => {
    if (activeLeagueId) return activeLeagueId;
    return data?.leagues?.[0]?.id ?? null;
  }, [activeLeagueId, data?.leagues]);

  const verdictByPlayerId = data?.tfoVerdictByPlayerId ?? {};

  const hubSpotlight = useMemo((): { boom: HubSpotlightPlayer | null; bust: HubSpotlightPlayer | null } => {
    if (!data?.hubSpotlightByLeague || !resolvedHubLeagueId) {
      return { boom: null, bust: null };
    }
    return data.hubSpotlightByLeague[resolvedHubLeagueId] ?? { boom: null, bust: null };
  }, [data?.hubSpotlightByLeague, resolvedHubLeagueId]);

  const hubSpotMetrics = useMemo(() => {
    const boom = hubSpotlight.boom;
    const bust = hubSpotlight.bust;
    const mvpDelta =
      boom == null
        ? 0
        : boom.forecastDelta ?? boom.current_points ?? (boom.ktc_value ? boom.ktc_value / 1000 : 0);
    const threatDelta =
      bust == null
        ? 0
        : bust.forecastDelta ?? bust.current_points ?? (bust.ktc_value ? bust.ktc_value / 1000 : 0);
    const mvpRadar = boom
      ? getRadarMetrics(boom.position, boom.player_id, undefined, 'boom', { hub: hubFromRotation(boom, 'boom') })
      : [];
    const threatRadar = bust
      ? getRadarMetrics(bust.position, bust.player_id, undefined, 'bust', { hub: hubFromRotation(bust, 'bust') })
      : [];
    return { boom, bust, mvpDelta, threatDelta, mvpRadar, threatRadar };
  }, [hubSpotlight]);

  const mvpLeagueN = portfolioRows.length;
  const mvpLeagueIdx = useHubRotation(Math.max(1, mvpLeagueN || 1), 6000);

  const healthN = data?.leagueHealthRotation?.length ?? 0;
  const healthIdx = useHubRotation(Math.max(1, healthN || 1), 5000);

  const portfolioSeries = useMemo(() => {
    const history = data?.portfolioHistory ?? [];
    const fallback =
      ((data?.empire.portfolioValue ?? hero?.empire.portfolioValue) ?? 0) || 0;
    if (!history.length) {
      return {
        values: [fallback * 0.94, fallback * 0.97, fallback],
        labels: ['Y-2', 'Y-1', 'Now'],
        currentTotal: fallback,
      };
    }
    if (activeLeagueId) {
      const values = history.map((p) => p.byLeague[activeLeagueId] ?? 0);
      const rawLabels = history.map((p) => p.label);
      return {
        values,
        labels: normalizeTimeLabels(rawLabels, values.length),
        currentTotal: values[values.length - 1] ?? 0,
      };
    }
    const values = history.map((p) => p.total);
    const rawLabels = history.map((p) => p.label);
    return {
      values,
      labels: normalizeTimeLabels(rawLabels, values.length),
      currentTotal: values[values.length - 1] ?? 0,
    };
  }, [data, hero, activeLeagueId]);

  const portfolioPositionBreakdown = useMemo((): PositionBreakdown | undefined => {
    if (!activeLeagueId || !data?.portfolioHistory?.length) return undefined;
    const hist = data.portfolioHistory;
    const qb: number[] = [];
    const rb: number[] = [];
    const wr: number[] = [];
    const te: number[] = [];
    for (const pt of hist) {
      const row = pt.byLeaguePositionKtc?.[activeLeagueId];
      if (!row) return undefined;
      qb.push(row.QB);
      rb.push(row.RB);
      wr.push(row.WR);
      te.push(row.TE);
    }
    if (qb.length < 2) return undefined;
    return { QB: qb, RB: rb, WR: wr, TE: te };
  }, [data?.portfolioHistory, activeLeagueId]);

  const [chartVsLeague, setChartVsLeague] = useState(false);

  useEffect(() => {
    if (activeLeagueId) setChartVsLeague(false);
  }, [activeLeagueId]);

  const chartBenchmark = useMemo(() => {
    if (!data) return null;
    if (activeLeagueId) return data.leaguePortfolioBenchmark[activeLeagueId] ?? null;
    return data.portfolioBenchmark > 0 ? data.portfolioBenchmark : null;
  }, [data, activeLeagueId]);

  const commandHubMoves = useMemo((): TopMoveRow[] => {
    if (!data) return [];
    const rows: TopMoveRow[] = [];
    const sell = data.overvalued[0];
    if (sell) {
      rows.push({
        action: 'SELL',
        playerName: sell.name,
        reason: `MO ${sell.moPts >= 0 ? '+' : ''}${sell.moPts?.toFixed(1) ?? '—'} · age cliff + scheme risk`,
      });
    }
    const add = data.waivers[0];
    if (add) {
      rows.push({
        action: 'ADD',
        playerName: add.name,
        reason:
          add.signal != null
            ? `BBSM ${add.tfoScore ?? '—'} — ${add.signal}`
            : `TFO ${add.tfoScore ?? '—'} — buy before market`,
      });
    }
    const ts = data.tradeScenario;
    if (ts) {
      rows.push({
        action: 'BUY',
        playerName: ts.buy.name,
        reason: `TFO edge +${ts.gainPct}% · undervalued vs sell`,
      });
    } else if (data.playerGaps[0]) {
      const g = data.playerGaps[0]!;
      rows.push({
        action: 'BUY',
        playerName: g.player,
        reason: `Positional leverage +${g.pct}% vs consensus`,
      });
    }
    if (!rows.length) {
      return [{ action: 'ADD', playerName: '—', reason: 'Sync Sleeper leagues for live intel' }];
    }
    return rows.slice(0, 3);
  }, [data]);

  const leagueCommandRows = useMemo((): LeagueStatusRow[] => {
    if (!data?.leagues?.length) return [];
    return data.leagues.map((lg) => ({
      id: lg.id,
      name: lg.name,
      healthScore: lg.healthScore,
      signal: lg.primarySignal,
    }));
  }, [data?.leagues]);

  const commandHubWaivers = useMemo((): WaiverSidebarTarget[] => {
    if (!data?.waivers?.length) return [];
    return [...data.waivers]
      .sort((a, b) => {
        const ta = a.tfoScore ?? 0;
        const tb = b.tfoScore ?? 0;
        if (tb !== ta) return tb - ta;
        const pa = parseInt(a.addValue.match(/\d+/)?.[0] ?? '0', 10);
        const pb = parseInt(b.addValue.match(/\d+/)?.[0] ?? '0', 10);
        return pb - pa;
      })
      .slice(0, 8)
      .map((w) => ({
        player_id: w.player_id,
        name: w.name,
        position: w.position,
        addValue: w.addValue,
        tfoScore: w.tfoScore,
        signal: w.signal,
        verdict: w.verdict,
      }));
  }, [data?.waivers]);

  const eliteWeeklyBullets = useMemo(() => {
    if (!data) return [];
    const out: string[] = [];
    const rh = data.rosterHealth;
    if (rh?.headline) {
      out.push(`${rh.headline} · ${rh.injured} injured / outs, ${rh.questionable} questionable.`);
    }
    const w = data.waivers[0];
    if (w) {
      out.push(`${w.name} (${w.position}) trending adds ${w.addValue} — FAAB radar.`);
    }
    const ts = data.tradeScenario;
    if (ts) {
      out.push(`Trade lens +${ts.gainPct}%: ${ts.sell.name} → ${ts.buy.name} (${ts.leagueName}).`);
    } else if (data.overvalued[0]) {
      const o = data.overvalued[0];
      out.push(`${o.name} skews rich vs recent scoring — trim if win-now.`);
    }
    if (out.length < 3 && data.leagues.length) {
      const weakest = [...data.leagues].sort((a, b) => a.healthScore - b.healthScore)[0];
      if (weakest) {
        out.push(`${weakest.name}: health ${weakest.healthScore}, signal ${weakest.primarySignal}.`);
      }
    }
    return out.slice(0, 3);
  }, [data]);

  const exposurePlayerMap = useMemo(() => {
    if (!data?.exposureTop?.length) return {};
    const m: Record<string, { full_name: string; position: string; leagueExposure: number }> = {};
    for (const r of data.exposureTop) {
      m[r.player_id] = { full_name: r.name, position: r.position, leagueExposure: r.leagueCount };
    }
    return m;
  }, [data?.exposureTop]);

  const portfolioHealth = useMemo(() => {
    const list = data?.leagues ?? [];
    const total = list.length;
    const winning = list.filter((l) => l.healthScore >= 70).length;
    const atRisk = list.filter((l) => l.healthScore < 50).length;
    return { total, winning, atRisk };
  }, [data?.leagues]);

  const projectedWinStats = useMemo(() => {
    if (!data?.leagues?.length) {
      return { pct: 60, wins: 0, total: 0 };
    }
    const total = data.leagues.length;
    const pct = Math.round(data.leagues.reduce((s, l) => s + l.healthScore, 0) / total);
    const wins = data.leagues.filter((l) => l.healthScore >= 70).length;
    return { pct, wins, total };
  }, [data?.leagues]);

  const waiverTargets = useMemo((): WaiverTarget[] => {
    if (!data?.waivers?.length) return PLACEHOLDER_WAIVERS;
    return data.waivers.map((w) => ({
      player_id: w.player_id,
      name: w.name,
      position: w.position,
      team: w.team,
      addValue: w.addValue,
      ownedPct: Math.min(99, Math.round((w.addCount / 1000) * 100)),
      trending: w.trending,
      photoUrl: w.photoUrl,
      verdict: w.verdict,
    }));
  }, [data?.waivers]);

  const compactLeagues = useMemo((): CompactLeague[] => {
    if (!data?.leagues?.length) return PLACEHOLDER_LEAGUES;
    return data.leagues.map((lg) => ({
      id: lg.id,
      name: lg.name,
      tone: lg.signalTone,
      healthScore: lg.healthScore,
      meta:
        lg.weekScore !== null && lg.oppScore !== null
          ? `${lg.weekScore.toFixed(1)} — ${lg.oppScore.toFixed(1)}`
          : `Health ${lg.healthScore}`,
    }));
  }, [data?.leagues]);

  const selectedLeagueName = useMemo(() => {
    if (!data || !activeLeagueId) return null;
    return data.leagues.find((l) => l.id === activeLeagueId)?.name ?? null;
  }, [data, activeLeagueId]);

  const portfolioSlice = useMemo(() => {
    if (!data || portfolioRows.length === 0) return null;
    return portfolioRows[Math.min(mvpLeagueIdx, portfolioRows.length - 1)]!;
  }, [data, portfolioRows, mvpLeagueIdx]);

  const leagueContextLine = useMemo(() => {
    if (!data?.leagueHealthRotation?.length) return undefined;
    const healthSlice =
      data.leagueHealthRotation[Math.min(healthIdx, data.leagueHealthRotation.length - 1)]!;
    return `${healthSlice.leagueName} · roster ${healthSlice.readinessScore}% · ${healthSlice.injured} out · ${healthSlice.questionable} Q · ${healthSlice.suspended} IR`;
  }, [data?.leagueHealthRotation, healthIdx]);

  const empireForUi = data?.empire ?? hero?.empire ?? null;
  const weekDisplay = data?.week ?? hero?.week ?? 1;
  const tierDisplay = data?.userTier ?? hero?.userTier ?? 'free';

  const sidebarMidPremium = useMemo(() => {
    if (tierDisplay === 'pro') return <CoachQuickAsk />;
    if (tierDisplay === 'elite') return <WeeklyDynastyReport bullets={eliteWeeklyBullets} />;
    return undefined;
  }, [tierDisplay, eliteWeeklyBullets]);

  const chartHasPositions = Boolean(portfolioPositionBreakdown);
  const chartPortfolioSeries = useMemo(() => {
    if (!chartVsLeague || chartBenchmark == null || chartBenchmark <= 0) return portfolioSeries;
    return {
      values: portfolioSeries.values.map((v) => v - chartBenchmark),
      labels: portfolioSeries.labels,
      currentTotal: portfolioSeries.currentTotal - chartBenchmark,
    };
  }, [portfolioSeries, chartVsLeague, chartBenchmark]);

  const chartDataValues = chartHasPositions ? portfolioSeries.values : chartPortfolioSeries.values;

  const chartControls = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {chartBenchmark != null && chartBenchmark > 0 && !chartHasPositions && (
          <button
            type="button"
            onClick={() => setChartVsLeague((v) => !v)}
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border transition-colors font-mono-tactical ${
              chartVsLeague
                ? 'text-[#22D3EE] border-[#22D3EE]/40 bg-[#22D3EE]/10'
                : 'text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            vs league
          </button>
        )}
        {activeLeagueId ? (
          <button
            type="button"
            onClick={() => setActiveLeagueId(null)}
            className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors font-mono-tactical"
          >
            Clear league
          </button>
        ) : null}
      </div>
    ),
    [chartBenchmark, chartHasPositions, chartVsLeague, activeLeagueId],
  );

  if (error && !data) {
    return (
      <div className="flex min-h-screen overflow-y-auto w-full flex-col items-center justify-center bg-[#060910] px-6 text-center">
        <div className="text-[#EF4444] font-black italic uppercase tracking-widest mb-2 font-mono-tactical">
          Snapshot Unavailable
        </div>
        <p className="text-slate-500 text-[11px] mb-4 max-w-md">{error ?? 'Could not load your live dashboard.'}</p>
        <Link
          href="/onboarding"
          className="text-[11px] font-bold text-[#22D3EE] hover:text-white border border-[#22D3EE]/30 rounded-md px-3 py-1.5 font-mono-tactical"
        >
          Re-sync Sleeper Leagues →
        </Link>
      </div>
    );
  }

  const showFullDashboard = Boolean(data);

  return (
    <div
      className="min-h-screen overflow-y-auto pb-8 px-2 pt-2 lg:px-4 bg-[#060910]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 140% 90% at 50% -18%, rgba(34,211,238,0.075), transparent 55%), radial-gradient(ellipse 70% 45% at 92% 100%, rgba(54,231,161,0.045), transparent 50%)',
      }}
    >
      <div className="glass-panel flex flex-col !rounded-xl border-white/[0.12]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/images/logo-icon.png" alt="" height={28} width={28} className="h-7 w-7 shrink-0 object-contain" />
            <span
              className="truncate text-[24px] font-bold uppercase tracking-[0.05em] text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BOOM OR BUST
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono-tactical text-[12px] text-[#94A3B8] tabular-nums min-h-[1.25rem]">
            <span className="live-dot shrink-0" />
            {empireForUi ? (
              <span className="whitespace-nowrap">
                WEEK {weekDisplay} · {empireForUi.winning}W-{Math.max(0, empireForUi.total - empireForUi.winning)}L
              </span>
            ) : (
              <span className="skeleton inline-block h-4 w-44 rounded-md align-middle" aria-hidden />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <TierInlineBadge tier={tierDisplay} />
          </div>
        </div>
        <DashboardNewsWire data={data} resolvedLeagueId={resolvedHubLeagueId} dynastyVerdictByName={dynastyVerdictByName} />
        {showFullDashboard && isNflGameDayBanner() ? (
          <ProjectedWinBanner pct={projectedWinStats.pct} wins={projectedWinStats.wins} total={projectedWinStats.total} />
        ) : null}
        <div className="grid auto-rows-auto grid-cols-12 gap-2 lg:gap-3 p-2 lg:p-3">
          <LeagueSidebar className="order-1 col-span-12 lg:order-3 lg:col-span-2 lg:self-start" />
          <main className="order-2 col-span-12 lg:order-1 lg:col-span-6 flex flex-col gap-2 lg:gap-3">
            <div
              className={clsx(
                'grid w-full gap-2',
                showFullDashboard && hubSpotMetrics.bust ? 'grid-cols-2' : 'grid-cols-1',
                showFullDashboard && hubSpotMetrics.boom && !hubSpotMetrics.bust && 'sm:max-w-[min(100%,22rem)] sm:mx-auto',
              )}
            >
              {showFullDashboard ? (
                <>
                  {hubSpotMetrics.boom ? (
                    <PlayerHubCard
                      className="min-h-0 w-full max-h-[320px]"
                      compact
                      variant="mvp"
                      playerId={hubSpotMetrics.boom.player_id}
                      name={hubSpotMetrics.boom.name}
                      position={hubSpotMetrics.boom.position}
                      team={hubSpotMetrics.boom.team}
                      photoUrl={hubSpotMetrics.boom.photoUrl}
                      projectedDelta={hubSpotMetrics.mvpDelta}
                      projectedLabel={
                        hubSpotMetrics.boom.forecastDelta !== undefined && hubSpotMetrics.boom.forecastDelta !== 0
                          ? 'vs season avg'
                          : hubSpotMetrics.boom.current_points !== undefined
                            ? 'pts wk'
                            : 'KTC/1k'
                      }
                      radar={hubSpotMetrics.mvpRadar}
                      tfoScore={hubSpotMetrics.boom.tfoScore}
                      tfoGrade={hubSpotMetrics.boom.tfoGrade}
                      tfoReasoning={hubSpotMetrics.boom.tfoReasoning}
                      tfoVerdict={hubSpotMetrics.boom.tfoVerdict}
                      leagueId={resolvedHubLeagueId}
                    />
                  ) : null}
                  {hubSpotMetrics.bust ? (
                    <PlayerHubCard
                      className="min-h-0 w-full max-h-[320px]"
                      compact
                      variant="threat"
                      playerId={hubSpotMetrics.bust.player_id}
                      name={hubSpotMetrics.bust.name}
                      position={hubSpotMetrics.bust.position}
                      team={hubSpotMetrics.bust.team}
                      photoUrl={hubSpotMetrics.bust.photoUrl}
                      projectedDelta={hubSpotMetrics.threatDelta}
                      projectedLabel={
                        hubSpotMetrics.bust.forecastDelta !== undefined && hubSpotMetrics.bust.forecastDelta !== 0
                          ? 'vs season avg'
                          : hubSpotMetrics.bust.current_points !== undefined
                            ? 'pts wk'
                            : 'KTC/1k'
                      }
                      radar={hubSpotMetrics.threatRadar}
                      tfoScore={hubSpotMetrics.bust.tfoScore}
                      tfoGrade={hubSpotMetrics.bust.tfoGrade}
                      tfoReasoning={hubSpotMetrics.bust.tfoReasoning}
                      tfoVerdict={hubSpotMetrics.bust.tfoVerdict}
                      leagueId={resolvedHubLeagueId}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <HubCardSkeleton compact />
                  <HubCardSkeleton compact />
                </>
              )}
            </div>

            <ProjectionChart
              className="min-h-0 shrink-0"
              chartBodySkeleton={!showFullDashboard}
              title="Portfolio Value"
              scoreHighlightLabel={
                chartHasPositions ? 'League total' : chartVsLeague ? 'League spread' : 'Empire Score'
              }
              scoreHighlightNumeric={
                !chartVsLeague || chartHasPositions
                  ? formatKtcHeroMain(portfolioSeries.currentTotal)
                  : undefined
              }
              scoreHighlightSuffix={!chartVsLeague || chartHasPositions ? 'KTC' : undefined}
              scoreHighlightValue={
                chartVsLeague && !chartHasPositions
                  ? `${chartPortfolioSeries.currentTotal >= 0 ? '+' : ''}${formatKtc(chartPortfolioSeries.currentTotal)} Δ`
                  : undefined
              }
              subtitle={
                chartVsLeague && chartBenchmark && !chartHasPositions
                  ? `Benchmark ${formatKtc(chartBenchmark)} KTC`
                  : selectedLeagueName
                    ? chartHasPositions
                      ? `Position breakdown · ${selectedLeagueName}`
                      : `League filter · ${selectedLeagueName}`
                    : undefined
              }
              data={chartDataValues}
              labels={portfolioSeries.labels}
              positionBreakdown={portfolioPositionBreakdown ?? null}
              annotations={[]}
              valueFormatter={(n) =>
                chartVsLeague && !chartHasPositions
                  ? `${n >= 0 ? '+' : ''}${formatKtc(n)} Δ`
                  : `${formatKtc(n)} KTC`
              }
              benchmarkValue={chartVsLeague && !chartHasPositions ? null : chartBenchmark}
              benchmarkLabel="League Average Benchmark"
              controls={chartControls}
              rightActionLabel={activeLeagueId ? '' : 'View All Trade'}
              rightActionHref="/dashboard/trade"
            />

            {showFullDashboard && data ? (
              <div className="grid grid-cols-12 gap-2 lg:gap-3 shrink-0">
                {portfolioSlice ? (
                  <StarTistCard
                    className="col-span-12 sm:col-span-6 xl:col-span-3"
                    player={{
                      player_id: portfolioSlice.player.player_id,
                      name: portfolioSlice.player.name,
                      position: portfolioSlice.player.position,
                      team: portfolioSlice.player.team,
                      photoUrl: portfolioSlice.player.photoUrl,
                    }}
                    status={portfolioSlice.winContributionPct >= 22 ? 'MVP week' : 'Carrying'}
                    metricMain={String(Math.round(portfolioSlice.ktcValue))}
                    metricSuffix=" KTC"
                    subline={`${portfolioSlice.weeklyPts.toFixed(1)} PRO pts · ${mvpLeagueN > 1 ? `${mvpLeagueIdx + 1}/${mvpLeagueN} leagues` : portfolioSlice.leagueName}`}
                    leagueLabel={
                      portfolioSlice.matchupLabel ??
                      `${portfolioSlice.player.team} · ${portfolioSlice.leagueName}`
                    }
                    winSharePct={portfolioSlice.winContributionPct}
                    sparklineValues={portfolioSlice.valueHistory}
                    tfoVerdict={portfolioSlice.tfoVerdict ?? null}
                    leagueId={portfolioSlice.leagueId}
                  />
                ) : (
                  <StarTistCard
                    className="col-span-12 sm:col-span-6 xl:col-span-3"
                    player={
                      data.starTist?.player
                        ? {
                            player_id: data.starTist.player.player_id,
                            name: data.starTist.player.name,
                            position: data.starTist.player.position,
                            team: data.starTist.player.team,
                            photoUrl: data.starTist.player.photoUrl,
                          }
                        : { player_id: '', name: 'No data', position: 'WR', team: '—' }
                    }
                    status={data.starTist?.status ?? 'Stable'}
                    metric={data.starTist?.metric ?? '— KTC'}
                    subline={data.starTist?.subline ?? 'Sync to populate'}
                  />
                )}
                <RosterRester
                  className="col-span-12 sm:col-span-6 xl:col-span-3"
                  score={data.rosterHealth.score}
                  headline={data.rosterHealth.headline}
                  entries={[
                    { tone: 'red', count: data.rosterHealth.injured, label: 'Injured / Out' },
                    { tone: 'amber', count: data.rosterHealth.questionable, label: 'Questionable' },
                    { tone: 'gray', count: data.rosterHealth.suspended, label: 'IR / Suspended' },
                  ]}
                  leagueContext={leagueContextLine}
                />
                <OvervaluedAssets
                  className="col-span-12 sm:col-span-6 xl:col-span-3"
                  players={data.overvalued}
                  contextLeagueId={resolvedHubLeagueId}
                />
                <TradeAnalyzerNote
                  className="col-span-12 xl:col-span-3"
                  body={data.tradeNote.body}
                  verdict={
                    data.tradeScenario
                      ? `BOOM ${data.tradeScenario.gainPct}%`
                      : `${data.tradeNote.verdict} ${data.tradeNote.confidence}%`
                  }
                  verdictTone={
                    data.tradeScenario
                      ? 'green'
                      : data.tradeNote.verdict === 'BOOM'
                        ? 'green'
                        : data.tradeNote.verdict === 'BUST'
                          ? 'red'
                          : 'amber'
                  }
                  tradeScenario={data.tradeScenario}
                />
                <TradeAnalyzePanel
                  className="col-span-12 xl:col-span-6"
                  latestOffers={data.latestOffers}
                  verdictByPlayerId={verdictByPlayerId}
                />
              </div>
            ) : (
              <LowerGridSkeleton />
            )}

            {showFullDashboard && data && Object.keys(exposurePlayerMap).length > 0 ? (
              <ExposureTracker
                ownedPlayerIds={data.ownedPlayerIds ?? []}
                allPlayers={exposurePlayerMap}
                leagues={data.leagues}
                verdictByPlayerId={verdictByPlayerId}
                contextLeagueId={resolvedHubLeagueId}
              />
            ) : null}

            <RecommendedTargets
              targets={data?.recommendedTargets ?? []}
              leagues={data?.leagues ?? []}
              loading={!data}
            />

            <div className="grid grid-cols-12 gap-2 lg:gap-3">
              {showFullDashboard && data ? (
                <>
                  <WaiverWatchlist
                    className="col-span-12 xl:col-span-8"
                    targets={waiverTargets}
                    leagueName={`Wk ${data.week}`}
                    leagueContextId={resolvedHubLeagueId}
                    verdictByPlayerId={verdictByPlayerId}
                    verdictByPlayerName={dynastyVerdictByName}
                  />
                  <MyLeaguesCompact
                    className="col-span-12 xl:col-span-4"
                    leagues={compactLeagues}
                    totalCount={data.empire.leaguesCount}
                    portfolioHealth={portfolioHealth}
                    selectedId={activeLeagueId}
                    onSelect={setActiveLeagueId}
                  />
                  <SleeperReport
                    className="col-span-12"
                    waiverTargets={waiverTargets}
                    ownedIds={ownedIds}
                    leagueContextId={resolvedHubLeagueId}
                    verdictByPlayerId={verdictByPlayerId}
                  />
                </>
              ) : (
                <>
                  <WaiverBlockSkeleton className="col-span-12 xl:col-span-8" />
                  <MyLeaguesSkeleton className="col-span-12 xl:col-span-4" />
                  <SleeperReportSkeleton className="col-span-12" />
                </>
              )}
            </div>
          </main>

          {showFullDashboard && data ? (
            <TradeHubSidebar
              className="order-3 hidden lg:flex lg:order-2 col-span-4 min-h-0 overflow-y-auto"
              week={data.week}
              wins={data.empire.winning}
              losses={Math.max(0, data.empire.total - data.empire.winning)}
              empireKtcMain={formatKtcHeroMain(data.empire.portfolioValue)}
              topMoves={commandHubMoves}
              leagues={leagueCommandRows}
              latestOffers={data.latestOffers}
              overvaluedPlayers={data.overvalued}
              waiverTargets={commandHubWaivers}
              contextLeagueId={resolvedHubLeagueId}
              verdictByPlayerId={verdictByPlayerId}
              crossLeagueGaps={data.crossLeagueGaps ?? []}
              userTier={tierDisplay}
              sidebarMidPremium={sidebarMidPremium}
            />
          ) : empireForUi ? (
            <TradeHubSidebar
              className="order-3 hidden lg:flex lg:order-2 col-span-4 min-h-0 overflow-y-auto"
              week={weekDisplay}
              wins={empireForUi.winning}
              losses={Math.max(0, empireForUi.total - empireForUi.winning)}
              empireKtcMain={formatKtcHeroMain(empireForUi.portfolioValue)}
              topMoves={commandHubMoves}
              leagues={leagueCommandRows}
              deferMovesAndLeagues
              latestOffers={[]}
              overvaluedPlayers={[]}
              waiverTargets={[]}
              crossLeagueGaps={[]}
              contextLeagueId={resolvedHubLeagueId}
              verdictByPlayerId={verdictByPlayerId}
              userTier={tierDisplay}
              sidebarMidPremium={sidebarMidPremium}
            />
          ) : (
            <CommandHubSkeleton className="order-3 hidden lg:flex lg:order-2 col-span-4 min-h-0" />
          )}
        </div>
      </div>
    </div>
  );
}
