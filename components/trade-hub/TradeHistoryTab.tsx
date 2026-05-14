'use client';

import Link from 'next/link';
import type { TradeHistoryItem, TREVerdict } from './types';
import { timeAgo } from './types';

// ─── Verdict badge ────────────────────────────────────────────────────────────

interface VerdictBadgeProps {
  verdict: TREVerdict | null;
  score?:  number;
}

function VerdictBadge({ verdict, score }: VerdictBadgeProps) {
  const styles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    WIN:  { bg: 'rgba(6,78,59,0.6)',  text: '#34d399', border: 'rgba(52,211,153,0.3)',  label: 'SMASH' },
    EVEN: { bg: 'rgba(78,52,6,0.6)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)',  label: 'FAIR' },
    LOSS: { bg: 'rgba(69,10,10,0.6)', text: '#f87171', border: 'rgba(239,68,68,0.3)',   label: 'MISS' },
  };
  const s = styles[verdict ?? 'EVEN'] ?? styles['EVEN']!;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase"
        style={{
          background:    s.bg,
          color:         s.text,
          border:        `1px solid ${s.border}`,
          letterSpacing: '0.04em',
          fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
        }}
      >
        {s.label}
      </span>
      {score != null && (
        <span
          style={{
            fontFamily:  'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:    12,
            color:       verdict === 'WIN' ? '#34d399' : verdict === 'LOSS' ? '#f87171' : '#fbbf24',
            fontVariant: 'tabular-nums',
          }}
        >
          {score >= 0 ? '+' : ''}{score.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── Asset text ───────────────────────────────────────────────────────────────

function assetLabel(assets: TradeHistoryItem['gave']): string {
  if (!assets.length) return '—';
  return assets.map((a) => a.name).join(' + ');
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <tr
      className="animate-pulse"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      aria-hidden
    >
      <td className="px-4 py-3"><div className="h-3 w-12 rounded bg-white/[0.07]" /></td>
      <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-white/[0.07]" /></td>
      <td className="px-4 py-3"><div className="h-3 w-8 rounded bg-white/[0.05]" /></td>
      <td className="px-4 py-3"><div className="h-3 w-32 rounded bg-white/[0.07]" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 rounded-full bg-white/[0.07]" /></td>
    </tr>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ item, isLast }: { item: TradeHistoryItem; isLast: boolean }) {
  const gaveKtc     = item.gave.reduce((s, a) => s + (a.ktc_value ?? 0), 0);
  const receivedKtc = item.received.reduce((s, a) => s + (a.ktc_value ?? 0), 0);
  const delta       = (receivedKtc - gaveKtc) / 100;

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
      {/* Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          style={{
            fontFamily:  'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:    11,
            color:       '#64748B',
            fontVariant: 'tabular-nums',
          }}
        >
          {timeAgo(item.created_at)}
        </span>
      </td>

      {/* Action + you traded */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: '#64748B' }}>Traded</span>
          <span
            className="font-medium truncate max-w-[140px]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#ffffff' }}
            title={assetLabel(item.gave)}
          >
            {assetLabel(item.gave)}
          </span>
        </div>
      </td>

      {/* For */}
      <td className="px-4 py-3">
        <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: '#64748B' }}>for</span>
      </td>

      {/* Received */}
      <td className="px-4 py-3">
        <span
          className="font-medium truncate max-w-[160px] block"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#ffffff' }}
          title={assetLabel(item.received)}
        >
          {assetLabel(item.received)}
        </span>
      </td>

      {/* TRE Verdict */}
      <td className="px-4 py-3">
        <VerdictBadge verdict={item.tre_verdict} score={delta} />
      </td>
    </tr>
  );
}

// ─── TradeHistoryTab ──────────────────────────────────────────────────────────

export interface TradeHistoryTabProps {
  items:   TradeHistoryItem[];
  loading: boolean;
  compact?: boolean;
}

export default function TradeHistoryTab({ items, loading, compact }: TradeHistoryTabProps) {
  const displayItems = compact ? items.slice(0, 5) : items;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: '#64748B', letterSpacing: '0.1em' }}
        >
          Trade History
        </span>
        <span
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#475569' }}
        >
          All past trades with TRE verdict
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Date', 'You Traded', '', 'For', 'TRE Verdict'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left"
                  style={{
                    fontFamily:    'var(--font-body), Inter, sans-serif',
                    fontSize:      10,
                    color:         '#475569',
                    fontWeight:    500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
                <SkeletonRow key={i} isLast={i === (compact ? 4 : 9)} />
              ))
            ) : displayItems.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center"
                  style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#64748B' }}
                >
                  No trade history found. Trades will appear here after syncing.
                </td>
              </tr>
            ) : (
              displayItems.map((item, i) => (
                <HistoryRow key={item.id} item={item} isLast={i === displayItems.length - 1} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!loading && items.length > 0 && (
        <div
          className="flex justify-center px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <Link
            href="#"
            className="hover:underline"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: '#22D3EE' }}
          >
            View Full History →
          </Link>
        </div>
      )}
    </div>
  );
}
