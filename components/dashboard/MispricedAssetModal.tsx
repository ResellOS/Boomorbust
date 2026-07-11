'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import { formatStartSitConfidence } from '@/lib/ui/labels';
import type { PlayerMarketVerdict, RotationPlayer } from '@/lib/dashboard/rotation';

/** Ring / value color by verdict — BUY→boom, SELL→bust, HOLD→hold. */
function verdictColor(verdict: PlayerMarketVerdict['verdict']): string {
  if (verdict === 'BOOM' || verdict === 'BUY') return '#36E7A1';
  if (verdict === 'SELL' || verdict === 'BUST') return '#A78BFA';
  return '#FBBF24';
}

function verdictLabel(verdict: PlayerMarketVerdict['verdict']): string {
  switch (verdict) {
    case 'BOOM':
      return 'STRONG BUY';
    case 'BUY':
      return 'BUY';
    case 'HOLD':
      return 'HOLD';
    case 'SELL':
      return 'SELL';
    case 'BUST':
      return 'STRONG SELL';
  }
}

function buildExplanation(
  name: string,
  gap: number | null,
  bobRank: number | null,
  marketRank: number | null,
): string {
  const first = name.split(' ')[0] ?? name;
  if (gap == null || bobRank == null || marketRank == null) {
    return `${name} is on BOB's radar, but there isn't enough market data yet to quantify the mispricing.`;
  }
  const spots = Math.abs(Math.round(gap));
  if (gap > 0) {
    return `BOB's engine ranks ${first} ${spots} spot${spots === 1 ? '' : 's'} higher than market consensus (BOB #${bobRank} vs market #${marketRank}). The market is underrating ${first} — a buy-low window before the price corrects.`;
  }
  if (gap < 0) {
    return `BOB's engine ranks ${first} ${spots} spot${spots === 1 ? '' : 's'} lower than market consensus (BOB #${bobRank} vs market #${marketRank}). The market is overrating ${first} — a sell-high window while the value is still inflated.`;
  }
  return `BOB and the market agree on ${first}'s value right now — hold and monitor for the next shift.`;
}

export interface MispricedAssetModalProps {
  player: RotationPlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MispricedAssetModal({ player, isOpen, onClose }: MispricedAssetModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  const mv = player.marketVerdict;
  const hasMarket = mv != null && !mv.noMarketData;
  const color = hasMarket ? verdictColor(mv.verdict) : '#6b7a99';
  const label = hasMarket ? verdictLabel(mv.verdict) : 'NO SIGNAL';

  const marketRank = hasMarket ? mv.ktcRank : null;
  const bobRank =
    hasMarket && mv.ktcRank != null && mv.rankDelta != null
      ? Math.round(mv.ktcRank - mv.rankDelta)
      : null;
  const gap = hasMarket ? mv.rankDelta : null;
  const gapColor = gap != null && gap < 0 ? '#EF4444' : '#36E7A1';

  const confRaw = gap != null ? Math.min(85, 55 + Math.abs(gap) / 8) : 55;
  const confidence = formatStartSitConfidence(confRaw);
  const confPct = Math.round(confRaw);

  const explanation = buildExplanation(player.name, gap, bobRank, marketRank);

  const openProfile = () => {
    onClose();
    router.push(`/players?player=${player.playerId}`);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[14px] border border-[#1e2640] bg-[#0f1420]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[#1e2640]/80 p-4">
          <span
            className="shrink-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${color}, 0 0 14px ${color}55` }}
          >
            <PlayerAvatar playerId={player.playerId} name={player.name} size={56} borderClass="border-0" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-figtree text-xl font-bold text-white">{player.name}</div>
            <div className="mt-0.5 font-mono text-[11px] uppercase text-[#6b7a99]">
              {player.position} · {player.team}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[#6b7a99] transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* TFO score row */}
        <div className="flex items-end justify-between gap-3 border-b border-[#1e2640]/80 px-4 py-3.5">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[#6b7a99]">TFO Score</div>
            <div
              className="font-mono text-[34px] font-bold leading-none tabular-nums"
              style={{ color, textShadow: `0 0 16px ${color}55` }}
            >
              {player.tfoScore > 0 ? player.tfoScore.toFixed(1) : '—'}
            </div>
          </div>
          <div className="text-right">
            <div
              className="font-mono text-[15px] font-bold uppercase tracking-wide"
              style={{ color, textShadow: `0 0 12px ${color}66` }}
            >
              {label}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-[#6b7a99]">{confPct}% confidence</div>
          </div>
        </div>

        {/* Why mispriced */}
        <div className="p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-[#6b7a99]">
            Why BOB Flags This
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCell label="BOB Rank" value={bobRank != null ? `#${bobRank}` : '—'} color="#36E7A1" />
            <StatCell label="Market Rank" value={marketRank != null ? `#${marketRank}` : '—'} color="#8b9bb8" />
            <StatCell
              label="Rank Gap"
              value={gap != null ? `${gap > 0 ? '+' : ''}${Math.round(gap)}` : '—'}
              color={gap != null ? gapColor : '#8b9bb8'}
            />
            <StatCell label="Confidence" value={confidence} color="#e8ecf4" />
          </div>
          <p className="mt-3 font-figtree text-[13px] leading-relaxed text-[#b8c4dc]">{explanation}</p>

          <button
            type="button"
            onClick={openProfile}
            className="mt-4 rounded border border-[#1e2640] px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-[#8b9bb8] transition-colors hover:border-boom hover:text-white"
          >
            View Full Profile →
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-3 py-2">
      <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">{label}</div>
      <div className="mt-0.5 font-mono text-[16px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
