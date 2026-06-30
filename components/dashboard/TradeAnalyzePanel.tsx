'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { formatEngineGradeLabel } from '@/lib/ui/labels';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import PlayerAvatar from '@/components/PlayerAvatar';
import type { SnapshotOffer } from '@/app/api/dashboard/snapshot/route';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupedOffer {
  txnKey: string;
  league: string;
  give: SnapshotOffer[];
  get: SnapshotOffer[];
  giveKtc: number;
  getKtc: number;
  delta: number;
  verdict: 'WIN' | 'EVEN' | 'LOSS';
  reasoning: string;
}

export interface TradeAnalyzePanelProps {
  latestOffers: SnapshotOffer[];
  verdictByPlayerId?: Record<string, string>;
  loading?: boolean;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KTC_SCALE = 220;

const V_TFO: Record<string, number> = {
  BOOM: 91, LEAN_BOOM: 82, NEUTRAL: 68, LEAN_BUST: 52, BUST: 38,
};
const V_GRADE: Record<string, string> = {
  BOOM: 'ELITE', LEAN_BOOM: 'HIGH VALUE', NEUTRAL: 'VIABLE', LEAN_BUST: 'SPEC', BUST: 'AVOID',
};
const GRADE_COLOR: Record<string, string> = {
  ELITE: '#36E7A1', 'HIGH VALUE': '#22D3EE', VIABLE: '#94A3B8', SPEC: '#FBBF24', AVOID: '#EF4444',
};
const POS_ACCENT: Record<string, string> = {
  QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA',
};

const VERDICT_STYLES = {
  WIN: { color: '#36E7A1', bg: 'rgba(54,231,161,0.10)', border: 'rgba(54,231,161,0.35)', glow: 'rgba(54,231,161,0.20)' },
  EVEN: { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.35)', glow: 'rgba(251,191,36,0.20)' },
  LOSS: { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', glow: 'rgba(239,68,68,0.20)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function txnKey(id: string): string {
  const parts = id.split('-');
  const last = parts[parts.length - 1];
  if (last && /^\d+$/.test(last) && parts.length >= 2) {
    return parts.slice(0, -1).join('-');
  }
  return id;
}

function fmtKtc(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function buildReasoning(verdict: 'WIN' | 'EVEN' | 'LOSS', delta: number): string {
  const d = fmtKtc(Math.abs(Math.round(delta)));
  if (verdict === 'WIN')
    return `Inbound KTC exceeds send by ~${d}. Favorable return — accept or push for more.`;
  if (verdict === 'LOSS')
    return `Sending ~${d} more KTC than you receive. Counter down or protect the asset.`;
  return 'Near-even KTC exchange. Decision hinges on positional fit, age curve, and roster window.';
}

function groupOffers(offers: SnapshotOffer[]): GroupedOffer[] {
  const byTxn: Record<string, SnapshotOffer[]> = {};
  for (const o of offers) {
    const k = txnKey(o.id);
    if (!byTxn[k]) byTxn[k] = [];
    byTxn[k]!.push(o);
  }
  const out: GroupedOffer[] = [];
  for (const key of Object.keys(byTxn)) {
    const list = byTxn[key]!;
    const give = list.filter((r: SnapshotOffer) => r.score <= 0);
    const get = list.filter((r: SnapshotOffer) => r.score > 0);
    const getKtc = Math.round(get.reduce((s: number, r: SnapshotOffer) => s + Math.abs(r.score) * KTC_SCALE, 0));
    const giveKtc = Math.round(give.reduce((s: number, r: SnapshotOffer) => s + Math.abs(r.score) * KTC_SCALE, 0));
    const delta = getKtc - giveKtc;
    const verdict: 'WIN' | 'EVEN' | 'LOSS' =
      delta > 200 ? 'WIN' : delta < -200 ? 'LOSS' : 'EVEN';
    out.push({
      txnKey: key,
      league: list[0]?.league ?? '',
      give,
      get,
      giveKtc,
      getKtc,
      delta,
      verdict,
      reasoning: buildReasoning(verdict, delta),
    });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function normalizeVerdict(raw: string | undefined): string {
  if (!raw) return 'NEUTRAL';
  return raw.trim().toUpperCase().replace(/\s+/g, '_');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlayerRow({
  offer,
  verdictByPlayerId,
}: {
  offer: SnapshotOffer;
  verdictByPlayerId?: Record<string, string>;
}) {
  const pid = offer.player_id ?? '';
  const rawVerdict = pid ? verdictByPlayerId?.[pid] : undefined;
  const verdict = normalizeVerdict(rawVerdict);
  const tfoScore = V_TFO[verdict] ?? null;
  const grade = V_GRADE[verdict] ?? null;
  const gradeColor = grade ? (GRADE_COLOR[grade] ?? '#94A3B8') : '#94A3B8';
  const posColor = POS_ACCENT[(offer.position ?? '').toUpperCase()] ?? '#94A3B8';
  const ktcApprox = Math.round(Math.abs(offer.score) * KTC_SCALE);

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded-lg border border-white/[0.05] bg-white/[0.02]">
      <PlayerAvatar
        playerId={pid}
        playerName={offer.player}
        position={offer.position ?? '—'}
        size={36}
        style={{ border: `1.5px solid ${posColor}50`, flexShrink: 0 }}
      />
      <div className="flex-1 min-w-0">
        {/* Name + position badge */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[12px] font-semibold text-white leading-tight truncate">
            {offer.player}
          </span>
          <span
            className="shrink-0 rounded px-1 py-px text-[8px] font-black uppercase font-mono"
            style={{ background: `${posColor}22`, color: posColor }}
          >
            {offer.position ?? '—'}
          </span>
          {offer.team && offer.team !== '—' && (
            <span className="shrink-0 text-[8px] text-[var(--text-muted)] font-mono">
              {offer.team}
            </span>
          )}
        </div>

        {/* TFO + Grade */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[var(--text-muted)] tabular-nums">
            Rating{' '}
            <span className="text-white font-black">
              {tfoScore != null ? tfoScore : '—'}
            </span>
          </span>
          {grade && (
            <span
              className="font-mono text-[8px] font-black uppercase"
              style={{ color: gradeColor }}
            >
              {formatEngineGradeLabel(grade)}
            </span>
          )}
        </div>

        {/* BVI / KTC */}
        <span className="font-mono text-[8px] text-[var(--text-muted)] tabular-nums">
          KTC ~{fmtKtc(ktcApprox)}
        </span>
      </div>
    </div>
  );
}

function SideSkeleton() {
  return (
    <div className="space-y-2">
      <div className="skeleton h-[60px] w-full rounded-lg" />
      <div className="skeleton h-[60px] w-full rounded-lg" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeAnalyzePanel({
  latestOffers,
  verdictByPlayerId = {},
  loading = false,
  className = '',
}: TradeAnalyzePanelProps) {
  const router = useRouter();
  const [counterOpen, setCounterOpen] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  // Close counter dropdown on outside click
  useEffect(() => {
    if (!counterOpen) return;
    function handleClick(e: MouseEvent) {
      if (counterRef.current && !counterRef.current.contains(e.target as Node)) {
        setCounterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [counterOpen]);

  const grouped = useMemo(() => groupOffers(latestOffers), [latestOffers]);
  const offer = grouped[0] ?? null;
  const vs = offer ? VERDICT_STYLES[offer.verdict] : null;

  const hasOffers = latestOffers.length > 0;

  const goToTrade = (mode?: string) => {
    const q = new URLSearchParams();
    if (offer?.txnKey) q.set('txnKey', offer.txnKey);
    if (mode) q.set('counterMode', mode);
    router.push(`/dashboard/trade${q.size ? `?${q.toString()}` : ''}`);
  };

  return (
    <section className={clsx('glass-panel rounded-xl border border-white/[0.07] p-4 flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-display text-[16px] tracking-wide text-white uppercase">
            Trade Analyze
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            TRE engine · value + fit + window analysis
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5"
          style={{
            borderColor: 'rgba(34,211,238,0.30)',
            background: 'rgba(34,211,238,0.07)',
          }}
        >
          <span className="font-mono text-[9px] font-black text-[#22D3EE] uppercase tracking-[0.1em]">
            TRE
          </span>
        </span>
      </div>

      {/* Body */}
      {loading || !hasOffers ? (
        loading ? (
          /* Loading skeleton */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="skeleton h-4 w-28 rounded-md" />
              <div className="skeleton h-4 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SideSkeleton />
              <SideSkeleton />
            </div>
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="font-mono text-[13px] text-[#475569] text-center leading-relaxed">
              No pending offers
            </p>
            <p className="font-mono text-[10px] text-[#334155] text-center">
              Trade activity syncs automatically from Sleeper
            </p>
          </div>
        )
      ) : (
        <>
          {/* League label */}
          {offer!.league && (
            <div className="flex items-center gap-2 -mt-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {offer!.league}
              </span>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
          )}

          {/* Give / Get columns */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* YOU GIVE */}
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.15em] mb-1.5 text-[#EF4444]">
                You Give
              </p>
              <div className="space-y-1.5">
                {offer!.give.length > 0 ? (
                  offer!.give.slice(0, 3).map((o) => (
                    <PlayerRow
                      key={o.id}
                      offer={o}
                      verdictByPlayerId={verdictByPlayerId}
                    />
                  ))
                ) : (
                  <p className="font-mono text-[10px] text-[#475569] py-3 text-center">—</p>
                )}
              </div>
              {offer!.give.length > 0 && (
                <p className="font-mono text-[9px] tabular-nums text-[#EF4444] mt-1.5 text-right">
                  Total ~{fmtKtc(offer!.giveKtc)}
                </p>
              )}
            </div>

            {/* Divider + swap icon (visible on larger widths) */}
            {/* YOU GET */}
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.15em] mb-1.5 text-[#36E7A1]">
                You Get
              </p>
              <div className="space-y-1.5">
                {offer!.get.length > 0 ? (
                  offer!.get.slice(0, 3).map((o) => (
                    <PlayerRow
                      key={o.id}
                      offer={o}
                      verdictByPlayerId={verdictByPlayerId}
                    />
                  ))
                ) : (
                  <p className="font-mono text-[10px] text-[#475569] py-3 text-center">—</p>
                )}
              </div>
              {offer!.get.length > 0 && (
                <p className="font-mono text-[9px] tabular-nums text-[#36E7A1] mt-1.5 text-right">
                  Total ~{fmtKtc(offer!.getKtc)}
                </p>
              )}
            </div>
          </div>

          {/* Swap icon row */}
          <div className="flex items-center justify-center -my-1">
            <ArrowLeftRight className="h-4 w-4 text-[#334155]" aria-hidden />
          </div>

          {/* Verdict banner */}
          <div
            className="rounded-xl px-4 py-2.5 text-center border"
            style={{
              background: vs!.bg,
              borderColor: vs!.border,
              boxShadow: `0 0 20px ${vs!.glow}`,
            }}
          >
            <p
              className="font-display text-[22px] font-normal tracking-[0.15em] uppercase"
              style={{ color: vs!.color }}
            >
              {offer!.verdict}
            </p>
            {offer!.delta !== 0 && (
              <p
                className="font-mono text-[10px] tabular-nums mt-0.5"
                style={{ color: vs!.color, opacity: 0.7 }}
              >
                {offer!.delta >= 0 ? '+' : ''}
                {fmtKtc(offer!.delta)} KTC delta
              </p>
            )}
          </div>

          {/* Reasoning */}
          <p className="font-mono text-[11px] leading-relaxed text-[#64748B]">
            {offer!.reasoning}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => goToTrade()}
              className="flex-1 h-8 rounded-lg border border-white/[0.10] bg-white/[0.05] text-[10px] font-mono font-black uppercase tracking-wide text-[#94A3B8] hover:text-white hover:bg-white/[0.09] transition-colors"
            >
              View Full Analysis →
            </button>

            {/* Counter button + dropdown */}
            <div className="relative shrink-0" ref={counterRef}>
              <button
                type="button"
                onClick={() => setCounterOpen((v) => !v)}
                className="flex items-center gap-1 h-8 rounded-lg border px-3 text-[10px] font-mono font-black uppercase tracking-wide transition-colors"
                style={{
                  borderColor: vs!.border,
                  background: vs!.bg,
                  color: vs!.color,
                }}
              >
                Counter
                {counterOpen ? (
                  <ChevronUp className="h-3 w-3" aria-hidden />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                )}
              </button>

              {counterOpen && (
                <div
                  className="absolute bottom-full right-0 mb-1.5 z-50 min-w-[180px] rounded-xl border bg-[#0d1117] py-1 shadow-xl"
                  style={{ borderColor: 'rgba(255,255,255,0.10)' }}
                >
                  {(
                    [
                      {
                        mode: 'counter_win',
                        label: 'Counter to Win',
                        sub: 'Push offer in your favor',
                        color: '#36E7A1',
                      },
                      {
                        mode: 'counter_accept',
                        label: 'Counter to Accept',
                        sub: 'Small tweak, signal openness',
                        color: '#22D3EE',
                      },
                      {
                        mode: 'accept',
                        label: 'Accept As-Is',
                        sub: 'Deal is already fair',
                        color: '#FBBF24',
                      },
                    ] as const
                  ).map(({ mode, label, sub, color }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setCounterOpen(false);
                        goToTrade(mode);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
                    >
                      <p
                        className="font-mono text-[10px] font-black uppercase tracking-wide"
                        style={{ color }}
                      >
                        {label}
                      </p>
                      <p className="font-mono text-[9px] text-[#475569] mt-0.5">
                        {sub}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
