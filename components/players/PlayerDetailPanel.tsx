'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HubPlayer, PlayerHubPortfolio } from '@/lib/players/types';
import { findSimilarPlayers, initials } from '@/lib/players/utils';
import {
  acquisitionWindow,
  bobRankFromMarket,
  buildStrengthsAndRisks,
  COMPONENT_BAR_COLORS,
  confidenceLabel,
  expectedValueChangePct,
  ovrLabelTier,
  positionBorderColor,
  recommendationLabel,
} from '@/lib/players/hubUi';
import {
  acceptanceFromGap,
  careerSnapshot,
  contractOutlook,
  dynastyArchetype,
  formatDraftCapital,
  formatHeight,
  formatWeight,
  peakWindowYears,
  portfolioImpactScore,
  positionPercentile,
  seasonOutlook,
  similarPercent,
  SKILL_DESCRIPTIONS,
} from '@/lib/players/playerIntelligence';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import {
  MarketRangeBar,
  PeakWindowTimeline,
  RatingGauge,
  RatingHistoryChart,
  TrendSparkline,
} from './PlayerHubCharts';
import PlayerAvatar from './PlayerAvatar';

const WATCHLIST_KEY = 'bb_watchlist';

interface PlayerDetailPanelProps {
  player: HubPlayer;
  leagueNames: string[];
  portfolio: PlayerHubPortfolio;
  allPlayers: HubPlayer[];
  comparables: HubPlayer[];
  onSelectPlayer?: (playerId: string) => void;
}

function gapColor(delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta)) return '#64748B';
  if (Math.abs(delta) <= 5) return '#64748B';
  return delta > 0 ? '#36E7A1' : '#A78BFA';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">{children}</div>
  );
}

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-border bg-[#0f1420] p-3 ${className}`}>{children}</div>
  );
}

function SkillBar({ label, value, display }: { label: string; value: number; display: string }) {
  const barColor = COMPONENT_BAR_COLORS[label] ?? '#64748B';
  const desc = SKILL_DESCRIPTIONS[label];
  return (
    <div className="group mb-2.5 flex items-center gap-2 last:mb-0">
      <div
        className="relative w-[100px] shrink-0 font-mono text-[8.5px] text-muted"
        title={desc}
      >
        {label}
        {desc ? (
          <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-[180px] rounded border border-border bg-[#0a0d14] p-2 font-figtree text-[9px] leading-snug text-text group-hover:block">
            {desc}
          </span>
        ) : null}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1e2640]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: `${barColor}B3`,
            boxShadow: `0 0 8px ${barColor}40`,
          }}
        />
      </div>
      <div className="w-[48px] shrink-0 text-right font-mono text-[10px] tabular-nums text-text">
        {display}
      </div>
    </div>
  );
}

