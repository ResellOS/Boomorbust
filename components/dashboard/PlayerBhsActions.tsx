'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import type { TFOVerdict } from '@/lib/tfo/formula';

export type BhsHighlight = 'buy' | 'hold' | 'sell';

const BUY = '#36E7A1';
const HOLD = '#FBBF24';
const SELL = '#EF4444';

function normalizeVerdict(raw: string | null | undefined): TFOVerdict | null {
  if (raw == null || String(raw).trim() === '') return null;
  const u = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  const allowed: TFOVerdict[] = ['BOOM', 'LEAN_BOOM', 'NEUTRAL', 'LEAN_BUST', 'BUST'];
  if (allowed.includes(u as TFOVerdict)) return u as TFOVerdict;
  if (u.includes('LEAN') && u.includes('BOOM')) return 'LEAN_BOOM';
  if (u.includes('LEAN') && u.includes('BUST')) return 'LEAN_BUST';
  if (u.includes('BOOM')) return 'BOOM';
  if (u.includes('BUST')) return 'BUST';
  if (u.includes('NEUTRAL')) return 'NEUTRAL';
  return null;
}

export function verdictToHighlight(v: TFOVerdict | null): BhsHighlight {
  if (!v) return 'hold';
  if (v === 'BOOM' || v === 'LEAN_BOOM') return 'buy';
  if (v === 'BUST' || v === 'LEAN_BUST') return 'sell';
  return 'hold';
}

function tradeFinderHref(opts: {
  leagueId?: string | null;
  playerId?: string;
  targetPlayerId?: string;
  intent: 'buy' | 'sell';
}): string {
  const q = new URLSearchParams();
  if (opts.leagueId) q.set('leagueId', opts.leagueId);
  if (opts.playerId) q.set('playerId', opts.playerId);
  if (opts.targetPlayerId) q.set('targetPlayerId', opts.targetPlayerId);
  q.set('intent', opts.intent);
  return `/dashboard/trade/finder?${q.toString()}`;
}

function scoutingHref(playerName: string): string {
  return `/dashboard/scouting?player=${encodeURIComponent(playerName.trim())}`;
}

export interface PlayerBhsActionsProps {
  /** Raw verdict string from `tfo_cache` (or same enum strings). */
  tfoVerdict?: string | null;
  playerId: string;
  playerName: string;
  leagueId?: string | null;
  /** When false (e.g. waiver wire), SELL is disabled — player not on your roster. */
  allowSell?: boolean;
  compact?: boolean;
  className?: string;
}

export default function PlayerBhsActions({
  tfoVerdict,
  playerId,
  playerName,
  leagueId,
  allowSell = true,
  compact = false,
  className = '',
}: PlayerBhsActionsProps) {
  const router = useRouter();
  const v = normalizeVerdict(tfoVerdict);
  const active = verdictToHighlight(v);

  const go = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const lid = leagueId ?? undefined;
  const onRoster = allowSell;

  const pill = (label: string, isActive: boolean, color: string, path: string, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) go(path);
      }}
      className={clsx(
        'rounded-full border font-mono font-black uppercase transition',
        compact ? 'px-1.5 py-0.5 text-[7px] tracking-[0.06em]' : 'px-2 py-0.5 text-[8px] tracking-[0.08em]',
        disabled ? 'cursor-not-allowed opacity-35' : 'cursor-pointer',
        isActive ? 'border-opacity-90' : 'border-white/[0.12] opacity-80 hover:opacity-100',
      )}
      style={{
        fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
        color: isActive ? color : '#64748B',
        borderColor: isActive ? `${color}99` : 'rgba(255,255,255,0.12)',
        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
        boxShadow: isActive ? `0 0 14px ${color}55, 0 0 28px ${color}22, inset 0 0 12px ${color}14` : undefined,
      }}
      title={
        label === 'Buy'
          ? 'Open trade finder (acquire / upgrade)'
          : label === 'Sell'
            ? 'Open trade finder (move / sell)'
            : 'Open scouting / player detail'
      }
    >
      {label}
    </button>
  );

  const buyPath = onRoster
    ? tradeFinderHref({ leagueId: lid, playerId, intent: 'buy' })
    : tradeFinderHref({ leagueId: lid, targetPlayerId: playerId, intent: 'buy' });

  const sellPath = tradeFinderHref({ leagueId: lid, playerId, intent: 'sell' });

  return (
    <div className={clsx('flex flex-wrap items-center gap-1', className)} onClick={(e) => e.stopPropagation()}>
      {pill('Buy', active === 'buy', BUY, buyPath)}
      {pill('Hold', active === 'hold', HOLD, scoutingHref(playerName))}
      {pill('Sell', active === 'sell', SELL, sellPath, !onRoster)}
    </div>
  );
}
