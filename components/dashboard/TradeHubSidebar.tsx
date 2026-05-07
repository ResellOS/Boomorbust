'use client';

import Link from 'next/link';
import { useId } from 'react';
import { useRouter } from 'next/navigation';
import { X, Star } from 'lucide-react';

export interface MarketTrendRow {
  label: string;
  value: number;
  /** Percentage delta to display next to the value (already signed). */
  delta: number;
  /** Optional unit suffix on the value (e.g. "%"). */
  unit?: string;
}

export interface LatestOfferRow {
  id: string;
  player: string;
  position: string;
  team: string;
  league: string;
  /** Signed score, e.g. +8.1 / -4.0. */
  score: number;
  photoUrl?: string;
}

export interface PlayerGapRow {
  id: string;
  player: string;
  positionLabel: string; // e.g. "WR - WR" (your slot vs market)
  /** Signed percent, e.g. +12 means +12%. */
  pct: number;
}

// ── Legacy types kept exported so older imports compile ─────────────────────
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

interface Props {
  marketTrends: MarketTrendRow[];
  latestOffers: LatestOfferRow[];
  playerGaps: PlayerGapRow[];
  /** League ticker shown next to the offers heading. */
  offersLeague?: string;
  onClose?: () => void;
  className?: string;
}

const POS_COLORS: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FEBC2E',
  TE: '#A78BFA',
};

function trendSparkSeed(label: string, value: number, delta: number): number {
  let h = 0;
  const s = `${label}|${value}|${delta}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/** Deterministic “wiggle” path — momentum readout per trend row. */
function WiggleSparkline({ label, value, delta }: { label: string; value: number; delta: number }) {
  const seed = trendSparkSeed(label, value, delta);
  const w = 40;
  const gh = 12;
  const mid = gh / 2;
  const parts: string[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wiggle =
      Math.sin(seed * 0.00065 + t * 10.5) * 4.2 +
      Math.sin((seed >>> 5) * 0.001 + t * 16.2) * 2.4 +
      (delta >= 0 ? t * 1.4 : -t * 1.4);
    const x = t * w;
    const y = Math.max(1.2, Math.min(gh - 1.2, mid + wiggle));
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const up = delta >= 0;
  const stroke = up ? '#36E7A1' : '#EF4444';
  return (
    <svg width={w} height={gh} className="shrink-0 opacity-90" aria-hidden>
      <path
        d={parts.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: up
            ? 'drop-shadow(0 0 3px rgba(54,231,161,0.55))'
            : 'drop-shadow(0 0 3px rgba(239,68,68,0.45))',
        }}
      />
    </svg>
  );
}

function MarketTrendDualPreview({ uid }: { uid: string }) {
  const g1 = `${uid}-m1`;
  const g2 = `${uid}-m2`;
  return (
    <div className="grid grid-cols-2 gap-2 mb-1.5">
      <div className="rounded-sm border border-white/[0.06] bg-black/30 px-1.5 py-1">
        <svg viewBox="0 0 88 28" className="w-full h-6 block" aria-hidden>
          <defs>
            <linearGradient id={g1} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M4,24 L18,18 L30,21 L46,11 L60,13 L74,7 L86,5 L86,28 L4,28 Z" fill={`url(#${g1})`} />
          <path d="M4,24 L18,18 L30,21 L46,11 L60,13 L74,7 L86,5" fill="none" stroke="#00ff88" strokeWidth="1.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px rgba(0,255,136,0.5))' }} />
        </svg>
        <p className="text-[7px] font-mono-tactical text-slate-600 truncate leading-none">PIVOT α</p>
      </div>
      <div className="rounded-sm border border-white/[0.06] bg-black/30 px-1.5 py-1">
        <svg viewBox="0 0 88 28" className="w-full h-6 block" aria-hidden>
          <defs>
            <linearGradient id={g2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M4,18 L20,22 L34,14 L48,20 L62,8 L76,12 L86,6 L86,28 L4,28 Z" fill={`url(#${g2})`} />
          <path d="M4,18 L20,22 L34,14 L48,20 L62,8 L76,12 L86,6" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px rgba(34,211,238,0.45))' }} />
        </svg>
        <p className="text-[7px] font-mono-tactical text-slate-600 truncate leading-none">EXPANDED</p>
      </div>
    </div>
  );
}

function ValueWithDelta({
  value,
  delta,
  unit = '',
}: {
  value: number;
  delta: number;
  unit?: string;
}) {
  const positive = delta >= 0;
  return (
    <div className="flex items-baseline gap-1 font-mono-tactical">
      <span
        className={`text-[10px] font-black ${positive ? 'glow-green' : 'glow-red'}`}
      >
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}
        {unit}
      </span>
      <span
        className={`text-[9px] font-bold ${positive ? 'text-[#36E7A1]' : 'text-[#EF4444]'}`}
      >
        {positive ? '+' : ''}
        {delta.toFixed(1)}%
      </span>
    </div>
  );
}

function OfferAvatar({ name, position, photoUrl }: { name: string; position: string; photoUrl?: string }) {
  const posColor = POS_COLORS[position] ?? '#94A3B8';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
      />
    );
  }
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black font-mono-tactical shrink-0"
      style={{
        color: posColor,
        background: `${posColor}15`,
        border: `1px solid ${posColor}30`,
      }}
    >
      {initials}
    </span>
  );
}

