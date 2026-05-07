'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { useDashboardSnapshot } from '@/hooks/useDashboardSnapshot';
import { useHubRotation } from '@/hooks/useHubRotation';
import ProjectionChart from '@/components/dashboard/ProjectionChart';
import PlayerHubCard from '@/components/dashboard/PlayerHubCard';
import StarTistCard from '@/components/dashboard/StarTistCard';
import RosterRester from '@/components/dashboard/RosterRester';
import WaiverWatchlist, { type WaiverTarget } from '@/components/dashboard/WaiverWatchlist';
import TradeAnalyzerNote from '@/components/dashboard/TradeAnalyzerNote';
import MyLeaguesCompact, { type CompactLeague } from '@/components/dashboard/MyLeaguesCompact';
import OvervaluedAssets from '@/components/dashboard/OvervaluedAssets';
import TradeHubSidebar, {
  type MarketTrendRow,
  type LatestOfferRow,
  type PlayerGapRow,
} from '@/components/dashboard/TradeHubSidebar';
import { getRadarMetrics, inferTFOInputFromHub } from '@/components/dashboard/radarMetrics';
import { calculateTFOScore, type TFOVerdict } from '@/lib/tfo/formula';
import type { RotationPlayer } from '@/app/api/dashboard/snapshot/route';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';

const PLACEHOLDER_LEAGUES: CompactLeague[] = [
  { id: '1', name: 'Sync Pending', tone: 'gray', meta: 'Awaiting data' },
];

const PLACEHOLDER_WAIVERS: WaiverTarget[] = [];
const PLACEHOLDER_TRENDS: MarketTrendRow[] = [];
const PLACEHOLDER_OFFERS: LatestOfferRow[] = [];
const PLACEHOLDER_GAPS: PlayerGapRow[] = [];

function formatKtc(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
}

/** Empire headline: lowercase k (e.g. 679.8k). */
function formatKtcHeroMain(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toString();
}

function hubFromRotation(p: RotationPlayer) {
  return {
    player_id: p.player_id,
    position: p.position,
    team: p.team,
    ktc_value: p.ktc_value,
    seasonAvgPpg: p.seasonAvgPpg,
    current_points: p.current_points,
    forecastDelta: p.forecastDelta,
  };
}

function tfoFromRotation(p: RotationPlayer | null, forecast: 'boom' | 'bust') {
  if (!p) return null;
  return calculateTFOScore(inferTFOInputFromHub(hubFromRotation(p), forecast));
}