export default function PlayerDetailPanel({
  player,
  leagueNames,
  portfolio,
  allPlayers,
  comparables,
  onSelectPlayer,
}: PlayerDetailPanelProps) {
  const [watching, setWatching] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);

  const fullComparables = useMemo(
    () => (showAllComparables ? findSimilarPlayers(allPlayers, player, 8) : comparables),
    [showAllComparables, allPlayers, player, comparables],
  );

  useEffect(() => {
    setShowAllComparables(false);
  }, [player.playerId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      setWatching(list.includes(player.playerId));
    } catch {
      setWatching(false);
    }
  }, [player.playerId]);

  const bio = player.bio;
  const c = player.components;
  const breakdownRows = useMemo(() => {
    if (c) {
      return [
        { label: 'Opportunity', value: Math.round(c.ops), display: String(Math.round(c.ops)) },
        { label: 'Scheme Fit', value: Math.round(c.sfs), display: String(Math.round(c.sfs)) },
        { label: 'Year-Over-Year', value: Math.round(c.yoysi), display: String(Math.round(c.yoysi)) },
        { label: 'Situation', value: Math.round(c.sit), display: String(Math.round(c.sit)) },
        {
          label: 'Projected Output',
          value: Math.round(Math.min(100, (c.projectedPpg / 28) * 100)),
          display: `${c.projectedPpg.toFixed(1)} PPG`,
        },
      ];
    }
    return [
      { label: 'Opportunity', value: player.subScores.opportunity, display: String(player.subScores.opportunity) },
      { label: 'Scheme Fit', value: player.subScores.iq, display: String(player.subScores.iq) },
      { label: 'Year-Over-Year', value: player.subScores.ageCurve, display: String(player.subScores.ageCurve) },
      { label: 'Situation', value: player.subScores.situation, display: String(player.subScores.situation) },
      { label: 'Projected Output', value: player.subScores.upside, display: String(player.subScores.upside) },
    ];
  }, [c, player.subScores]);

  const ovrLabel = ovrLabelTier(player.tfoScore);
  const mv = player.marketVerdict;
  const hasMarket = mv && !mv.noMarketData;
  const verdictColor = hasMarket ? mv!.color : '#64748B';
  const recLabel = recommendationLabel(hasMarket ? mv!.verdict : null);
  const bobRank = hasMarket ? bobRankFromMarket(mv!.ktcRank, mv!.rankDelta) : null;
  const marketRank = hasMarket ? mv!.ktcRank : null;
  const acceptancePct = acceptanceFromGap(mv?.rankDelta ?? null);

  const direction = player.valueSignal?.direction60d ?? null;
  const trendColor =
    direction === 'up' ? '#36E7A1' : direction === 'down' ? '#A78BFA' : '#64748B';
  const trendLabel =
    direction === 'up' ? 'RISING' : direction === 'down' ? 'FALLING' : 'STABLE';
  const evChange = expectedValueChangePct(direction, player.valueSignal?.prob60d ?? null);

  const { strengths, risks } = buildStrengthsAndRisks(
    player.fullName,
    c,
    player.age,
    player.confidenceTier,
  );

  const owned = leagueNames.length > 0;
  const portfolioValuePct =
    portfolio.totalPortfolioTfo > 0 && owned
      ? Math.round(((player.tfoScore * leagueNames.length) / portfolio.totalPortfolioTfo) * 1000) / 10
      : 0;
  const positionExposure = portfolio.positionSharePct[player.position] ?? 0;
  const impactScore = portfolioImpactScore(player, leagueNames.length, portfolio.totalPortfolioTfo);

  const archetype = dynastyArchetype(player);
  const peakYears = peakWindowYears(player.age, player.position);
  const currentYear = new Date().getFullYear();
  const posPct = positionPercentile(player, allPlayers);
  const outlook = seasonOutlook(player);
  const career = careerSnapshot(player, bio ?? {
    heightIn: null,
    weightLbs: null,
    college: null,
    yearsExp: null,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    draftTeam: null,
    injuryStatus: null,
  });
  const contract = contractOutlook(bio ?? {
    heightIn: null,
    weightLbs: null,
    college: null,
    yearsExp: null,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    draftTeam: null,
    injuryStatus: null,
  }, player.age);

  const handleWatch = useCallback(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = list.includes(player.playerId)
        ? list.filter((id) => id !== player.playerId)
        : [...list, player.playerId];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      setWatching(next.includes(player.playerId));
    } catch {
      setWatching((w) => !w);
    }
  }, [player.playerId]);

  const posBorder = positionBorderColor(player.position);
  const firstName = player.fullName.split(' ')[0] ?? player.fullName;

  const newsItems = useMemo(() => {
    const items: { label: string; detail: string; tone: 'injury' | 'note' | 'market' }[] = [];
    if (bio?.injuryStatus) {
      items.push({
        label: 'Injury Status',
        detail: bio.injuryStatus,
        tone: 'injury',
      });
    }
    if (hasMarket && mv!.rankDelta != null && Math.abs(mv!.rankDelta) >= 15) {
      items.push({
        label: 'Market Signal',
        detail: `BOB ranks ${firstName} ${Math.abs(Math.round(mv!.rankDelta))} spots ${mv!.rankDelta > 0 ? 'higher' : 'lower'} than market consensus.`,
        tone: 'market',
      });
    }
    if (direction === 'up' || direction === 'down') {
      items.push({
        label: 'Value Trajectory',
        detail: `${firstName} is ${direction === 'up' ? 'trending up' : 'trending down'} over the next 60 days (${evChange}% expected shift).`,
        tone: 'note',
      });
    }
    return items;
  }, [bio?.injuryStatus, hasMarket, mv, direction, evChange, firstName]);

  return (
    <div className="flex min-h-full flex-col bg-[#0a0d14] pb-4">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-[18px]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div
            className="relative mx-auto flex h-[140px] w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-[#0f1420] lg:mx-0"
            style={{ borderColor: posBorder, boxShadow: `0 0 16px ${posBorder}33` }}
          >
            {!imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://sleepercdn.com/content/nfl/players/thumb/${player.playerId}.jpg`}
                alt={player.fullName}
                className="absolute inset-0 h-full w-full object-cover object-top"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span className="font-mono text-[22px] text-muted">{initials(player.fullName)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-figtree text-xl tracking-[0.5px] text-text md:text-2xl">
                  {player.fullName.toUpperCase()}
                </div>
                <div className="font-mono text-[9px] text-muted">
                  {player.position} · {player.team}
                </div>
              </div>
              <span
                className="rounded border border-boom/25 bg-boom/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[1px] text-boom"
              >
                {archetype}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-muted sm:grid-cols-4">
              <span>Age {player.age ?? '—'}</span>
              <span>{formatHeight(bio?.heightIn ?? null)}</span>
              <span>{formatWeight(bio?.weightLbs ?? null)}</span>
              <span>Exp {bio?.yearsExp ?? '—'}</span>
              <span className="col-span-2 sm:col-span-4">{bio?.college ?? '—'}</span>
              <span className="col-span-2 sm:col-span-4">Draft {formatDraftCapital(bio ?? {
                heightIn: null,
                weightLbs: null,
                college: null,
                yearsExp: null,
                draftYear: null,
                draftRound: null,
                draftPick: null,
                draftTeam: null,
                injuryStatus: null,
              })}</span>
            </div>

            <button
              type="button"
              onClick={handleWatch}
              className={`mt-3 rounded-md border px-3 py-1.5 font-mono text-[9px] uppercase tracking-wide ${
                watching ? 'border-boom text-boom' : 'border-muted text-muted hover:text-text'
              }`}
            >
              {watching ? 'On Watchlist' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>

      {/* Rating · Trend · BOB */}
      <div className="grid shrink-0 gap-3 border-b border-border p-4 lg:grid-cols-3">
        <PanelCard>
          <SectionLabel>Dynasty Rating</SectionLabel>
          <RatingGauge score={player.tfoScore} color={ovrLabel.color} />
          <div
            className="mt-2 text-center font-mono text-[9px] uppercase tracking-[1.5px]"
            style={{ color: ovrLabel.color, textShadow: ovrLabel.glow }}
          >
            {ovrLabel.label}
          </div>
          <div className="mt-1 text-center font-mono text-[9px] text-muted">{posPct}</div>
          <SectionLabel>Peak Window</SectionLabel>
          <PeakWindowTimeline years={peakYears} activeYear={currentYear} />
        </PanelCard>

        <PanelCard>
          <SectionLabel>Trend & Outlook</SectionLabel>
          <div className="font-mono text-lg uppercase" style={{ color: trendColor }}>
            {trendLabel}
          </div>
          {direction === 'up' || direction === 'down' ? (
            <div className="mt-1 font-mono text-[11px] tabular-nums" style={{ color: trendColor }}>
              Expected Value Change: {direction === 'up' ? '+' : '-'}
              {evChange}% · 12 Month Outlook
            </div>
          ) : (
            <div className="mt-1 font-figtree text-[11px] text-muted">Stable value expected over next 12 months</div>
          )}
          {player.scoreHistory.length >= 2 ? (
            <div className="mt-3">
              <div className="mb-1 font-mono text-[8px] text-muted">Historical Rating Trajectory</div>
              <TrendSparkline values={player.scoreHistory} color={trendColor} />
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-muted">
            <span className="text-boom">✓</span>
            {confidenceLabel(player.confidenceTier)}
          </div>
        </PanelCard>

        <PanelCard className="border-boom/15">
          <SectionLabel>BOB Recommendation</SectionLabel>
          <div
            className="font-figtree text-2xl uppercase tracking-wide md:text-3xl"
            style={{ color: verdictColor, textShadow: `0 0 14px ${verdictColor}55` }}
          >
            {recLabel}
          </div>
          <div className="mt-2 space-y-1 font-mono text-[10px] tabular-nums">
            <div className="flex justify-between text-muted">
              <span>Market Rank</span>
              <span className="text-text">{marketRank ?? '—'}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>BOB Rank</span>
              <span className="text-text">{bobRank ?? '—'}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Value Gap</span>
              <span style={{ color: gapColor(mv?.rankDelta) }}>
                {mv?.rankDelta != null ? `${mv.rankDelta > 0 ? '+' : ''}${Math.round(mv.rankDelta)} Spots` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Acquisition Window</span>
              <span className="text-boom">
                {acquisitionWindow(hasMarket ? mv!.verdict : null, direction)}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[8px] text-muted">
              <span>Acceptance Probability</span>
              <span className="text-text">{acceptancePct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1e2640]">
              <div
                className="h-full rounded-full bg-boom"
                style={{ width: `${acceptancePct}%`, boxShadow: '0 0 8px rgba(54,231,161,0.5)' }}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <Link
              href={`/trade?target=${player.playerId}`}
              className="rounded-md bg-boom py-2 text-center font-mono text-[8px] uppercase text-bg no-underline"
            >
              Trade For
            </Link>
            <Link
              href={`/trade?target=${player.playerId}&mode=offer`}
              className="rounded-md border border-bust py-2 text-center font-mono text-[8px] uppercase text-bust no-underline"
            >
              Trade Away
            </Link>
            <button
              type="button"
              onClick={handleWatch}
              className={`rounded-md border py-2 font-mono text-[8px] uppercase ${
                watching ? 'border-boom text-boom' : 'border-muted text-muted'
              }`}
            >
              Watch
            </button>
          </div>
        </PanelCard>
      </div>

      {/* Skills + Why */}
      <div className="grid shrink-0 gap-3 border-b border-border p-4 lg:grid-cols-2">
        <div>
          <SectionLabel>Core Skills</SectionLabel>
          {breakdownRows.map((row) => (
            <SkillBar key={row.label} label={row.label} value={row.value} display={row.display} />
          ))}
        </div>
        <div>
          <SectionLabel>Why is his rating {player.tfoScore.toFixed(1)}?</SectionLabel>
          <div className="grid gap-3 rounded-[8px] border border-border bg-[#0f1420] p-3 md:grid-cols-2">
            <div>
              <div className="mb-2 font-mono text-[8px] uppercase text-boom">Strengths</div>
              {strengths.map((s) => (
                <div key={s} className="mb-1.5 flex gap-2 font-figtree text-[10px] leading-snug text-muted">
                  <span className="text-boom">✓</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 font-mono text-[8px] uppercase text-bust">Risks</div>
              {risks.map((r) => (
                <div key={r} className="mb-1.5 flex gap-2 font-figtree text-[10px] leading-snug text-muted">
                  <span className="text-bust">⚠</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparables · Market · Portfolio · Season */}
      <div className="grid shrink-0 gap-3 border-b border-border p-4 lg:grid-cols-2">
        <PanelCard>
          <SectionLabel>Comparables</SectionLabel>
          {fullComparables.length > 0 ? (
            <div className="space-y-2">
              {fullComparables.map((cp) => (
                <button
                  key={cp.playerId}
                  type="button"
                  onClick={() => onSelectPlayer?.(cp.playerId)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded border border-border/60 bg-[#0a0d14] p-2 text-left transition-colors hover:border-boom/20"
                >
                  <PlayerAvatar playerId={cp.playerId} name={cp.fullName} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-figtree text-[11px] text-text">{cp.fullName}</div>
                    <div className="font-mono text-[8px] text-muted">
                      {similarPercent(player, cp)}% similar · Peak{' '}
                      {Math.max(cp.tfoScore, ...(cp.scoreHistory.length ? cp.scoreHistory : [cp.tfoScore])).toFixed(1)} · Now{' '}
                      {cp.tfoScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="font-mono text-[12px] tabular-nums text-boom">{cp.tfoScore.toFixed(1)}</div>
                </button>
              ))}
              {!showAllComparables && comparables.length >= 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllComparables(true)}
                  className="w-full cursor-pointer rounded border border-border py-1.5 font-mono text-[8px] uppercase text-muted hover:text-boom"
                >
                  View Full Comparables
                </button>
              ) : null}
            </div>
          ) : (
            <p className="font-figtree text-[11px] text-muted">Not enough peers scored for similarity yet.</p>
          )}
        </PanelCard>

        <PanelCard>
          <SectionLabel>Market Comparison</SectionLabel>
          {hasMarket ? (
            <>
              <MarketRangeBar bobRank={bobRank} marketRank={marketRank} />
              <div className="mt-2 font-mono text-[10px] tabular-nums">
                <span style={{ color: gapColor(mv?.rankDelta) }}>
                  Value Gap: {mv?.rankDelta != null ? `${mv.rankDelta > 0 ? '+' : ''}${Math.round(mv.rankDelta)} spots` : '—'}
                </span>
              </div>
            </>
          ) : (
            <p className="font-figtree text-[11px] text-muted">Market data syncing…</p>
          )}
        </PanelCard>

        <PanelCard>
          <SectionLabel>Portfolio Impact</SectionLabel>
          {owned ? (
            <div className="space-y-1.5 font-figtree text-[11px] text-muted">
              <p className="text-text">Own in {leagueNames.length} league{leagueNames.length !== 1 ? 's' : ''}</p>
              <p>
                Portfolio Value:{' '}
                <span className="font-mono tabular-nums text-text">{portfolioValuePct}%</span>
              </p>
              <p>
                {player.position} Exposure:{' '}
                <span className="font-mono tabular-nums text-text">{positionExposure}%</span>
              </p>
              <p>
                Impact Score:{' '}
                <span className="font-mono tabular-nums text-boom">{impactScore}</span>
              </p>
              <ul className="mt-1 space-y-0.5">
                {leagueNames.slice(0, 4).map((name) => (
                  <li key={name} className="font-mono text-[9px]">· {name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="font-figtree text-[11px] text-muted">
              <p>
                Not on your roster. BOB rates {firstName}{' '}
                <span style={{ color: verdictColor }}>
                  {hasMarket ? formatMarketVerdictLabel(mv!.verdict) : 'Hold'}
                </span>
                .
              </p>
              <Link href={`/trade?target=${player.playerId}`} className="mt-1 inline-block font-mono text-[10px] text-boom no-underline">
                Find Trade →
              </Link>
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <SectionLabel>Season Outlook (2026)</SectionLabel>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="text-muted">
              Projected Finish
              <div className="text-text">{outlook.projectedFinish}</div>
            </div>
            <div className="text-muted">
              Fantasy Points
              <div className="text-text">{outlook.fantasyPoints}</div>
            </div>
            <div className="text-muted">
              Games Played
              <div className="text-text">{outlook.gamesPlayed}</div>
            </div>
            <div className="text-muted">
              Range of Outcomes
              <div className="text-boom">{outlook.range}</div>
            </div>
          </div>
        </PanelCard>
      </div>

      {/* Rating History */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <SectionLabel>Rating History</SectionLabel>
        <RatingHistoryChart values={player.scoreHistory} dates={player.scoreHistoryDates} />
      </div>

      {/* News · Career · Contract */}
      <div className="grid shrink-0 gap-3 p-4 lg:grid-cols-3">
        <PanelCard>
          <SectionLabel>Latest News & Notes</SectionLabel>
          {newsItems.length > 0 ? (
            <div className="space-y-2">
              {newsItems.map((n) => (
                <div key={n.label} className="border-b border-border/40 pb-2 last:border-0">
                  <div className="font-mono text-[8px] uppercase text-muted">{n.label}</div>
                  <div className="font-figtree text-[10px] leading-snug text-text">{n.detail}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-figtree text-[11px] text-muted">No active flags — BOB monitors injuries and depth chart moves.</p>
          )}
        </PanelCard>

        <PanelCard>
          <SectionLabel>Career Snapshot</SectionLabel>
          <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
            <div className="text-muted">Games<span className="mt-0.5 block text-text">{career.games}</span></div>
            <div className="text-muted">Fantasy PPG<span className="mt-0.5 block text-text">{career.fantasyPpg}</span></div>
            <div className="text-muted">Best Finish<span className="mt-0.5 block text-text">{career.bestFinish}</span></div>
            <div className="text-muted">Career Rank<span className="mt-0.5 block text-text">{career.careerRank}</span></div>
          </div>
        </PanelCard>

        <PanelCard>
          <SectionLabel>Contract & Outlook</SectionLabel>
          <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
            <div className="text-muted">Years Remaining<span className="mt-0.5 block text-text">{contract.yearsRemaining}</span></div>
            <div className="text-muted">Contract Value<span className="mt-0.5 block text-text">{contract.contractValue}</span></div>
            <div className="text-muted">Free Agency<span className="mt-0.5 block text-text">{contract.freeAgencyYear}</span></div>
            <div className="text-muted">Long-Term Outlook
              <span className="mt-0.5 block text-boom">{contract.longTermOutlook}</span>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
