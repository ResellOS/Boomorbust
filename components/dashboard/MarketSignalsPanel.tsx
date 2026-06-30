'use client';

import Link from 'next/link';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import { formatStartSitConfidence } from '@/lib/ui/labels';
import type { RotationPlayer } from '@/lib/dashboard/rotation';
import { sortByMarketSignal } from '@/lib/dashboard/sortPlayers';

function engineRank(ktcRank: number | null, rankDelta: number | null): number | null {
  if (ktcRank == null || rankDelta == null) return null;
  return Math.round(ktcRank - rankDelta);
}

function suggestedAction(verdict: string, rankDelta: number | null): string {
  const gap = rankDelta != null ? Math.abs(Math.round(rankDelta)) : 0;
  if (verdict === 'BUST' || verdict === 'SELL') {
    if (gap >= 200) return 'Move for any future 2nd';
    if (gap >= 100) return 'Shop to contenders now';
    return 'Review before Week 1';
  }
  if (verdict === 'BOOM' || verdict === 'BUY') {
    if (gap >= 100) return 'Buy window — act before market catches up';
    return 'Add on dips';
  }
  return 'Monitor weekly';
}

function confidenceTier(rankDelta: number | null): string {
  const raw = rankDelta != null ? Math.min(85, 55 + Math.abs(rankDelta) / 8) : 55;
  return formatStartSitConfidence(raw);
}

function MarketSignalCard({ player }: { player: RotationPlayer }) {
  const mv = player.marketVerdict;
  if (!mv || mv.noMarketData) return null;

  const ktc = mv.ktcRank ?? null;
  const bob = engineRank(mv.ktcRank ?? null, mv.rankDelta);
  const gap = mv.rankDelta != null ? Math.abs(Math.round(mv.rankDelta)) : null;
  const verdictLabel = formatMarketVerdictLabel(mv.verdict);

  return (
    <div
      className="min-w-[240px] flex-[1_1_0] rounded-[10px] border border-border bg-[#0f1420] p-3.5"
      style={{ boxShadow: `0 0 12px ${mv.color}12` }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
          style={{ color: mv.color, background: `${mv.color}1a` }}
        >
          {verdictLabel}
        </span>
        <span className="font-figtree text-[14px] text-text">{player.name}</span>
        <span className="font-mono text-[10px] text-muted">
          {player.position} · {player.team}
        </span>
      </div>
      <div className="space-y-1 font-mono text-[11px] tabular-nums text-muted">
        <div>
          Market Rank: <span className="text-text">{ktc ?? '—'}</span>
        </div>
        <div>
          BOB Rank: <span className="text-text">{bob ?? '—'}</span>
        </div>
        <div>
          Gap: <span className="text-text">{gap != null ? `${gap} spots` : '—'}</span>
        </div>
      </div>
      <p className="mt-2 font-figtree text-[11px] italic text-muted">
        &ldquo;{suggestedAction(mv.verdict, mv.rankDelta)}&rdquo;
      </p>
      <div className="mt-2 font-mono text-[10px] text-muted">
        Confidence: <span className="text-text">{confidenceTier(mv.rankDelta)}</span>
      </div>
    </div>
  );
}

export default function MarketSignalsPanel({ players }: { players: RotationPlayer[] }) {
  const sorted = sortByMarketSignal(players).slice(0, 5);

  if (sorted.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-[#0f1420] px-4 py-6 text-center font-mono text-[13px] text-muted">
        No market signals yet — sync leagues to populate.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="font-figtree text-[11px] uppercase tracking-[1.5px] text-text">Market Signals</span>
        <Link href="/players" className="font-mono text-[11px] text-boom no-underline hover:underline">
          View All Players →
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sorted.map((p) => (
          <MarketSignalCard key={p.playerId} player={p} />
        ))}
      </div>
    </section>
  );
}