function TierInlineBadge({ tier }: { tier: 'free' | 'pro' | 'elite' }) {
  const styles =
    tier === 'elite'
      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
      : tier === 'pro'
        ? 'bg-[var(--indigo)]/25 border-[var(--indigo)]/50 text-[var(--indigo-light)]'
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

function normalizeTimeLabels(labels: string[], n: number): string[] {
  if (n !== 3) return labels;
  return ['Y-2', 'Y-1', 'Now'];
}

export default function DashboardPage() {
  const { loading, error, data } = useDashboardSnapshot();
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

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const ownedIds = useMemo(() => {
    const ids = data?.ownedPlayerIds;
    if (!ids?.length) return null as Set<string> | null;
    return new Set(ids);
  }, [data?.ownedPlayerIds]);

  const mvpPoolRaw = data?.topRotation ?? [];
  const mvpPool = useMemo(() => {
    if (!ownedIds) return mvpPoolRaw;
    return mvpPoolRaw.filter((p) => ownedIds.has(p.player_id));
  }, [mvpPoolRaw, ownedIds]);

  const threatPoolRaw = data?.threatRotation ?? [];
  const threatPool = useMemo(() => {
    if (!ownedIds) return threatPoolRaw;
    return threatPoolRaw.filter((p) => ownedIds.has(p.player_id));
  }, [threatPoolRaw, ownedIds]);

  const portfolioRows = useMemo(() => {
    const rows = data?.portfolioMvpByLeague ?? [];
    if (!ownedIds) return rows;
    return rows.filter((s) => ownedIds.has(s.player.player_id));
  }, [data?.portfolioMvpByLeague, ownedIds]);

  const mvpIndex = useHubRotation(Math.max(1, mvpPool.length), 8000);
  const threatIndex = useHubRotation(Math.max(1, threatPool.length), 8000);

  const mvpLeagueN = portfolioRows.length;
  const mvpLeagueIdx = useHubRotation(Math.max(1, mvpLeagueN || 1), 6000);

  const healthN = data?.leagueHealthRotation?.length ?? 0;
  const healthIdx = useHubRotation(Math.max(1, healthN || 1), 5000);

  const portfolioSeries = useMemo(() => {
    const history = data?.portfolioHistory ?? [];
    if (!history.length) {
      const fallback = (data?.empire.portfolioValue ?? 0) || 0;
      return {
        values: [fallback * 0.94, fallback * 0.97, fallback],
        labels: ['Y-2', 'Y-1', 'Now'],
        currentTotal: fallback,
      };
    }
    if (selectedLeagueId) {
      const values = history.map((p) => p.byLeague[selectedLeagueId] ?? 0);
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
  }, [data, selectedLeagueId]);

  const [chartVsLeague, setChartVsLeague] = useState(false);

  const chartBenchmark = useMemo(() => {
    if (!data) return null;
    if (selectedLeagueId) return data.leaguePortfolioBenchmark[selectedLeagueId] ?? null;
    return data.portfolioBenchmark > 0 ? data.portfolioBenchmark : null;
  }, [data, selectedLeagueId]);

  const chartPortfolioSeries = useMemo(() => {
    if (!chartVsLeague || chartBenchmark == null || chartBenchmark <= 0) return portfolioSeries;
    return {
      values: portfolioSeries.values.map((v) => v - chartBenchmark),
      labels: portfolioSeries.labels,
      currentTotal: portfolioSeries.currentTotal - chartBenchmark,
    };
  }, [portfolioSeries, chartVsLeague, chartBenchmark]);

  const portfolioHealth = useMemo(() => {
    const list = data?.leagues ?? [];
    const total = list.length;
    const winning = list.filter((l) => l.healthScore >= 70).length;
    const atRisk = list.filter((l) => l.healthScore < 50).length;
    return { total, winning, atRisk };
  }, [data?.leagues]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#080A0F]">
        <div className="text-[#36E7A1] font-black italic uppercase tracking-widest animate-pulse mb-2 font-mono-tactical">
          Syncing Empire...
        </div>
        <p className="text-slate-600 text-[10px] uppercase tracking-tighter font-mono-tactical">
          Pulling live Sleeper data
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#080A0F] px-6 text-center">
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

  const activeMvp: RotationPlayer | null =
    mvpPool[mvpIndex] ??
    (data.mvp && (!ownedIds || ownedIds.has(data.mvp.player_id))
      ? {
          player_id: data.mvp.player_id,
          name: data.mvp.name,
          position: data.mvp.position,
          team: data.mvp.team,
          photoUrl: data.mvp.photoUrl,
          current_points: data.mvp.current_points,
          ktc_value: 0,
        }
      : null);

  const activeThreat: RotationPlayer | null =
    threatPool[threatIndex] ??
    (data.threat && (!ownedIds || ownedIds.has(data.threat.player_id))
      ? {
          player_id: data.threat.player_id,
          name: data.threat.name,
          position: data.threat.position,
          team: data.threat.team,
          photoUrl: data.threat.photoUrl,
          current_points: data.threat.current_points,
          ktc_value: 0,
        }
      : null);

  const mvpDelta =
    activeMvp?.forecastDelta ??
    activeMvp?.current_points ??
    (activeMvp?.ktc_value ? activeMvp.ktc_value / 1000 : 0);
  const threatDelta =
    activeThreat?.forecastDelta ??
    activeThreat?.current_points ??
    (activeThreat?.ktc_value ? activeThreat.ktc_value / 1000 : 0);

  const mvpRadar = activeMvp
    ? getRadarMetrics(activeMvp.position, activeMvp.player_id, undefined, 'boom', { hub: activeMvp })
    : getRadarMetrics('RB', 'placeholder-mvp', undefined, 'boom');
  const threatRadar = activeThreat
    ? getRadarMetrics(activeThreat.position, activeThreat.player_id, undefined, 'bust', { hub: activeThreat })
    : getRadarMetrics('QB', 'placeholder-threat', undefined, 'bust');

  const mvpTfo = tfoFromRotation(activeMvp, 'boom');
  const threatTfo = tfoFromRotation(activeThreat, 'bust');

  const waiverTargets: WaiverTarget[] =
    data.waivers.length > 0
      ? data.waivers.map((w) => ({
          name: w.name,
          position: w.position,
          team: w.team,
          addValue: w.addValue,
          ownedPct: 0,
          trending: w.trending,
          photoUrl: w.photoUrl,
        }))
      : PLACEHOLDER_WAIVERS;

  const compactLeagues: CompactLeague[] =
    data.leagues.length > 0
      ? data.leagues.map((lg) => ({
          id: lg.id,
          name: lg.name,
          tone: lg.signalTone,
          healthScore: lg.healthScore,
          meta:
            lg.weekScore !== null && lg.oppScore !== null
              ? `${lg.weekScore.toFixed(1)} — ${lg.oppScore.toFixed(1)}`
              : `Health ${lg.healthScore}`,
        }))
      : PLACEHOLDER_LEAGUES;

  const marketTrends: MarketTrendRow[] =
    data.marketTrends.length > 0 ? data.marketTrends : PLACEHOLDER_TRENDS;
  const latestOffers: LatestOfferRow[] =
    data.latestOffers.length > 0 ? data.latestOffers : PLACEHOLDER_OFFERS;
  const playerGaps: PlayerGapRow[] =
    data.playerGaps.length > 0 ? data.playerGaps : PLACEHOLDER_GAPS;

  const selectedLeagueName = selectedLeagueId
    ? data.leagues.find((l) => l.id === selectedLeagueId)?.name
    : null;

  const portfolioSlice =
    portfolioRows.length > 0
      ? portfolioRows[Math.min(mvpLeagueIdx, portfolioRows.length - 1)]!
      : null;

  const healthSlice =
    data.leagueHealthRotation.length > 0
      ? data.leagueHealthRotation[Math.min(healthIdx, data.leagueHealthRotation.length - 1)]!
      : null;

  const leagueContextLine = healthSlice
    ? `${healthSlice.leagueName} · roster ${healthSlice.readinessScore}% · ${healthSlice.injured} out · ${healthSlice.questionable} Q · ${healthSlice.suspended} IR`
    : undefined;

  const chartControls = (
    <div className="flex items-center gap-2">
      {chartBenchmark != null && chartBenchmark > 0 && (
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
      {selectedLeagueId ? (
        <button
          type="button"
          onClick={() => setSelectedLeagueId(null)}
          className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors font-mono-tactical"
        >
          Clear league
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className="h-screen overflow-hidden px-2 pt-2 pb-20 lg:pb-2 lg:px-4 bg-[#060910]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 140% 90% at 50% -18%, rgba(34,211,238,0.075), transparent 55%), radial-gradient(ellipse 70% 45% at 92% 100%, rgba(54,231,161,0.045), transparent 50%)',
      }}
    >
      <div className="h-full rounded-xl border border-white/[0.12] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.65)] bg-white/[0.035] backdrop-blur-[32px] backdrop-saturate-150 flex flex-col ring-1 ring-white/[0.05]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-black/25 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/images/logo-icon.png" alt="" height={28} width={28} className="h-7 w-7 shrink-0 object-contain" />
            <span
              className="truncate text-[24px] font-bold uppercase tracking-[0.05em] text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BOOM OR BUST
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono-tactical text-[12px] text-[#94A3B8]">
            <span className="live-dot shrink-0" />
            <span className="whitespace-nowrap">
              WEEK {data.week} · {data.empire.winning}W-{Math.max(0, data.empire.total - data.empire.winning)}L
            </span>
          </div>
          <TierInlineBadge tier={data.userTier} />
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-2 lg:gap-3 p-2 lg:p-3">
          <main className="col-span-12 lg:col-span-9 flex flex-col gap-2 lg:gap-3 min-h-0 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 lg:gap-3 shrink-0 min-h-0">
              <ProjectionChart
                className="col-span-12 xl:col-span-8 min-h-0"
                title="Portfolio Value"
                scoreHighlightLabel={chartVsLeague ? 'League spread' : 'Empire Score'}
                scoreHighlightNumeric={
                  !chartVsLeague ? formatKtcHeroMain(portfolioSeries.currentTotal) : undefined
                }
                scoreHighlightSuffix={!chartVsLeague ? 'KTC' : undefined}
                scoreHighlightValue={
                  chartVsLeague
                    ? `${chartPortfolioSeries.currentTotal >= 0 ? '+' : ''}${formatKtc(chartPortfolioSeries.currentTotal)} Δ`
                    : undefined
                }
                subtitle={
                  chartVsLeague && chartBenchmark
                    ? `Benchmark ${formatKtc(chartBenchmark)} KTC`
                    : selectedLeagueName
                      ? `League filter · ${selectedLeagueName}`
                      : undefined
                }
                data={chartPortfolioSeries.values}
                labels={chartPortfolioSeries.labels}
                annotations={[]}
                valueFormatter={(n) =>
                  chartVsLeague ? `${n >= 0 ? '+' : ''}${formatKtc(n)} Δ` : `${formatKtc(n)} KTC`
                }
                benchmarkValue={chartVsLeague ? null : chartBenchmark}
                benchmarkLabel="League Average Benchmark"
                controls={chartControls}
                rightActionLabel={selectedLeagueId ? '' : 'View All Trade'}
                rightActionHref="/dashboard/trade"
              />

              <div className="col-span-12 xl:col-span-4 grid grid-cols-2 gap-2 lg:gap-3 min-h-0">
                <PlayerHubCard
                  variant="mvp"
                  name={activeMvp?.name ?? 'MVP TBD'}
                  position={activeMvp?.position ?? 'RB'}
                  team={activeMvp?.team ?? '—'}
                  photoUrl={activeMvp?.photoUrl}
                  projectedDelta={mvpDelta}
                  projectedLabel={
                    activeMvp?.forecastDelta !== undefined && activeMvp.forecastDelta !== 0
                      ? 'vs season avg'
                      : activeMvp?.current_points !== undefined
                        ? 'pts wk'
                        : 'KTC/1k'
                  }
                  radar={mvpRadar}
                  rotationIndex={mvpPool.length > 1 ? mvpIndex : undefined}
                  rotationTotal={mvpPool.length > 1 ? mvpPool.length : undefined}
                  tfoScore={mvpTfo?.tfoScore}
                  tfoGrade={mvpTfo?.grade}
                  tfoReasoning={mvpTfo?.reasoning}
                />
                <PlayerHubCard
                  variant="threat"
                  name={activeThreat?.name ?? 'Bust TBD'}
                  position={activeThreat?.position ?? 'QB'}
                  team={activeThreat?.team ?? '—'}
                  photoUrl={activeThreat?.photoUrl}
                  projectedDelta={threatDelta}
                  projectedLabel={
                    activeThreat?.forecastDelta !== undefined && activeThreat.forecastDelta !== 0
                      ? 'vs season avg'
                      : activeThreat?.current_points !== undefined
                        ? 'pts wk'
                        : 'KTC/1k'
                  }
                  radar={threatRadar}
                  rotationIndex={threatPool.length > 1 ? threatIndex : undefined}
                  rotationTotal={threatPool.length > 1 ? threatPool.length : undefined}
                  tfoScore={threatTfo?.tfoScore}
                  tfoGrade={threatTfo?.grade}
                  tfoReasoning={threatTfo?.reasoning}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 lg:gap-3 shrink-0">
              {portfolioSlice ? (
                <StarTistCard
                  className="col-span-12 sm:col-span-6 xl:col-span-3"
                  player={{
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
                />
              ) : (
                <StarTistCard
                  className="col-span-12 sm:col-span-6 xl:col-span-3"
                  player={
                    data.starTist?.player
                      ? {
                          name: data.starTist.player.name,
                          position: data.starTist.player.position,
                          team: data.starTist.player.team,
                          photoUrl: data.starTist.player.photoUrl,
                        }
                      : { name: 'No data', position: 'WR', team: '—' }
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
            </div>

            <div className="grid grid-cols-12 gap-2 lg:gap-3 flex-1 min-h-0">
              <WaiverWatchlist
                className="col-span-12 xl:col-span-8 min-h-0 overflow-y-auto"
                targets={waiverTargets}
                leagueName={`Wk ${data.week}`}
                verdictByPlayerName={dynastyVerdictByName}
              />
              <MyLeaguesCompact
                className="col-span-12 xl:col-span-4 min-h-0 overflow-y-auto"
                leagues={compactLeagues}
                totalCount={data.empire.leaguesCount}
                portfolioHealth={portfolioHealth}
                selectedId={selectedLeagueId}
                onSelect={setSelectedLeagueId}
              />
            </div>
          </main>

          <TradeHubSidebar
            className="hidden lg:flex col-span-3 min-h-0 overflow-y-auto"
            marketTrends={marketTrends}
            latestOffers={latestOffers}
            playerGaps={playerGaps}
            offersLeague={`Wk ${data.week}`}
          />
        </div>
      </div>
    </div>
  );
}
