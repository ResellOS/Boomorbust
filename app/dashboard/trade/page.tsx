'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type {
  TradeHubData,
  TradeHubOffer,
  TradeHubAsset,
  ProactiveTradeItem,
  TradeHistoryItem,
  BVIMarketMover,
  TREVerdict,
} from '@/app/api/dashboard/trade-hub/route';
import type { SmartCounterResult, CounterOffer } from '@/lib/counter/engine';

// ─── Design tokens ────────────────────────────────────────────────────────────

const MONO = { fontFamily: 'var(--font-mono-tactical, "JetBrains Mono", monospace)' };
const GLASS = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
};
const POS_COLOR: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
  PICK: '#64748B',
};
const VERDICT_COLOR: Record<TREVerdict, string> = {
  WIN: '#36E7A1',
  EVEN: '#FBBF24',
  LOSS: '#EF4444',
};

// ─── Tiny sub-components ─────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: string }) {
  const c = POS_COLOR[pos] ?? '#64748B';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
      style={{ ...MONO, color: c, background: `${c}20`, border: `1px solid ${c}35` }}
    >
      {pos}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: TREVerdict | null }) {
  if (!verdict) return null;
  const c = VERDICT_COLOR[verdict];
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider"
      style={{ ...MONO, color: c, background: `${c}18`, border: `1px solid ${c}40`, boxShadow: `0 0 6px ${c}25` }}
    >
      {verdict}
    </span>
  );
}

function TFOGradePill({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const colors: Record<string, string> = {
    ELITE: '#36E7A1',
    'HIGH VALUE': '#22D3EE',
    VIABLE: '#FBBF24',
    SPECULATIVE: '#F97316',
    AVOID: '#EF4444',
  };
  const c = colors[grade] ?? '#64748B';
  return (
    <span className="text-[9px] shrink-0" style={{ ...MONO, color: c }}>
      {grade}
    </span>
  );
}

function SkeletonBlock({ h = 'h-24', className = '' }: { h?: string; className?: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${h} ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.18em] uppercase text-white/30 mb-3" style={MONO}>
      {children}
    </p>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl p-6 text-center" style={GLASS}>
      <p className="text-[11px] text-white/30" style={MONO}>
        {message}
      </p>
    </div>
  );
}

// ─── Asset row in offer card ──────────────────────────────────────────────────