export default function TradeHubSidebar({
  marketTrends,
  latestOffers,
  playerGaps,
  offersLeague = 'League 2',
  onClose,
  className = '',
}: Props) {
  const dualId = useId().replace(/:/g, '');
  const router = useRouter();
  return (
    <aside
      className={`flex flex-col overflow-y-auto sticky top-0 self-start max-h-[calc(100vh-120px)] glass-panel rounded-none border-l border-white/[0.08] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-white/[0.06]">
        <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-white font-mono-tactical">
          Command Hub
        </h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse trade hub"
            className="text-slate-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="inline-block w-3.5 shrink-0" aria-hidden />
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="border-b border-white/[0.05] px-2 py-1">
        <p className="px-2 py-1.5 text-[8px] font-mono-tactical uppercase tracking-[0.15em] text-[#475569]">
          Quick Actions
        </p>
        <div className="flex gap-1 px-1 pb-1">
          {(
            [
              { label: '⚡ LINEUP', path: '/dashboard/lineup' },
              { label: '🔄 TRADE', path: '/dashboard/trade' },
              { label: '🎯 SCOUT', path: '/dashboard/scouting' },
            ] as const
          ).map((a) => (
            <button
              key={a.path}
              type="button"
              onClick={() => router.push(a.path)}
              className="h-[26px] flex-1 rounded border border-white/[0.06] bg-white/[0.04] text-[8px] font-mono-tactical text-[#94A3B8] transition-colors hover:bg-white/[0.08]"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MARKET TRENDS ── */}
      <section className="px-3 pt-1 pb-1 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 font-mono-tactical">
            Market Trends
          </h3>
          <span className="flex items-center gap-1.5 text-[8px] font-mono-tactical font-black uppercase tracking-widest text-[#FF5757]">
            <span className="live-dot" />
            Live
          </span>
        </div>

        <MarketTrendDualPreview uid={dualId} />

        {marketTrends.length === 0 ? (
          <p className="text-[10px] uppercase tracking-widest text-slate-700 font-mono-tactical py-2">
            Awaiting market signal
          </p>
        ) : (
          <ul className="space-y-0.5">
            {marketTrends.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-0.5 last:border-0 last:pb-0"
              >
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold min-w-0 truncate font-mono-tactical">
                  {t.label}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <WiggleSparkline label={t.label} value={t.value} delta={t.delta} />
                  <ValueWithDelta value={t.value} delta={t.delta} unit={t.unit} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── LATEST OFFERS ── */}
      <section className="px-3 pt-1 pb-1 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 font-mono-tactical">
            Latest Offers
          </h3>
          <span className="text-[9px] font-mono-tactical text-slate-600 uppercase tracking-wider">
            ({offersLeague})
          </span>
        </div>

        {latestOffers.length === 0 && (
          <p className="text-[10px] uppercase tracking-widest text-slate-700 font-mono-tactical py-2">
            No pending offers
          </p>
        )}

        <ul className="space-y-0.5">
          {latestOffers.slice(0, 5).map((offer) => {
            const positive = offer.score >= 0;
            return (
              <li
                key={offer.id}
                className="flex items-center gap-2 border-b border-white/[0.04] pb-0.5 last:border-0"
              >
                <OfferAvatar
                  name={offer.player}
                  position={offer.position}
                  photoUrl={offer.photoUrl}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-white truncate font-mono-tactical leading-tight">
                    {offer.player}
                  </div>
                  <div className="text-[8px] text-slate-600 font-mono-tactical truncate leading-tight">
                    <span style={{ color: POS_COLORS[offer.position] ?? '#94A3B8' }}>{offer.position}</span>
                    {' · '}{offer.team}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black font-mono-tactical ${
                    positive ? 'glow-green' : 'glow-red'
                  }`}
                >
                  {positive ? '+' : ''}
                  {offer.score.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>

        <Link
          href="/dashboard/trade"
          className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] font-bold text-slate-600 hover:text-slate-300 transition-colors font-mono-tactical uppercase tracking-wider"
        >
          Full Analysis →
        </Link>
      </section>

      {/* ── PLAYER GAPS ── */}
      <section className="px-3 pt-1 pb-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 font-mono-tactical">
            Player Gaps
          </h3>
          <Link
            href="/dashboard/rankings"
            className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors font-mono-tactical"
          >
            View All →
          </Link>
        </div>

        {playerGaps.length === 0 && (
          <p className="text-[10px] uppercase tracking-widest text-slate-700 font-mono-tactical py-1">
            No gap opportunities yet
          </p>
        )}

        <ul className="space-y-0.5">
          {playerGaps.map((g) => {
            const positive = g.pct >= 0;
            return (
              <li
                key={g.id}
                className="flex items-center justify-between border-b border-white/[0.04] pb-0.5 last:border-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-px rounded-sm shrink-0"
                    style={{
                      color: POS_COLORS[g.positionLabel.split(' ')[0] ?? ''] ?? '#94A3B8',
                      background: `${POS_COLORS[g.positionLabel.split(' ')[0] ?? ''] ?? '#94A3B8'}18`,
                    }}
                  >
                    {g.positionLabel.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-bold text-white truncate font-mono-tactical">
                    {g.player}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black font-mono-tactical shrink-0 ${
                    positive ? 'glow-green' : 'glow-red'
                  }`}
                >
                  {positive ? '+' : ''}
                  {g.pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div
        className="mx-2 mb-1 mt-0.5 rounded-md border px-2 py-2 font-mono-tactical"
        style={{
          background: 'rgba(54,231,161,0.06)',
          borderColor: 'rgba(54,231,161,0.12)',
          borderRadius: 6,
        }}
      >
        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#36E7A1]">TFO MODEL ACTIVE</p>
        <p className="mt-0.5 text-[7px] text-[#475569]">Formula v1.0 · 43 modifiers</p>
      </div>

      <div className="mt-auto shrink-0 border-t border-white/[0.04] px-3 py-1 flex justify-end">
        <Star className="w-4 h-4 text-amber-300/70" aria-hidden style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.35))' }} />
      </div>
    </aside>
  );
}
