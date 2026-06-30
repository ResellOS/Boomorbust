'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdBox from '@/components/AdBox';
import PlayerBhsActions from '@/components/dashboard/PlayerBhsActions';
import type { OvervaluedPlayer, CrossLeagueGap } from '@/app/api/dashboard/snapshot/route';

/** ── Legacy row types (dashboard snapshot / older imports) ───────────────── */
export interface MarketTrendRow {
  label: string;
  value: number;
  delta: number;
  unit?: string;
}

export interface LatestOfferRow {
  id: string;
  player: string;
  position: string;
  team: string;
  league: string;
  score: number;
  photoUrl?: string;
}

export interface PlayerGapRow {
  id: string;
  player: string;
  positionLabel: string;
  pct: number;
}

export interface TradeSide {
  name: string;
  position: string;
  team: string;
  delta: number;
  initials?: string;
}
export interface TradeOffer {
  send: TradeSide;
  receive: TradeSide;
  confidence: number;
  verdict: 'BOOM' | 'BUST' | 'FAIR';
}
export interface RankingRow {
  rank: number;
  name: string;
  position: string;
  team: string;
  pts: number;
  change: number;
}
export interface LeagueMinimal {
  id: string;
  name: string;
  ticker: string;
  healthScore: number;
  primarySignal: 'BOOM' | 'BUST' | 'STABLE';
}

export type TopMoveAction = 'BUY' | 'SELL' | 'ADD' | 'DROP';

export interface TopMoveRow {
  action: TopMoveAction;
  playerName: string;
  reason: string;
}

export interface LeagueStatusRow {
  id: string;
  name: string;
  healthScore: number;
  signal: 'BOOM' | 'BUST' | 'STABLE';
}

/** Waiver row slice for TOP ADDS (maps from snapshot waivers). */
export interface WaiverSidebarTarget {
  player_id: string;
  name: string;
  position: string;
  addValue: string;
  tfoScore?: number;
  signal?: string;
  verdict?: string;
}

interface Props {
  week: number;
  wins: number;
  losses: number;
  /** Main empire portfolio readout, e.g. "679.8k" */
  empireKtcMain: string;
  topMoves: TopMoveRow[];
  leagues: LeagueStatusRow[];
  /** Top moves + league rows show skeleton until full snapshot is ready. */
  deferMovesAndLeagues?: boolean;
  onClose?: () => void;
  className?: string;
  /** Pending trade legs from snapshot — grouped into inbox rows client-side. */
  latestOffers?: LatestOfferRow[];
  /** Overvalued players for SELL HIGHS (expects snapshot order). */
  overvaluedPlayers?: OvervaluedPlayer[];
  /** Waiver targets for TOP ADDS (pass pre-sorted top picks). */
  waiverTargets?: WaiverSidebarTarget[];
  /** League id for BHS trade finder links. */
  contextLeagueId?: string | null;
  /** `tfo_cache.verdict` by Sleeper player id. */
  verdictByPlayerId?: Record<string, string>;
  /** When true, week reads "OFF" instead of "WK n". */
  isOffseason?: boolean;
  /** Subscription tier — drives mid-sidebar ad vs premium slot. */
  userTier?: 'free' | 'pro' | 'elite';
  /** Pro = coach quick ask, Elite = weekly report (wrapped by parent). */
  sidebarMidPremium?: ReactNode;
  /** Top 3 positional slots weak across multiple leagues (from crossLeagueGaps). */
  crossLeagueGaps?: CrossLeagueGap[];
}

const POS_BADGE: Record<string, string> = {
  QB: '#FEBC2E',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
  K: '#94A3B8',
  DEF: '#94A3B8',
};

const KTC_SCALE = 220;

function leagueDotColor(score: number): string {
  if (score >= 70) return '#36E7A1';
  if (score >= 50) return '#FBBF24';
  return '#EF4444';
}

function truncateText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

function tradeTxnKey(offerId: string): string {
  const parts = offerId.split('-');
  const last = parts[parts.length - 1];
  if (last && /^\d+$/.test(last) && parts.length >= 2) {
    return parts.slice(0, -1).join('-');
  }
  return offerId;
}

function verdictFromDelta(delta: number): 'WIN' | 'FAIR' | 'LOSS' {
  if (delta > 200) return 'WIN';
  if (delta < -200) return 'LOSS';
  return 'FAIR';
}