function AssetRow({ asset }: { asset: TradeHubAsset }) {
  const posColor = POS_COLOR[asset.position] ?? '#64748B';
  const isPick = asset.position === 'PICK';
  return (
    <div className="flex items-center gap-2 py-1">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold"
        style={{ background: `${posColor}20`, color: posColor, border: `1px solid ${posColor}30` }}
      >
        {isPick ? '📋' : asset.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-white truncate">{asset.name}</span>
          <PosBadge pos={asset.position} />
          <TFOGradePill grade={asset.tfo_grade} />
        </div>
        {!isPick && (
          <div className="flex items-center gap-2 mt-0.5">
            {asset.tfo_score != null && (
              <span className="text-[9px] tabular-nums" style={{ ...MONO, color: '#22D3EE' }}>
                TFO {Math.round(asset.tfo_score)}
              </span>
            )}
            {asset.bvi_delta != null && (
              <span
                className="text-[9px] tabular-nums"
                style={{ ...MONO, color: asset.bvi_delta > 0 ? '#36E7A1' : '#EF4444' }}
              >
                BVI {asset.bvi_delta > 0 ? '+' : ''}{Math.round(asset.bvi_delta)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────

interface OfferCardProps {
  offer: TradeHubOffer;
  onCounter: (offer: TradeHubOffer) => void;
}

function OfferCard({ offer, onCounter }: OfferCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={GLASS}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-white truncate">{offer.league_name}</span>
            <VerdictBadge verdict={offer.tre_verdict} />
          </div>
          {offer.opponent_name && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-white/40" style={MONO}>
                vs {offer.opponent_name}
              </span>
              {offer.opponent_dmp_title && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-[9px] text-amber-400/60" style={MONO}>
                    {offer.opponent_dmp_title.replace(/_/g, ' ')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <span className="text-[9px] text-white/20 shrink-0" style={MONO}>
          Wk {offer.week}
        </span>
      </div>

      {/* Trade sides */}
      <div className="grid grid-cols-2 divide-x divide-white/5">
        {/* YOU GIVE */}
        <div className="px-3 py-3">
          <p className="text-[8px] tracking-widest uppercase text-white/25 mb-2" style={MONO}>
            You Give
          </p>
          {offer.give.length > 0 ? (
            offer.give.map((a) => <AssetRow key={a.player_id} asset={a} />)
          ) : (
            <p className="text-[10px] text-white/20 italic" style={MONO}>—</p>
          )}
        </div>
        {/* YOU GET */}
        <div className="px-3 py-3">
          <p className="text-[8px] tracking-widest uppercase text-white/25 mb-2" style={MONO}>
            You Get
          </p>
          {offer.receive.length > 0 ? (
            offer.receive.map((a) => <AssetRow key={a.player_id} asset={a} />)
          ) : (
            <p className="text-[10px] text-white/20 italic" style={MONO}>—</p>
          )}
        </div>
      </div>

      {/* TRE reasoning */}
      {offer.tre_reasoning && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-white/40 leading-relaxed" style={MONO}>
            {offer.tre_reasoning}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-wrap"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => onCounter(offer)}
          className="flex-1 min-w-[100px] px-3 py-2 rounded-lg text-[10px] font-bold transition-all duration-150 hover:opacity-80"
          style={{
            ...MONO,
            background: 'rgba(34,211,238,0.12)',
            border: '1px solid rgba(34,211,238,0.30)',
            color: '#22D3EE',
          }}
        >
          ⚡ Smart Counter
        </button>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="px-3 py-2 rounded-lg text-[10px] font-bold transition-all duration-150 hover:opacity-80"
            style={{
              ...MONO,
              background: 'rgba(54,231,161,0.10)',
              border: '1px solid rgba(54,231,161,0.25)',
              color: '#36E7A1',
            }}
          >
            Accept
          </button>
        ) : (
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-2 rounded-lg text-[10px] font-bold animate-pulse"
            style={{
              ...MONO,
              background: 'rgba(54,231,161,0.20)',
              border: '1px solid rgba(54,231,161,0.50)',
              color: '#36E7A1',
            }}
          >
            Tap again to confirm ✓
          </button>
        )}

        <button
          className="px-3 py-2 rounded-lg text-[10px] text-white/25 hover:text-white/50 transition-colors"
          style={{ ...MONO, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── Smart Counter Modal ─────────────────────────────────────────────────────

interface CounterModalProps {
  offer: TradeHubOffer;
  onClose: () => void;
}

function CounterModal({ offer, onClose }: CounterModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartCounterResult | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateCounters = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/trade/counter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offer: {
              assets_out: offer.give.map((a) => ({
                player_id: a.player_id,
                name: a.name,
                position: a.position,
                ktc_value: a.ktc_value ?? 0,
              })),
              assets_in: offer.receive.map((a) => ({
                player_id: a.player_id,
                name: a.name,
                position: a.position,
                ktc_value: a.ktc_value ?? 0,
              })),
            },
            league_id: offer.league_id,
            opponent_sleeper_id: offer.opponent_sleeper_id,
          }),
        });
        if (!res.ok) throw new Error('Counter generation failed');
        const data = (await res.json()) as SmartCounterResult;
        setResult(data);
        setSelectedStrategy(data.counters[0]?.strategy ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate counters');
      } finally {
        setLoading(false);
      }
    };
    void generateCounters();
  }, [offer]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const selectedCounter = result?.counters.find((c) => c.strategy === selectedStrategy) ?? null;

  const strategyLabel: Record<string, string> = {
    COUNTER_TO_WIN: 'Counter to Win',
    COUNTER_TO_ACCEPT: 'Counter to Accept',
    ACCEPT_AS_IS: 'Accept As-Is',
  };
  const strategyDesc: Record<string, string> = {
    COUNTER_TO_WIN: 'Tilt the deal in your favor',
    COUNTER_TO_ACCEPT: 'Minor tweak — friendly open',
    ACCEPT_AS_IS: 'This deal already works for you',
  };
  const strategyColor: Record<string, string> = {
    COUNTER_TO_WIN: '#22D3EE',
    COUNTER_TO_ACCEPT: '#FBBF24',
    ACCEPT_AS_IS: '#36E7A1',
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: '#0f1319',
          border: '1px solid rgba(255,255,255,0.10)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="text-[13px] font-bold text-white">Smart Counter</p>
            <p className="text-[10px] text-white/40 mt-0.5" style={MONO}>
              {offer.league_name} · vs {offer.opponent_name ?? 'Opponent'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg">
            ×
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-6 space-y-3">
            <p className="text-[11px] text-white/30 text-center" style={MONO}>
              Analyzing offer via Smart Counter Engine...
            </p>
            <SkeletonBlock h="h-16" />
            <SkeletonBlock h="h-16" />
            <SkeletonBlock h="h-16" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-6 text-center">
            <p className="text-[11px] text-red-400" style={MONO}>{error}</p>
          </div>
        )}

        {/* Counter result */}
        {result && !loading && (
          <div className="p-5 space-y-4">
            {/* TRE summary */}
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1" style={MONO}>
                  TRE Analysis
                </p>
                <p className="text-[11px] text-white/60" style={MONO}>
                  {result.tre_result.reasoning}
                </p>
              </div>
              <VerdictBadge verdict={result.tre_result.verdict} />
            </div>

            {/* Opponent archetype */}
            {result.opponent_archetype && (
              <p className="text-[10px] text-amber-400/60 text-center" style={MONO}>
                Opponent profile: {String(result.opponent_archetype).replace(/_/g, ' ')}
              </p>
            )}

            {/* Strategy tabs */}
            <div className="grid grid-cols-3 gap-2">
              {result.counters.map((counter: CounterOffer) => {
                const color = strategyColor[counter.strategy] ?? '#64748B';
                const isSelected = selectedStrategy === counter.strategy;
                return (
                  <button
                    key={counter.strategy}
                    onClick={() => setSelectedStrategy(counter.strategy)}
                    className="rounded-lg px-2 py-2.5 text-left transition-all duration-150"
                    style={{
                      background: isSelected ? `${color}18` : 'rgba(255,255,255,0.03)',
                      border: isSelected ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: isSelected ? `0 0 8px ${color}20` : 'none',
                    }}
                  >
                    <p className="text-[9px] font-bold mb-0.5" style={{ ...MONO, color: isSelected ? color : '#64748B' }}>
                      {strategyLabel[counter.strategy] ?? counter.strategy}
                    </p>
                    <p className="text-[8px] text-white/30" style={MONO}>
                      {strategyDesc[counter.strategy] ?? ''}
                    </p>
                    <p className="text-[8px] text-white/40 mt-1 tabular-nums" style={MONO}>
                      {counter.confidence}% confidence
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected counter detail */}
            {selectedCounter && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${strategyColor[selectedCounter.strategy] ?? '#64748B'}30` }}
              >
                {/* You send / You receive */}
                <div className="grid grid-cols-2 divide-x divide-white/5">
                  <div className="px-4 py-3">
                    <p className="text-[8px] uppercase tracking-widest text-white/25 mb-2" style={MONO}>
                      You Send
                    </p>
                    {selectedCounter.offer_assets.length > 0 ? (
                      selectedCounter.offer_assets.map((a) => (
                        <div key={a.player_id} className="flex items-center gap-1.5 py-0.5">
                          <PosBadge pos={a.position} />
                          <span className="text-[11px] text-white">{a.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-white/20 italic" style={MONO}>Same as original</p>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[8px] uppercase tracking-widest text-white/25 mb-2" style={MONO}>
                      You Receive
                    </p>
                    {selectedCounter.return_assets.length > 0 ? (
                      selectedCounter.return_assets.map((a) => (
                        <div key={a.player_id} className="flex items-center gap-1.5 py-0.5">
                          <PosBadge pos={a.position} />
                          <span className="text-[11px] text-white">{a.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-white/20 italic" style={MONO}>Same as original</p>
                    )}
                  </div>
                </div>

                {/* Reasoning */}
                <div
                  className="px-4 py-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-[11px] text-white/60 leading-relaxed" style={MONO}>
                    {selectedCounter.reasoning}
                  </p>
                  {selectedCounter.note && (
                    <p className="text-[10px] text-amber-400/50 mt-2 italic" style={MONO}>
                      Note: {selectedCounter.note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/dashboard/trade/finder?league=${offer.league_id}`}
              className="block w-full text-center py-3 rounded-xl text-[11px] font-bold transition-all"
              style={{
                background: 'rgba(34,211,238,0.10)',
                border: '1px solid rgba(34,211,238,0.25)',
                color: '#22D3EE',
                ...MONO,
              }}
            >
              Open Full Trade Builder →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Proactive Trade Card ─────────────────────────────────────────────────────

function ProactiveCard({ trade }: { trade: ProactiveTradeItem }) {
  const target = trade.target_player;
  const posColor = target ? (POS_COLOR[target.position] ?? '#64748B') : '#22D3EE';

  return (
    <Link
      href={`/dashboard/trade/finder?player=${encodeURIComponent(trade.target_player_name)}&league=${trade.league_id}`}
      className="block group"
    >
      <div
        className="rounded-xl p-4 flex gap-3 items-start transition-all duration-200 group-hover:border-white/15"
        style={GLASS}
      >
        {/* Target avatar */}
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{ background: `${posColor}20`, color: posColor, border: `1px solid ${posColor}30` }}
        >
          {target
            ? target.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
            : trade.target_player_name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[12px] font-semibold text-white truncate">
              {target?.name ?? trade.target_player_name}
            </span>
            <PosBadge pos={target?.position ?? trade.target_position} />
            {target?.tfo_grade && <TFOGradePill grade={target.tfo_grade} />}
          </div>

          {trade.gap_filled && (
            <span
              className="inline-block text-[9px] px-1.5 py-0.5 rounded mb-1.5"
              style={{ ...MONO, color: '#22D3EE', background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.20)' }}
            >
              Fills {trade.gap_filled}
            </span>
          )}

          <p className="text-[10px] text-white/40 leading-relaxed" style={MONO}>
            {trade.reasoning}
          </p>

          <p className="text-[9px] text-white/20 mt-1.5" style={MONO}>
            {trade.league_name}
          </p>
        </div>

        {target?.tfo_score != null && (
          <div className="text-right shrink-0">
            <div className="text-[16px] font-bold tabular-nums" style={{ ...MONO, color: '#22D3EE' }}>
              {Math.round(target.tfo_score)}
            </div>
            <div className="text-[8px] text-white/25" style={MONO}>TFO</div>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────

function HistoryCard({ trade }: { trade: TradeHistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={GLASS}>
      <button
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-white truncate">{trade.league_name}</span>
            <VerdictBadge verdict={trade.tre_verdict} />
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                ...MONO,
                color: trade.outcome === 'WIN' ? '#36E7A1' : trade.outcome === 'LOSS' ? '#EF4444' : '#64748B',
                background: trade.outcome === 'WIN' ? 'rgba(54,231,161,0.10)' : trade.outcome === 'LOSS' ? 'rgba(239,68,68,0.10)' : 'rgba(100,116,139,0.10)',
              }}
            >
              {trade.outcome === 'TBD' ? 'Result TBD' : `Hindsight: ${trade.outcome}`}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {trade.opponent_name && (
              <span className="text-[10px] text-white/35" style={MONO}>
                vs {trade.opponent_name}
              </span>
            )}
            <span className="text-[9px] text-white/20" style={MONO}>
              Wk {trade.week}
            </span>
          </div>
        </div>
        <span className="text-white/25 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          className="grid grid-cols-2 divide-x divide-white/5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="px-4 py-3">
            <p className="text-[8px] uppercase tracking-widest text-white/25 mb-2" style={MONO}>
              Gave
            </p>
            {trade.gave.map((a) => <AssetRow key={a.player_id} asset={a} />)}
          </div>
          <div className="px-4 py-3">
            <p className="text-[8px] uppercase tracking-widest text-white/25 mb-2" style={MONO}>
              Received
            </p>
            {trade.received.map((a) => <AssetRow key={a.player_id} asset={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BVI Market Panel ─────────────────────────────────────────────────────────

function BVIMarketPanel({
  undervalued,
  overvalued,
}: {
  undervalued: BVIMarketMover[];
  overvalued: BVIMarketMover[];
}) {
  const [tab, setTab] = useState<'under' | 'over'>('under');
  const list = tab === 'under' ? undervalued : overvalued;

  return (
    <div className="rounded-xl overflow-hidden h-fit" style={GLASS}>
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-white/30 mb-3" style={MONO}>
          BVI Market
        </p>
        <div className="grid grid-cols-2 gap-1">
          {(['under', 'over'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="py-1.5 rounded-md text-[9px] font-bold transition-all"
              style={{
                ...MONO,
                color: tab === t ? (t === 'under' ? '#36E7A1' : '#EF4444') : '#64748B',
                background: tab === t ? (t === 'under' ? 'rgba(54,231,161,0.12)' : 'rgba(239,68,68,0.12)') : 'transparent',
                border: tab === t ? `1px solid ${t === 'under' ? 'rgba(54,231,161,0.25)' : 'rgba(239,68,68,0.25)'}` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {t === 'under' ? 'UNDERVALUED' : 'OVERVALUED'}
            </button>
          ))}
        </div>
      </div>

      {/* Movers list */}
      <div className="divide-y divide-white/[0.04]">
        {list.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[10px] text-white/25" style={MONO}>
              BVI data populates nightly
            </p>
          </div>
        ) : (
          list.map((mover) => {
            const posColor = POS_COLOR[mover.position] ?? '#64748B';
            const deltaColor = mover.signal === 'UNDERVALUED' ? '#36E7A1' : '#EF4444';

            return (
              <Link
                key={mover.player_id}
                href={`/dashboard/trade/finder?player=${encodeURIComponent(mover.name)}`}
                className="block group"
              >
                <div className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors">
                  {/* Pos indicator */}
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                    style={{ background: `${posColor}20`, color: posColor }}
                  >
                    {mover.position.slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white truncate">{mover.name}</p>
                    <p className="text-[9px] text-white/30" style={MONO}>
                      {mover.team} · KTC {mover.ktc_value.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className="text-[11px] font-bold tabular-nums"
                      style={{ ...MONO, color: deltaColor }}
                    >
                      {mover.signal === 'UNDERVALUED' ? '+' : ''}{Math.round(mover.delta).toLocaleString()}
                    </p>
                    <p className="text-[8px] text-white/25" style={MONO}>BVI Δ</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = 'offers' | 'proactive' | 'history';

export default function TradeHubPage() {
  const { activeLeagueId } = useDashboardLeagueStore();
  const [data, setData] = useState<TradeHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('offers');
  const [counterOffer, setCounterOffer] = useState<TradeHubOffer | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<string>('all');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = activeLeagueId ? `?league_id=${activeLeagueId}` : '';
        const res = await fetch(`/api/dashboard/trade-hub${qs}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as TradeHubData;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Trade Hub');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeLeagueId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Filter offers/proactive by selected league
  const filteredOffers = data
    ? leagueFilter === 'all'
      ? data.incomingOffers
      : data.incomingOffers.filter((o) => o.league_id === leagueFilter)
    : [];

  const filteredProactive = data
    ? leagueFilter === 'all'
      ? data.proactiveTrades
      : data.proactiveTrades.filter((t) => t.league_id === leagueFilter)
    : [];

  const filteredHistory = data
    ? leagueFilter === 'all'
      ? data.tradeHistory
      : data.tradeHistory.filter((t) => t.league_id === leagueFilter)
    : [];

  const TABS: { id: TabId; label: string; count?: number }[] = data
    ? [
        { id: 'offers', label: 'Offers', count: data.incomingOffers.length },
        { id: 'proactive', label: 'Targets', count: data.proactiveTrades.length },
        { id: 'history', label: 'History', count: data.tradeHistory.length },
      ]
    : [
        { id: 'offers', label: 'Offers' },
        { id: 'proactive', label: 'Targets' },
        { id: 'history', label: 'History' },
      ];

  return (
    <div className="min-h-screen" style={{ background: '#0a0d14' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-4 border-b"
        style={{
          background: 'rgba(10,13,20,0.94)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-white/30 hover:text-white/70 transition-colors text-[18px]">
                ←
              </Link>
              <div>
                <h1 className="text-[16px] font-bold text-white">Trade Hub</h1>
                <p className="text-[10px] text-white/35" style={MONO}>
                  Dynasty trade intelligence · all leagues
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/trade/finder"
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  ...MONO,
                  background: 'rgba(34,211,238,0.12)',
                  border: '1px solid rgba(34,211,238,0.25)',
                  color: '#22D3EE',
                }}
              >
                + Trade Builder
              </Link>
              <button
                onClick={() => void load(true)}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                style={{ ...MONO, border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {refreshing ? '...' : '↻'}
              </button>
            </div>
          </div>

          {/* League filter */}
          {data && data.leagues.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setLeagueFilter('all')}
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] transition-all ${leagueFilter === 'all' ? 'text-white' : 'text-white/30'}`}
                style={{
                  ...MONO,
                  background: leagueFilter === 'all' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                  border: leagueFilter === 'all' ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                All Leagues
              </button>
              {data.leagues.map((lg) => (
                <button
                  key={lg.id}
                  onClick={() => setLeagueFilter(lg.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[10px] transition-all ${leagueFilter === lg.id ? 'text-white' : 'text-white/30'}`}
                  style={{
                    ...MONO,
                    background: leagueFilter === lg.id ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                    border: leagueFilter === lg.id ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {lg.name.length > 16 ? lg.name.slice(0, 16) + '…' : lg.name}
                </button>
              ))}
            </div>
          )}

          {/* Mobile tabs */}
          <div className="flex gap-1 mt-3 lg:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${activeTab === tab.id ? 'text-white' : 'text-white/35'}`}
                style={{
                  ...MONO,
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                }}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span
                    className="ml-1 px-1 rounded text-[8px]"
                    style={{ background: 'rgba(34,211,238,0.20)', color: '#22D3EE' }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="rounded-xl p-6 text-center mb-6" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <p className="text-[13px] text-red-400" style={MONO}>{error}</p>
            <button onClick={() => void load()} className="mt-2 text-[11px] text-red-400/60 underline" style={MONO}>Retry</button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <SkeletonBlock h="h-48" />
              <SkeletonBlock h="h-48" />
              <SkeletonBlock h="h-48" />
            </div>
            <div className="hidden lg:block w-72 space-y-4">
              <SkeletonBlock h="h-96" />
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="flex gap-6 items-start">
            {/* Main content column */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* ── SECTION 1: INCOMING OFFERS (desktop always visible, mobile tab) ── */}
              <section className={activeTab === 'offers' || typeof window === 'undefined' ? 'block' : 'hidden lg:block'}>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>
                    Incoming Offers
                    {filteredOffers.length > 0 && (
                      <span className="ml-2 text-cyan-400">({filteredOffers.length})</span>
                    )}
                  </SectionLabel>
                </div>

                {filteredOffers.length > 0 ? (
                  <div className="space-y-4">
                    {filteredOffers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        onCounter={setCounterOffer}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="No recent trade activity detected. Trades update from Sleeper each session." />
                )}
              </section>

              {/* ── SECTION 2: PROACTIVE TRADES ── */}
              <section className={activeTab === 'proactive' ? 'block' : 'hidden lg:block'}>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>
                    Trades You Should Be Making
                    {filteredProactive.length > 0 && (
                      <span className="ml-2 text-cyan-400">({filteredProactive.length})</span>
                    )}
                  </SectionLabel>
                </div>

                {filteredProactive.length > 0 ? (
                  <div className="space-y-3">
                    {filteredProactive.map((trade) => (
                      <ProactiveCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="Proactive trade suggestions populate nightly from the TRE engine. Check back tomorrow." />
                )}
              </section>

              {/* ── SECTION 3: TRADE HISTORY ── */}
              <section className={activeTab === 'history' ? 'block' : 'hidden lg:block'}>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>
                    Trade History
                    {filteredHistory.length > 0 && (
                      <span className="ml-2 text-cyan-400">({filteredHistory.length})</span>
                    )}
                  </SectionLabel>
                </div>

                {filteredHistory.length > 0 ? (
                  <div className="space-y-3">
                    {filteredHistory.map((trade) => (
                      <HistoryCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="Past trades will appear here once you complete deals in your leagues." />
                )}
              </section>
            </div>

            {/* ── SECTION 4: BVI MARKET SIDEBAR ── */}
            <aside className="hidden lg:block w-72 shrink-0 sticky top-36">
              <BVIMarketPanel
                undervalued={data.bviUndervalued}
                overvalued={data.bviOvervalued}
              />
            </aside>
          </div>
        )}

        {/* BVI Market on mobile — after content */}
        {data && !loading && (
          <div className="mt-8 lg:hidden">
            <SectionLabel>BVI Market</SectionLabel>
            <BVIMarketPanel
              undervalued={data.bviUndervalued}
              overvalued={data.bviOvervalued}
            />
          </div>
        )}
      </div>

      {/* Counter Modal */}
      {counterOffer && (
        <CounterModal
          offer={counterOffer}
          onClose={() => setCounterOffer(null)}
        />
      )}
    </div>
  );
}
