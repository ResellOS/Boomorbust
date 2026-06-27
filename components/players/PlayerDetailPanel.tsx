'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HubPlayer, PlayerHubPortfolio } from '@/lib/players/types';
import type { TradeOpportunity } from '@/lib/trade/types';
import { findSimilarPlayers, initials } from '@/lib/players/utils';
import {
  bobRankFromMarket,
  buildStrengthsAndRisks,
  confidenceLabel,
  ovrLabelTier,
  positionBorderColor,
} from '@/lib/players/hubUi';
import {
  buildPlayerTradeHints,
  buildWhyBobLikes,
  comparableArchetype,
  confidencePercent,
  marketInefficiencyAction,
  metricCardLabel,
  playerFrontOfficeTitle,
  scoutingVerdict,
} from '@/lib/players/scoutingUi';
import {
  CollapsibleDossierSection,
  CountUpNumber,
  DossierTransition,
  QuickActionBtn,
  StaggerBullets,
  VerdictReveal,
  verdictGlowClass,
} from '@/components/players/playerDossierUi';
import {
  careerSnapshot,
  contractOutlook,
  formatHeight,
  formatWeight,
  peakWindowYears,
  portfolioImpactScore,
  positionPercentile,
  seasonOutlook,
  similarPercent,
} from '@/lib/players/playerIntelligence';
import {
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
  leagues: { id: string; name: string }[];
  tradeOpportunities: TradeOpportunity[];
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

function PanelCard({
  children,
  className = '',
  href,
  onClick,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  id?: string;
}) {
  const inner = (
    <div
      id={id}
      className={`rounded-[10px] border border-border bg-[#0f1420] p-3 transition-colors ${
        href || onClick ? 'dash-clickable-card cursor-pointer hover:border-boom/25' : ''
      } ${className}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function PlayerDetailPanel({
  player,
  leagueNames,
  portfolio,
  allPlayers,
  comparables,
  leagues,
  tradeOpportunities,
  onSelectPlayer,
}: PlayerDetailPanelProps) {
  const [watching, setWatching] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [showAllComparables, setShowAllComparables] = useState(false);
  const [tradeExpanded, setTradeExpanded] = useState(false);
  const archetypeRef = useRef<HTMLDivElement>(null);

  const fullComparables = useMemo(
    () => (showAllComparables ? findSimilarPlayers(allPlayers, player, 8) : comparables),
    [showAllComparables, allPlayers, player, comparables],
  );

  useEffect(() => {
    setShowAllComparables(false);
    setTradeExpanded(false);
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
  const ovrLabel = ovrLabelTier(player.tfoScore);
  const mv = player.marketVerdict;
  const hasMarket = mv && !mv.noMarketData;
  const bobRank = hasMarket ? bobRankFromMarket(mv!.ktcRank, mv!.rankDelta) : null;
  const marketRank = hasMarket ? mv!.ktcRank : null;
  const rankGap = mv?.rankDelta ?? null;
  const verdict = scoutingVerdict(hasMarket ? mv!.verdict : null, player.tfoScore, rankGap);
  const confPct = confidencePercent(player.confidenceTier);

  const direction = player.valueSignal?.direction60d ?? null;
  const trendColor =
    direction === 'up' ? '#36E7A1' : direction === 'down' ? '#A78BFA' : '#64748B';

  const { strengths, risks } = buildStrengthsAndRisks(
    player.fullName,
    c,
    player.age,
    player.confidenceTier,
  );
  const whyLikes = buildWhyBobLikes(player, c, strengths);

  const owned = leagueNames.length > 0;
  const portfolioValuePct =
    portfolio.totalPortfolioTfo > 0 && owned
      ? Math.round(((player.tfoScore * leagueNames.length) / portfolio.totalPortfolioTfo) * 1000) / 10
      : 0;
  const positionExposure = portfolio.positionSharePct[player.position] ?? 0;
  const impactScore = portfolioImpactScore(player, leagueNames.length, portfolio.totalPortfolioTfo);

  const peakYears = peakWindowYears(player.age, player.position);
  const currentYear = new Date().getFullYear();
  const posPct = positionPercentile(player, allPlayers);
  const outlook = seasonOutlook(player);
  const emptyBio = {
    heightIn: null,
    weightLbs: null,
    college: null,
    yearsExp: null,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    draftTeam: null,
    injuryStatus: null,
  };
  const career = careerSnapshot(player, bio ?? emptyBio);
  const contract = contractOutlook(bio ?? emptyBio, player.age);

  const tradeHints = buildPlayerTradeHints(player, leagueNames, leagues, tradeOpportunities);
  const archetypeLabel = comparableArchetype(player);
  const frontOfficeTitle = playerFrontOfficeTitle(player, rankGap);
  const posBorder = positionBorderColor(player.position);
  const firstName = player.fullName.split(' ')[0] ?? player.fullName;
  const hasHistory = player.scoreHistory.length >= 2;

  const newsItems = useMemo(() => {
    const items: { label: string; detail: string }[] = [];
    if (bio?.injuryStatus) {
      items.push({ label: 'Injury Status', detail: bio.injuryStatus });
    }
    if (hasMarket && mv!.rankDelta != null && Math.abs(mv!.rankDelta) >= 15) {
      items.push({
        label: 'Market Signal',
        detail: `BOB ranks ${firstName} ${Math.abs(Math.round(mv!.rankDelta))} spots ${mv!.rankDelta > 0 ? 'higher' : 'lower'} than market.`,
      });
    }
    if (direction === 'up' || direction === 'down') {
      items.push({
        label: 'Value Trajectory',
        detail: `${firstName} is ${direction === 'up' ? 'trending up' : 'trending down'} over the next 60 days.`,
      });
    }
    return items;
  }, [bio?.injuryStatus, hasMarket, mv, direction, firstName]);

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

  const metricCards = (['opportunity', 'situation', 'production', 'durability'] as const).map((k) =>
    metricCardLabel(k, player, c),
  );

  const posRank =
    allPlayers
      .filter((p) => p.position === player.position)
      .sort((a, b) => b.tfoScore - a.tfoScore)
      .findIndex((p) => p.playerId === player.playerId) + 1;

  const scrollToArchetype = () => {
    setShowAllComparables(true);
    archetypeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pid = player.playerId;
  const verdictGlow = verdictGlowClass(verdict.label);
  const isSellVerdict = verdict.label === 'SELL' || verdict.label === 'STRONG SELL';

  return (
    <DossierTransition playerId={pid}>
    <div className="flex min-h-full flex-col bg-[#0a0d14] pb-4">
      {/* Hero header — selected player dominates */}
      <div
        className="shrink-0 border-b border-border p-[18px]"
        style={{ boxShadow: `inset 0 -1px 0 ${posBorder}22` }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div
            className="relative mx-auto flex h-[160px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-[#0f1420] lg:mx-0"
            style={{ borderColor: posBorder, boxShadow: `0 0 24px ${posBorder}44` }}
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
            <div className="font-figtree text-2xl font-bold tracking-[0.5px] text-text md:text-[28px]">
              {player.fullName}
            </div>
            <div
              className="mt-0.5 font-mono text-[10px] uppercase tracking-[1.2px] text-boom"
              style={{ textShadow: '0 0 12px rgba(54,231,161,0.25)' }}
            >
              {frontOfficeTitle}
            </div>
            <div className="font-mono text-[10px] text-muted">
              {player.position} · {player.team}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-muted sm:grid-cols-4">
              <span>Age {player.age ?? '—'}</span>
              <span>{formatHeight(bio?.heightIn ?? null)}</span>
              <span>{formatWeight(bio?.weightLbs ?? null)}</span>
              <span>Exp {bio?.yearsExp ?? '—'}</span>
              <span className="col-span-2 sm:col-span-4">{bio?.college ?? '—'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <QuickActionBtn onClick={handleWatch} accent={watching}>
                {watching ? 'On Watchlist' : 'Add to Watchlist'}
              </QuickActionBtn>
              <QuickActionBtn href={`/trade?target=${pid}`} accent>
                Stage Trade
              </QuickActionBtn>
              <QuickActionBtn href={`/players?position=${player.position}&sort=rating`}>
                View Rankings
              </QuickActionBtn>
              <QuickActionBtn onClick={scrollToArchetype}>Compare Player</QuickActionBtn>
              <QuickActionBtn
                href={`https://sleeper.com/players/nfl/${pid}`}
                external
              >
                View on Sleeper
              </QuickActionBtn>
            </div>
          </div>

          <div className="mx-auto shrink-0 text-center lg:mx-0">
            <RatingGauge score={player.tfoScore} color={ovrLabel.color} animateKey={pid} />
            <div
              className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px]"
              style={{ color: ovrLabel.color }}
            >
              {ovrLabel.label}
            </div>
          </div>
        </div>
      </div>

      {/* BOB Verdict card */}
      <div className="border-b border-border p-4">
        <PanelCard
          className={`!p-4 ${isSellVerdict ? 'border-bust/25' : 'border-boom/20'} ${verdictGlow}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionLabel>BOB Verdict</SectionLabel>
              <VerdictReveal
                playerId={pid}
                label={verdict.label}
                color={verdict.color}
                glowClass={verdictGlow}
              />
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="font-mono text-[8px] uppercase text-muted">Confidence</div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-boom">
                  <CountUpNumber value={confPct} resetKey={pid} suffix="%" />
                </div>
                <div className="font-mono text-[8px] text-muted">{confidenceLabel(player.confidenceTier)}</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[8px] uppercase text-muted">Asset Tier</div>
                <div className="font-mono text-sm font-semibold uppercase text-text">{ovrLabel.label}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/trade?target=${player.playerId}`}
              className="rounded-md bg-boom px-4 py-2 font-mono text-[9px] uppercase text-bg no-underline"
            >
              Stage Trade
            </Link>
            <Link
              href={`/players?position=${player.position}&sort=rating`}
              className="rounded-md border border-border px-4 py-2 font-mono text-[9px] uppercase text-boom no-underline"
            >
              View Rankings
            </Link>
          </div>
        </PanelCard>
      </div>

      {/* Why BOB likes + Key snapshot */}
      <div className="grid shrink-0 gap-3 border-b border-border p-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionLabel>Why BOB Likes This Player</SectionLabel>
          <StaggerBullets playerId={pid} items={whyLikes} />
        </div>

        <div>
          <SectionLabel>Key Snapshot</SectionLabel>
          <div className="grid grid-cols-2 gap-2 rounded-[10px] border border-border bg-[#0f1420] p-3 font-mono text-[9px]">
            <SnapshotCell label="Position Rank" value={posRank > 0 ? `${player.position}${posRank}` : '—'} accent />
            <SnapshotCell label="BOB Rank" value={bobRank != null ? `#${bobRank}` : '—'} accent />
            <SnapshotCell label="Market Rank" value={marketRank != null ? `#${marketRank}` : '—'} />
            <SnapshotCell label="Rank Gap" accent={false}>
              {rankGap != null ? (
                <CountUpNumber
                  value={Math.abs(Math.round(rankGap))}
                  resetKey={pid}
                  prefix={rankGap > 0 ? '+' : rankGap < 0 ? '-' : ''}
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: gapColor(rankGap) }}
                />
              ) : (
                '—'
              )}
            </SnapshotCell>
            <SnapshotCell label="Positional Rank" value={posPct} className="col-span-2" />
          </div>
          {hasHistory ? (
            <div className="mt-2 rounded-[10px] border border-border bg-[#0f1420] p-2">
              <div className="mb-1 font-mono text-[8px] text-muted">Player Trajectory</div>
              <TrendSparkline values={player.scoreHistory} color={trendColor} />
            </div>
          ) : null}
          <SectionLabel>Peak Window</SectionLabel>
          <PeakWindowTimeline years={peakYears} activeYear={currentYear} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border p-4 lg:grid-cols-4">
        {metricCards.map((m, i) => (
          <PanelCard key={m.headline} className="!p-2.5">
            <div className="font-mono text-[7px] uppercase text-muted">
              {(['Opportunity', 'Situation', 'Production', 'Durability'] as const)[i]}
            </div>
            <div className="mt-1 font-figtree text-[12px] font-semibold text-text">{m.headline}</div>
            <div className="mt-1 flex items-baseline justify-between font-mono text-[9px]">
              <span className="text-muted">{m.sublabel}</span>
              <span className="text-lg font-semibold tabular-nums text-boom">{m.grade}</span>
            </div>
          </PanelCard>
        ))}
      </div>

      {/* Trade opportunities */}
      <div className="border-b border-border p-4">
        <PanelCard
          onClick={() => setTradeExpanded((v) => !v)}
          className="cursor-pointer hover:border-boom/25"
        >
          <SectionLabel>Trade Opportunities</SectionLabel>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="font-mono text-[8px] uppercase text-muted">Best Leagues to Target</div>
              {tradeHints.leagues.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {tradeHints.leagues.map((l) => (
                    <li key={l.leagueId} className="font-figtree text-[11px] text-text">
                      · {l.leagueName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-figtree text-[10px] text-muted">You roster {firstName} everywhere — sell window open.</p>
              )}
            </div>
            <div>
              <div className="font-mono text-[8px] uppercase text-muted">Best Managers to Approach</div>
              {tradeHints.managers.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {tradeHints.managers.map((m) => (
                    <li key={`${m.leagueName}-${m.name}`} className="flex justify-between font-figtree text-[11px] text-text">
                      <span>{m.name} · {m.leagueName}</span>
                      <span className="font-mono text-boom">
                        <CountUpNumber value={m.likelihood} resetKey={pid} suffix="%" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-figtree text-[10px] text-muted">Manager intel syncing</p>
              )}
            </div>
          </div>
          <div className="mt-3 rounded border border-border/60 bg-[#0a0d14] px-3 py-2">
            <div className="font-mono text-[8px] uppercase text-muted">Suggested Opening Offer</div>
            <div className="font-figtree text-[11px] text-text">{tradeHints.openingOffer}</div>
            <div className="mt-1 font-mono text-[9px] text-boom">
              <CountUpNumber value={tradeHints.acceptanceProbability} resetKey={pid} suffix="%" />
              {' '}acceptance probability
            </div>
          </div>
          {tradeExpanded ? (
            <p className="mt-2 font-figtree text-[10px] text-muted">
              BOB matched {tradeHints.leagues.length} league{tradeHints.leagues.length !== 1 ? 's' : ''} and{' '}
              {tradeHints.managers.length} manager{tradeHints.managers.length !== 1 ? 's' : ''} for this acquisition path.
            </p>
          ) : null}
          <Link
            href={`/trade?target=${pid}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline hover:underline"
          >
            Build This Offer <ChevronRight className="h-3 w-3" />
          </Link>
        </PanelCard>
      </div>

      {/* Comparables + Market Inefficiency */}
      <div className="grid shrink-0 gap-3 border-b border-border p-4 lg:grid-cols-2">
        <PanelCard onClick={() => setShowAllComparables(true)}>
          <div ref={archetypeRef} id="player-archetype">
            <SectionLabel>Player Archetype</SectionLabel>
            <div className="font-figtree text-[13px] font-semibold text-boom">{archetypeLabel}</div>
          </div>
          <SectionLabel>Closest Outcomes</SectionLabel>
          {fullComparables.length > 0 ? (
            <div className="space-y-2">
              {fullComparables.map((cp) => {
                const pct = similarPercent(player, cp);
                return (
                  <button
                    key={cp.playerId}
                    type="button"
                    onClick={() => onSelectPlayer?.(cp.playerId)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded border border-border/60 bg-[#0a0d14] p-2 text-left hover:border-boom/25"
                  >
                    <PlayerAvatar playerId={cp.playerId} name={cp.fullName} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-figtree text-[11px] text-text">{cp.fullName}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1e2640]">
                        <div
                          className="h-full rounded-full bg-boom"
                          style={{ width: `${pct}%`, boxShadow: '0 0 6px rgba(54,231,161,0.4)' }}
                        />
                      </div>
                    </div>
                    <div className="font-mono text-[11px] tabular-nums text-boom">{pct}%</div>
                  </button>
                );
              })}
              {!showAllComparables && comparables.length >= 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllComparables(true)}
                  className="w-full rounded border border-border py-1.5 font-mono text-[8px] uppercase text-boom hover:bg-boom/5"
                >
                  View Full Comparable Analysis →
                </button>
              ) : null}
            </div>
          ) : (
            <p className="font-figtree text-[11px] text-muted">Not enough peers scored for similarity yet.</p>
          )}
        </PanelCard>

        <PanelCard href={`/players?position=${player.position}&sort=rating`}>
          <SectionLabel>Market Inefficiency</SectionLabel>
          {hasMarket ? (
            <div className="space-y-2 font-mono text-[10px]">
              <IneffRow label="BOB Rank" value={bobRank != null ? `#${bobRank}` : '—'} accent />
              <IneffRow label="Consensus Rank" value={marketRank != null ? `#${marketRank}` : '—'} />
              <IneffRow
                label="Gap"
                value={rankGap != null ? `${rankGap > 0 ? '+' : ''}${Math.round(rankGap)}` : '—'}
                color={gapColor(rankGap)}
              />
              <IneffRow label="Confidence" value={confPct >= 85 ? 'Smash' : confPct >= 65 ? 'High' : 'Medium'} />
              <div className="mt-2 border-t border-border/50 pt-2">
                <div className="font-mono text-[8px] uppercase text-muted">Recommended Action</div>
                <div className="font-figtree text-[12px] font-semibold text-boom">
                  {marketInefficiencyAction(mv!.verdict, rankGap)}
                </div>
              </div>
            </div>
          ) : (
            <p className="font-figtree text-[11px] text-muted">Market data syncing…</p>
          )}
          <span className="mt-2 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom">
            View Rankings <ChevronRight className="h-3 w-3" />
          </span>
        </PanelCard>

        <PanelCard href={`/exposure`}>
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
            </div>
          ) : (
            <div className="font-figtree text-[11px] text-muted">
              <p>Not on your roster — acquiring adds +{((player.tfoScore / 100) * 2.2).toFixed(1)}% portfolio value.</p>
            </div>
          )}
          <span className="mt-2 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom">
            View Exposure <ChevronRight className="h-3 w-3" />
          </span>
        </PanelCard>

        <PanelCard>
          <SectionLabel>Season Outlook ({new Date().getFullYear()})</SectionLabel>
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

      {/* Rating history */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <CollapsibleDossierSection
          title="Rating History"
          defaultOpen={hasHistory}
          compact={!hasHistory}
        >
          {hasHistory ? (
            <RatingHistoryChart values={player.scoreHistory} dates={player.scoreHistoryDates} />
          ) : (
            <p className="py-2 text-center font-figtree text-[11px] text-muted">
              Historical tracking begins today
            </p>
          )}
        </CollapsibleDossierSection>
      </div>

      {/* News · Career · Contract */}
      <div className="grid shrink-0 gap-3 p-4 lg:grid-cols-3">
        <CollapsibleDossierSection
          title="Latest News & Notes"
          defaultOpen={newsItems.length > 0}
          compact
          href={`/players?player=${pid}#news-notes`}
        >
          <div id="news-notes">
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
          </div>
        </CollapsibleDossierSection>

        <CollapsibleDossierSection title="Career Snapshot" compact defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
            <div className="text-muted">Games<span className="mt-0.5 block text-text">{career.games}</span></div>
            <div className="text-muted">Fantasy PPG<span className="mt-0.5 block text-text">{career.fantasyPpg}</span></div>
            <div className="text-muted">Best Finish<span className="mt-0.5 block text-text">{career.bestFinish}</span></div>
            <div className="text-muted">Career Rank<span className="mt-0.5 block text-text">{career.careerRank}</span></div>
          </div>
        </CollapsibleDossierSection>

        <CollapsibleDossierSection title="Contract & Outlook" compact defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
            <div className="text-muted">Years Remaining<span className="mt-0.5 block text-text">{contract.yearsRemaining}</span></div>
            <div className="text-muted">Contract Value<span className="mt-0.5 block text-text">{contract.contractValue}</span></div>
            <div className="text-muted">Free Agency<span className="mt-0.5 block text-text">{contract.freeAgencyYear}</span></div>
            <div className="text-muted">Long-Term Outlook
              <span className="mt-0.5 block text-boom">{contract.longTermOutlook}</span>
            </div>
          </div>
        </CollapsibleDossierSection>
      </div>

      <div className="px-4 pb-4">
        <CollapsibleDossierSection
          title="Risk Flags"
          compact
          defaultOpen={risks.some((r) => !r.includes('No major'))}
        >
          {risks.some((r) => !r.includes('No major')) ? (
            <div className="rounded-[10px] border border-bust/20 bg-bust/5 p-2">
              {risks.map((r) => (
                <div key={r} className="mb-1 flex gap-2 font-figtree text-[10px] text-muted last:mb-0">
                  <span className="text-bust">⚠</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-figtree text-[10px] text-muted">No major risk flags in current profile</p>
          )}
        </CollapsibleDossierSection>
      </div>
    </div>
    </DossierTransition>
  );
}

function SnapshotCell({
  label,
  value,
  accent,
  color,
  className = '',
  children,
}: {
  label: string;
  value?: string;
  accent?: boolean;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="text-muted">{label}</div>
      <div
        className="mt-0.5 text-sm font-semibold tabular-nums"
        style={{ color: color ?? (accent ? '#36E7A1' : '#e8ecf4') }}
      >
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}

function IneffRow({
  label,
  value,
  accent,
  color,
}: {
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span style={{ color: color ?? (accent ? '#36E7A1' : '#e8ecf4') }}>{value}</span>
    </div>
  );
}
