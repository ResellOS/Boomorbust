'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowDownRight, ArrowUpRight, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import AppBackground from '@/components/AppBackground';
import {
  dynasty2026Players,
  arbitrageSignalToAction,
  firstTfoReasonSentence,
  getArbitrageSignalColor,
  getMarketCategory,
  type DynastyPlayer2026,
  type SignalLabel,
} from '@/lib/rankings/dynasty2026';

// ── Filter constants ─────────────────────────────────────────────────────────

const POSITION_TABS = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const;
const SIGNAL_TABS: Array<SignalLabel | 'ALL'> = ['ALL', 'STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'];

const POS_BADGE: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-emerald-500/20 text-emerald-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
};

function signalBadgeStyle(signal: SignalLabel): CSSProperties {
  const c = getArbitrageSignalColor(signal);
  return {
    color: c,
    borderColor: `${c}55`,
    backgroundColor: `${c}14`,
  };
}

/** TFO verdict colors — match dashboard accents */
const TFO_VERDICT_HEX: Record<string, string> = {
  BOOM: '#36E7A1',
  LEAN_BOOM: '#22D3EE',
  NEUTRAL: '#94A3B8',
  LEAN_BUST: '#FBBF24',
  BUST: '#EF4444',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ delta, color }: { delta: number; color: string }) {
  const isPos = delta > 0;
  const Icon = isPos ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-0.5 tabular-nums font-bold text-sm"
      style={{ color }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {isPos ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="tabular-nums text-[11px] text-[var(--text-muted)]">{value.toLocaleString()}</span>
    </div>
  );
}

// ── Player Context Sidebar ───────────────────────────────────────────────────

function PlayerContext({
  player,
  onClose,
}: {
  player: DynastyPlayer2026;
  onClose: () => void;
}) {
  const isPos = player.delta > 0;
  const signalColor = player.signalColor;

  return (
    <aside className="fixed right-0 top-0 h-full w-full sm:w-[340px] z-50 flex flex-col bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Player Context</p>
          <h2 className="display text-2xl text-white leading-tight">{player.name}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', POS_BADGE[player.position])}>
              {player.position}
            </span>
            {' '}·{' '}{player.team} · Age {player.age}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* Delta callout */}
        <div
          className="rounded-2xl p-5 text-center border"
          style={{
            borderColor: signalColor + '40',
            backgroundColor: signalColor + '0D',
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">
            BBSM vs Market
          </p>
          <p className="display text-[3.5rem] leading-none font-normal" style={{ color: signalColor }}>
            {isPos ? '+' : ''}{player.delta.toFixed(1)}%
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
            {player.note}
          </p>
        </div>

        {/* Value bars */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Market Value (KTC)</p>
            <MiniBar value={player.marketValue} max={10000} color="#6366f1" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">BBSM Value</p>
            <MiniBar value={player.bbsmValue} max={10000} color={signalColor} />
          </div>
          <div className="pt-1 border-t border-[var(--border)] flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Value gap</span>
            <span className="font-semibold" style={{ color: signalColor }}>
              {(player.bbsmValue - player.marketValue >= 0 ? '+' : '')}{(player.bbsmValue - player.marketValue).toLocaleString()} pts
            </span>
          </div>
        </div>

        {/* Ratings, verdict, why */}
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-black/20 p-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">OUR RATING</p>
            <p className="text-sm font-semibold text-white">{player.tfoGrade.replace(/_/g, ' ')}</p>
          </div>
          <div className="space-y-1 pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">MARKET RATING</p>
            <p className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
              {getMarketCategory(player.delta)}
            </p>
          </div>
          <div className="space-y-1 pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">OUR VERDICT</p>
            <p
              className="display text-xl tracking-wide font-bold"
              style={{ color: getArbitrageSignalColor(player.signal) }}
            >
              {arbitrageSignalToAction(player.signal)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Signal tier: {player.signal}</p>
          </div>
          <div className="space-y-1 pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">WHY</p>
            <p className="text-xs text-[var(--text-secondary)] leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
              {firstTfoReasonSentence(player.tfoReasoning)}
            </p>
          </div>
          <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-3 items-baseline">
            <span className="text-[10px] text-[var(--text-muted)]">TFO score</span>
            <span className="display text-lg text-white tabular-nums">{player.tfoScore.toFixed(1)}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded border border-white/15 uppercase tracking-wide display"
              style={{
                color: TFO_VERDICT_HEX[player.tfoVerdict] ?? '#94A3B8',
                borderColor: `${TFO_VERDICT_HEX[player.tfoVerdict] ?? '#94A3B8'}44`,
                backgroundColor: `${TFO_VERDICT_HEX[player.tfoVerdict] ?? '#94A3B8'}12`,
              }}
            >
              {player.tfoVerdict.replace(/_/g, ' ')}
            </span>
          </div>
          {player.tfoFlags.length > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">Flags: {player.tfoFlags.join(', ')}</p>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/dashboard/trade?receiving=${encodeURIComponent(player.name)}`}
          className="block w-full rounded-xl bg-[var(--indigo)] text-white text-sm font-bold py-3 text-center display tracking-wide hover:brightness-110 transition"
        >
          ANALYZE TRADE FOR {player.lastName.toUpperCase()}
        </Link>
      </div>
    </aside>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ArbitragePage() {
  const [posFilter, setPosFilter] = useState<(typeof POSITION_TABS)[number]>('ALL');
  const [signalFilter, setSignalFilter] = useState<SignalLabel | 'ALL'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<DynastyPlayer2026 | null>(null);
  const [players, setPlayers] = useState<DynastyPlayer2026[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [rankingsHint, setRankingsHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRankingsLoading(true);
    setRankingsHint(null);
    fetch('/api/rankings/dynasty-enriched')
      .then((r) => {
        if (!r.ok) throw new Error('bad status');
        return r.json() as Promise<DynastyPlayer2026[]>;
      })
      .then((list) => {
        if (!cancelled) setPlayers(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) {
          setPlayers([...dynasty2026Players]);
          setRankingsHint('Live KTC sync failed — showing static snapshot.');
        }
      })
      .finally(() => {
        if (!cancelled) setRankingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byRankSorted = useMemo(() => [...players].sort((a, b) => a.rank - b.rank), [players]);

  const arbitrageTargetsLive = useMemo(
    () => players.filter((p) => p.signal === 'STRONG BUY' || p.signal === 'BUY').sort((a, b) => b.delta - a.delta),
    [players],
  );
  const sellCandidatesLive = useMemo(
    () => players.filter((p) => p.signal === 'SELL' || p.signal === 'STRONG SELL').sort((a, b) => a.delta - b.delta),
    [players],
  );

  const rows = useMemo(() => {
    return byRankSorted.filter((p) => {
      if (posFilter !== 'ALL' && p.position !== posFilter) return false;
      if (signalFilter !== 'ALL' && p.signal !== signalFilter) return false;
      return true;
    });
  }, [byRankSorted, posFilter, signalFilter]);

  const maxMarket = useMemo(() => {
    if (!byRankSorted.length) return 10000;
    return Math.max(...byRankSorted.map((p) => p.marketValue), 1);
  }, [byRankSorted]);

  const avgGapPct = useMemo(() => {
    if (!byRankSorted.length) return '0.0';
    return (byRankSorted.reduce((s, p) => s + Math.abs(p.delta), 0) / byRankSorted.length).toFixed(1);
  }, [byRankSorted]);

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-28 lg:pb-12 pt-8 lg:pt-10">
        {/* Header */}
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-1">2026 Post-FA Snapshot</p>
          <h1 className="display text-[clamp(2rem,5vw,3rem)] text-white leading-none">
            COMBINED RANKINGS
          </h1>
          <p className="display text-[clamp(1rem,2.5vw,1.4rem)] text-[var(--gold)] leading-none mt-1 tracking-wide">
            MARKET ARBITRAGE — FIND THE GAP
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
            TFO verdict plus BBSM vs KTC delta sets the signal — bullish TFO (BOOM / LEAN BOOM) never produces SELL;
            sells require bearish TFO and market premium (delta below thresholds).
          </p>
          {rankingsHint && (
            <p className="mt-2 text-xs text-amber-400/90" style={{ fontFamily: 'var(--font-body)' }}>
              {rankingsHint}
            </p>
          )}
        </header>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Buy Targets', value: arbitrageTargetsLive.length, color: '#06B6D4' },
            { label: 'Sell Candidates', value: sellCandidatesLive.length, color: '#EF4444' },
            { label: 'Total Players', value: byRankSorted.length, color: '#f59e0b' },
            { label: 'Avg Gap', value: `${avgGapPct}%`, color: '#6366f1' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">{stat.label}</p>
              <p className="display text-3xl" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
            {POSITION_TABS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosFilter(p)}
                className={clsx(
                  'px-3 py-2 text-xs font-semibold display tracking-wide transition',
                  posFilter === p
                    ? 'bg-[var(--indigo)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value as SignalLabel | 'ALL')}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-white"
          >
            {SIGNAL_TABS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 overflow-hidden shadow-[var(--shadow-card)] relative">
          {rankingsLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#080A0F]/75 backdrop-blur-[2px]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--cyan)]" aria-hidden />
              <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] display">Syncing live KTC…</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-black/30">
                  {[
                    '#',
                    'PLAYER / TEAM',
                    'POS',
                    'AGE',
                    'MARKET VAL',
                    'BBSM VAL',
                    'DELTA %',
                    'TFO',
                    'TFO GRADE',
                    'TFO SIGNAL',
                    'SIGNAL',
                    'NOTES',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((p) => {
                  const isSelected = selectedPlayer?.rank === p.rank;
                  return (
                    <tr
                      key={p.rank}
                      onClick={() => setSelectedPlayer(isSelected ? null : p)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-[var(--indigo)]/10 border-l-2 border-l-[var(--indigo)]'
                          : 'hover:bg-white/[0.025]',
                      )}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-[var(--text-muted)] tabular-nums w-10">
                        {p.rank}
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0 border border-[var(--border)]">
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div>
                            <p className="text-white font-medium leading-tight">{p.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{p.team}</p>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="px-4 py-3">
                        <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', POS_BADGE[p.position])}>
                          {p.position}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
                        {p.age}
                      </td>

                      {/* Market Val */}
                      <td className="px-4 py-3">
                        <MiniBar value={p.marketValue} max={maxMarket} color="#6366f1" />
                      </td>

                      {/* BBSM Val */}
                      <td className="px-4 py-3">
                        <MiniBar value={p.bbsmValue} max={maxMarket} color={p.signalColor} />
                      </td>

                      {/* Delta */}
                      <td className="px-4 py-3">
                        <DeltaBadge delta={p.delta} color={p.signalColor} />
                      </td>

                      {/* TFO score */}
                      <td className="px-4 py-3 tabular-nums text-white font-semibold">
                        {p.tfoScore.toFixed(1)}
                      </td>

                      {/* TFO grade */}
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-[var(--cyan)] whitespace-nowrap">
                          {p.tfoGrade.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* TFO verdict */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide display whitespace-nowrap"
                          style={{
                            color: TFO_VERDICT_HEX[p.tfoVerdict] ?? '#94A3B8',
                            borderColor: `${TFO_VERDICT_HEX[p.tfoVerdict] ?? '#94A3B8'}55`,
                            backgroundColor: `${TFO_VERDICT_HEX[p.tfoVerdict] ?? '#94A3B8'}14`,
                          }}
                        >
                          {p.tfoVerdict.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Signal */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide display whitespace-nowrap"
                          style={signalBadgeStyle(p.signal)}
                        >
                          {p.signal}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-[11px] max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontFamily: 'var(--font-body)' }}>
                        {p.note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="py-16 text-center text-[var(--text-muted)] text-sm">No players match the current filters.</div>
          )}
        </div>

        {/* Bottom cards: top buy + sell */}
        <div className="mt-10 grid sm:grid-cols-2 gap-6">
          {[
            { title: 'TOP ARBITRAGE BUYS', players: arbitrageTargetsLive.slice(0, 3), tone: 'buy' as const },
            { title: 'TOP SELL ALERTS', players: sellCandidatesLive.slice(0, 3), tone: 'sell' as const },
          ].map(({ title, players: cardPlayers, tone }) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-5">
              <p className={clsx('display text-sm tracking-widest mb-4', tone === 'buy' ? 'text-[var(--cyan)]' : 'text-red-400')}>
                {title}
              </p>
              <ul className="space-y-3">
                {cardPlayers.map((p) => (
                  <li
                    key={p.rank}
                    className="flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2"
                    onClick={() => setSelectedPlayer(p)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded', POS_BADGE[p.position])}>
                        {p.position}
                      </span>
                      <span className="text-white text-sm font-medium">{p.name}</span>
                      <span className="text-[var(--text-muted)] text-[11px]">{p.team} · {p.age}y</span>
                    </div>
                    <DeltaBadge delta={p.delta} color={p.signalColor} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      {/* Player context drawer */}
      {selectedPlayer && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedPlayer(null)}
          />
          <PlayerContext player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        </>
      )}
    </AppBackground>
  );
}