function formatCompactKtc(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

interface GroupedTrade {
  key: string;
  league: string;
  giving: string[];
  getting: string[];
  yourKtc: number;
  theirKtc: number;
  delta: number;
  verdict: 'WIN' | 'FAIR' | 'LOSS';
}

function groupLatestOffers(offers: LatestOfferRow[]): GroupedTrade[] {
  const byTxn = new Map<string, LatestOfferRow[]>();
  for (const o of offers) {
    const k = tradeTxnKey(o.id);
    const list = byTxn.get(k) ?? [];
    list.push(o);
    byTxn.set(k, list);
  }
  const rows: GroupedTrade[] = [];
  for (const [key, list] of Array.from(byTxn.entries())) {
    const league = list[0]?.league ?? '';
    const giving = list.filter((r: LatestOfferRow) => r.score < 0).map((r: LatestOfferRow) => r.player);
    const getting = list.filter((r: LatestOfferRow) => r.score > 0).map((r: LatestOfferRow) => r.player);
    const inbound = list.filter((r: LatestOfferRow) => r.score > 0).reduce((s: number, r: LatestOfferRow) => s + Math.abs(r.score), 0);
    const outbound = list.filter((r: LatestOfferRow) => r.score < 0).reduce((s: number, r: LatestOfferRow) => s + Math.abs(r.score), 0);
    const yourKtc = Math.round(inbound * KTC_SCALE);
    const theirKtc = Math.round(outbound * KTC_SCALE);
    const delta = yourKtc - theirKtc;
    rows.push({
      key,
      league,
      giving,
      getting,
      yourKtc,
      theirKtc,
      delta,
      verdict: verdictFromDelta(delta),
    });
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return rows.slice(0, 4);
}

function waiverMetric(w: WaiverSidebarTarget): string {
  if (typeof w.tfoScore === 'number') return `BBSM ${Math.round(w.tfoScore)}`;
  const m = w.addValue.match(/(\d+)/);
  return m ? `+${m[1]}% ADD` : w.addValue;
}

function waiverSignal(w: WaiverSidebarTarget): { label: string; color: string } {
  const s = `${w.signal ?? ''} ${w.verdict ?? ''}`.toUpperCase();
  if (s.includes('BOOM')) return { label: 'BOOM', color: '#36E7A1' };
  return { label: 'WATCH', color: '#FBBF24' };
}

const sectionTitleClass =
  'px-2 pt-2 pb-[3px] font-mono text-[8px] uppercase tracking-[0.15em] text-[#475569]';

const sectionDividerClass = 'border-t border-white/[0.04] pt-1';

export default function TradeHubSidebar({
  week,
  wins,
  losses,
  empireKtcMain,
  topMoves: _topMoves, // eslint-disable-line @typescript-eslint/no-unused-vars
  leagues,
  deferMovesAndLeagues = false,
  onClose,
  className = '',
  latestOffers = [],
  overvaluedPlayers = [],
  waiverTargets = [],
  contextLeagueId = null,
  verdictByPlayerId = {},
  isOffseason = false,
  userTier = 'free',
  sidebarMidPremium,
  crossLeagueGaps = [],
}: Props) {
  const router = useRouter();

  const recordColor = wins > losses ? '#36E7A1' : '#EF4444';

  const tradeInbox = useMemo(() => groupLatestOffers(latestOffers), [latestOffers]);

  const sellHighs = useMemo(() => overvaluedPlayers.slice(0, 2), [overvaluedPlayers]);

  const topWaivers = useMemo(() => waiverTargets.slice(0, 2), [waiverTargets]);

  const leaguesSorted = useMemo(() => {
    return [...leagues].sort((a, b) => a.healthScore - b.healthScore);
  }, [leagues]);

  const leaguesDisplay = leaguesSorted.slice(0, 5);
  const leaguesOverflow = leagues.length > 5;

  return (
    <aside
      className={`slim-scroll flex flex-col gap-0 overflow-y-auto sticky top-0 self-start max-h-[calc(100vh-120px)] glass-panel rounded-none ${className}`}
      style={{ borderLeft: '1px solid rgba(34,211,238,0.40)' }}
    >
      {/* SECTION 1 — HEADER */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 border-b border-white/[0.06] shrink-0">
        <span
          className="text-[11px] font-black uppercase tracking-[0.18em] text-white truncate"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          COMMAND HUB
        </span>
        <span className="live-dot shrink-0" title="Live" aria-hidden />
      </div>

      {/* SECTION 2 — EMPIRE PULSE */}
      <div
        className="grid grid-cols-3 gap-1 p-2 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#475569]">WEEK</p>
          <p
            className="mt-0.5 tabular-nums text-white"
            style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}
          >
            {isOffseason ? 'OFF' : `WK ${week}`}
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#475569]">RECORD</p>
          <p
            className="mt-0.5 tabular-nums font-semibold"
            style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: recordColor }}
          >
            {wins}W-{losses}L
          </p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#475569]">EMPIRE</p>
          <p
            className="mt-0.5 tabular-nums"
            style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#22D3EE' }}
          >
            {empireKtcMain}
          </p>
        </div>
      </div>

      {/* SECTION 3 — LATEST OFFERS */}
      <section className={`${sectionDividerClass} shrink-0`}>
        <p className={`${sectionTitleClass} px-2 pb-1`}>LATEST OFFERS</p>
        <div className="px-2 pb-1">
          {deferMovesAndLeagues ? (
            <div className="space-y-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[72px] w-full rounded-md" />
              ))}
            </div>
          ) : tradeInbox.length === 0 ? (
            <p className="text-center text-[11px] italic text-[#475569] py-3 px-2 font-mono">
              No pending offers
            </p>
          ) : (
            <div>
              {tradeInbox.map((t) => {
                const giveLabel = t.giving.length ? t.giving.join(', ') : '—';
                const getLabel = t.getting.length ? t.getting.join(', ') : '—';
                const deltaStr = `${t.delta >= 0 ? '+' : ''}${formatCompactKtc(t.delta)}`;
                const verdictStyles =
                  t.verdict === 'WIN'
                    ? { bg: 'rgba(54,231,161,0.14)', border: 'rgba(54,231,161,0.35)', color: '#36E7A1' }
                    : t.verdict === 'LOSS'
                      ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#EF4444' }
                      : { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', color: '#FBBF24' };
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => router.push('/dashboard/trade')}
                    className="w-full text-left glass-panel mb-[3px] last:mb-0 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
                    style={{ borderRadius: 6 }}
                  >
                    <div className="font-mono text-[9px] text-[#64748B] truncate" title={t.league}>
                      {truncateText(t.league, 14)}
                    </div>
                    <div className="flex justify-between gap-2 mt-1 items-start">
                      <div
                        className="min-w-0 flex-1 font-mono text-[10px] leading-snug"
                        style={{ color: '#EF4444' }}
                        title={giveLabel}
                      >
                        ↓ {truncateText(giveLabel, 28)}
                      </div>
                      <div
                        className="min-w-0 flex-1 text-right font-mono text-[10px] leading-snug"
                        style={{ color: '#36E7A1' }}
                        title={getLabel}
                      >
                        ↑ {truncateText(getLabel, 28)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono text-[9px] text-[#94A3B8] tabular-nums">
                        You {formatCompactKtc(t.yourKtc)} vs {formatCompactKtc(t.theirKtc)} ·{' '}
                        <span style={{ color: t.delta >= 0 ? '#36E7A1' : '#EF4444' }}>{deltaStr}</span>
                      </span>
                      <span
                        className="shrink-0 font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border"
                        style={{
                          background: verdictStyles.bg,
                          borderColor: verdictStyles.border,
                          color: verdictStyles.color,
                        }}
                      >
                        {t.verdict}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4 — OVERVALUED ASSETS */}
      <section className={`${sectionDividerClass} shrink-0`}>
        <p className={`${sectionTitleClass}`}>OVERVALUED ASSETS</p>
        <div className="px-2 pb-2">
          {deferMovesAndLeagues ? (
            <div className="space-y-1">
              <div className="skeleton h-11 w-full rounded-md" />
              <div className="skeleton h-11 w-full rounded-md" />
            </div>
          ) : sellHighs.length === 0 ? (
            <p className="text-[10px] text-[#475569] font-mono py-1">No sell signals loaded.</p>
          ) : (
            sellHighs.map((p) => {
              const hasBvi = typeof p.bviScore === 'number' && typeof p.bviDelta === 'number';
              const bviDelta = hasBvi ? p.bviDelta! : -(p.overvalueScore ?? 0);
              const bviLine = hasBvi
                ? `BVI: ${p.bviScore!.toLocaleString()} | KTC: ${p.ktcValue.toLocaleString()} | △${bviDelta.toLocaleString()} OVERVALUED`
                : `KTC: ${p.ktcValue.toLocaleString()} | PPG ${p.seasonAvgPpg} | OVERVALUED`;
              return (
                <button
                  key={p.player_id}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/trade/finder?playerId=${p.player_id}&intent=sell${contextLeagueId ? `&leagueId=${contextLeagueId}` : ''}`,
                    )
                  }
                  className="w-full text-left flex flex-col gap-0.5 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span
                        className="shrink-0 text-[8px] font-black uppercase px-1 py-0.5 rounded border font-mono"
                        style={{
                          borderColor: 'rgba(239,68,68,0.40)',
                          background: 'rgba(239,68,68,0.12)',
                          color: '#EF4444',
                          boxShadow: '0 0 8px rgba(239,68,68,0.20)',
                        }}
                      >
                        SELL
                      </span>
                      <span className="text-[9px] text-white font-semibold truncate font-mono">
                        {truncateText(p.name, 11)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[8px] font-mono text-[#64748B]">{p.position}</span>
                  </div>
                  <p
                    className="font-mono text-[8px] truncate leading-snug"
                    style={{ color: '#EF4444' }}
                    title={bviLine}
                  >
                    {bviLine}
                  </p>
                  <PlayerBhsActions
                    tfoVerdict={p.tfoVerdict ?? null}
                    playerId={p.player_id}
                    playerName={p.name}
                    leagueId={contextLeagueId}
                    compact
                    className="justify-end"
                  />
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION 4c — PLAYER GAPS */}
      <section className={`${sectionDividerClass} shrink-0`}>
        <p className={`${sectionTitleClass}`}>PLAYER GAPS</p>
        <div className="px-2 pb-2">
          {deferMovesAndLeagues ? (
            <div className="space-y-2">
              <div className="skeleton h-7 w-full rounded-md" />
              <div className="skeleton h-7 w-full rounded-md" />
              <div className="skeleton h-7 w-full rounded-md" />
            </div>
          ) : crossLeagueGaps.length === 0 ? (
            <p className="text-[10px] text-[#475569] font-mono py-1">Sync more leagues to see gaps.</p>
          ) : (
            <ul className="space-y-1.5">
              {crossLeagueGaps.map((gap) => (
                <li key={gap.positionLabel}>
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <span className="font-mono text-[9px] font-bold text-white">
                      {gap.positionLabel}
                    </span>
                    <span className="font-mono text-[8px] text-[#64748B] tabular-nums">
                      weak in {gap.weakCount}/{gap.totalCount} leagues
                    </span>
                  </div>
                  {/* Fill bar */}
                  <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${gap.fillPct}%`,
                        background:
                          gap.fillPct >= 70
                            ? '#EF4444'
                            : gap.fillPct >= 40
                              ? '#FBBF24'
                              : '#36E7A1',
                        boxShadow:
                          gap.fillPct >= 70
                            ? '0 0 6px rgba(239,68,68,0.5)'
                            : gap.fillPct >= 40
                              ? '0 0 6px rgba(251,191,36,0.4)'
                              : '0 0 6px rgba(54,231,161,0.4)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* SECTION 4b — Ad (free) or Coach / Weekly report (pro/elite). Between SELL HIGHS and LEAGUE STATUS. */}
      <section className={`${sectionDividerClass} shrink-0 px-1 pb-1`}>
        <AdBox
          slot="sidebar_mid"
          tier={userTier}
          premiumContent={sidebarMidPremium}
          className="border-0 shadow-none bg-transparent p-1 [&.glass-panel]:shadow-none"
        />
      </section>

      {/* SECTION 5 — TOP WAIVER ADDS */}
      <section className={`${sectionDividerClass} shrink-0`}>
        <p className={`${sectionTitleClass}`}>TOP ADDS</p>
        <div className="px-2 pb-2">
          {deferMovesAndLeagues ? (
            <div className="space-y-1">
              <div className="skeleton h-8 w-full rounded-md" />
              <div className="skeleton h-8 w-full rounded-md" />
            </div>
          ) : topWaivers.length === 0 ? (
            <p className="text-[10px] text-[#475569] font-mono py-1">No waiver intel.</p>
          ) : (
            topWaivers.map((w) => {
              const pos = (w.position ?? '').toUpperCase();
              const stripe = POS_BADGE[pos] ?? '#94A3B8';
              const sig = waiverSignal(w);
              return (
                <div key={w.player_id} className="flex flex-col gap-1 px-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="shrink-0 text-[8px] font-black uppercase px-1 py-0.5 rounded font-mono text-black"
                      style={{ background: stripe }}
                    >
                      {pos.slice(0, 3)}
                    </span>
                    <span className="text-[9px] text-white truncate font-mono font-semibold">
                      {truncateText(w.name, 12)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right flex flex-col items-end">
                    <span className="text-[9px] font-mono text-[#94A3B8] tabular-nums">{waiverMetric(w)}</span>
                    <span className="text-[9px] font-mono font-black" style={{ color: sig.color }}>
                      {sig.label}
                    </span>
                  </div>
                  </div>
                  <PlayerBhsActions
                    tfoVerdict={verdictByPlayerId[w.player_id] ?? w.verdict ?? null}
                    playerId={w.player_id}
                    playerName={w.name}
                    leagueId={contextLeagueId}
                    allowSell={false}
                    compact
                    className="justify-end"
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION 6 — LEAGUE STATUS */}
      <section className={`${sectionDividerClass} flex-1 min-h-0 shrink-0`}>
        <p className={`${sectionTitleClass}`}>LEAGUES</p>
        <div className="px-2 pb-2">
          {deferMovesAndLeagues ? (
            <ul className="space-y-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="skeleton h-5 w-full rounded-md" />
              ))}
            </ul>
          ) : leaguesDisplay.length === 0 ? (
            <p className="text-[10px] text-[#475569] font-mono py-1">No leagues synced.</p>
          ) : (
            <>
              <ul className="space-y-0.5">
                {leaguesDisplay.map((lg) => (
                  <li
                    key={lg.id}
                    className="flex items-center gap-2 font-mono text-[9px] py-[3px] px-2 rounded-sm hover:bg-white/[0.02]"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: leagueDotColor(lg.healthScore),
                        boxShadow: `0 0 8px ${leagueDotColor(lg.healthScore)}55`,
                      }}
                      aria-hidden
                    />
                    <span className="text-white truncate flex-1 min-w-0" title={lg.name}>
                      {truncateText(lg.name, 16)}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#64748B]">{lg.healthScore}</span>
                    <span
                      className="shrink-0 w-[52px] text-right font-black uppercase text-[9px]"
                      style={{
                        color:
                          lg.signal === 'BOOM' ? '#36E7A1' : lg.signal === 'BUST' ? '#EF4444' : '#FBBF24',
                      }}
                    >
                      {lg.signal}
                    </span>
                  </li>
                ))}
              </ul>
              {leaguesOverflow ? (
                <div className="pt-2 px-2 flex justify-end">
                  <Link
                    href="/dashboard/mission-control"
                    className="text-[9px] font-bold text-[#22D3EE] hover:text-white transition-colors font-mono uppercase tracking-wider"
                  >
                    View All →
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* SECTION 7 — QUICK ACTIONS */}
      <div className="mt-auto shrink-0 border-t border-white/[0.06] px-2 py-2">
        <p className={`${sectionTitleClass} !pt-1 !pb-1`}>QUICK ACTIONS</p>
        <div className="flex gap-1 px-0 pb-0">
          {(
            [
              { label: 'LINEUP', path: '/dashboard/lineup' },
              { label: 'TRADE', path: '/dashboard/trade' },
              { label: 'SCOUT', path: '/dashboard/scouting' },
            ] as const
          ).map((a) => (
            <button
              key={a.path}
              type="button"
              onClick={() => router.push(a.path)}
              className="h-[26px] flex-1 rounded border border-white/[0.06] bg-white/[0.04] text-[9px] font-mono font-black text-[#94A3B8] transition-colors hover:bg-white/[0.08] uppercase tracking-tight"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {onClose ? (
        <div className="px-3 py-1 border-t border-white/[0.04] flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="text-[11px] text-slate-500 hover:text-white font-mono">
            Close
          </button>
        </div>
      ) : null}

      {userTier === 'free' ? (
        <div className="px-2 py-2 border-t border-white/[0.06] shrink-0 bg-black/25">
          <p className="font-mono text-[9px] text-[#22D3EE] uppercase tracking-[0.2em]">🔒 UNLOCK MORE INTEL</p>
          <p className="mt-1 font-mono text-[8px] text-[#64748B] leading-snug">Pro: Unlimited trades + scouting</p>
          <p className="font-mono text-[8px] text-[#64748B] leading-snug">Elite: Full rating access + reports</p>
          <Link
            href="/dashboard/settings#billing"
            className="inline-block mt-2 font-mono text-[9px] text-[#22D3EE] hover:text-white uppercase tracking-wider"
          >
            UPGRADE →
          </Link>
        </div>
      ) : null}

      {/* SECTION 8 — TFO MODEL BADGE */}
      <div
        className="px-2 py-2 border-t border-white/[0.06] shrink-0 text-center"
        style={{ background: 'rgba(54,231,161,0.10)' }}
      >
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#36E7A1]">
          BOB ENGINE ACTIVE
        </span>
      </div>
    </aside>
  );
}
