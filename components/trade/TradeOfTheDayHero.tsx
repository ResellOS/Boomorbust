'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CountUpDelta from '@/components/dashboard/CountUpDelta';
import TradePlayerHeadshot from '@/components/trade/TradePlayerHeadshot';
import AnimatedCard from '@/components/ui/AnimatedCard';
import GlowBorder from '@/components/ui/GlowBorder';
import type { TradeOpportunity } from '@/lib/trade/types';
import {
  acceptanceColor,
  confidenceScore,
  valueGapColor,
  whyThisMattersBullets,
} from '@/lib/trade/tradeHubUi';

const ROTATE_MS = 6500;

function impactColor(impact: number): string {
  if (impact >= 5) return '#36E7A1';
  if (impact >= 2) return '#FBBF24';
  return '#A78BFA';
}

function fairnessColor(score: number): string {
  if (score >= 70) return '#36E7A1';
  if (score >= 50) return '#FBBF24';
  return '#EF4444';
}

export default function TradeOfTheDayHero({
  opportunities,
  onStageOffer,
  onViewTrade,
  onSendCalculator,
}: {
  opportunities: TradeOpportunity[];
  onStageOffer: (opp: TradeOpportunity) => void;
  onViewTrade: (opp: TradeOpportunity) => void;
  onSendCalculator: (opp: TradeOpportunity) => void;
}) {
  const pool = useMemo(() => opportunities.slice(0, 5), [opportunities]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback(
    (next: number) => {
      if (pool.length <= 1) return;
      setVisible(false);
      window.setTimeout(() => {
        setIndex((next + pool.length) % pool.length);
        setVisible(true);
      }, 220);
    },
    [pool.length],
  );

  useEffect(() => {
    setIndex(0);
  }, [pool]);

  useEffect(() => {
    if (pool.length <= 1 || paused) return;
    const iv = window.setInterval(() => goTo(index + 1), ROTATE_MS);
    return () => window.clearInterval(iv);
  }, [pool.length, paused, index, goTo]);

  if (pool.length === 0) {
    return (
      <section className="rounded-[10px] border border-dashed border-[#1e2640] bg-[#0f1420] px-4 py-8 text-center">
        <p className="font-figtree text-[14px] text-[#6b7a99]">
          Building trade intelligence… sync leagues to surface today&apos;s highest-leverage move.
        </p>
      </section>
    );
  }

  const o = pool[index] ?? pool[0]!;
  const rankDelta = o.valueGap ?? (o.marketRank != null && o.bobRank != null ? o.marketRank - o.bobRank : null);
  const rankDisplay = rankDelta != null
    ? (o.type === 'sell_high' ? -Math.abs(rankDelta) : Math.abs(rankDelta))
    : null;
  const glowClass = o.type === 'sell_high' ? 'dash-bust-glow' : 'dash-boom-glow';
  const whyMatters = whyThisMattersBullets(o);
  const confNum = confidenceScore(o.tradeConfidence);

  return (
    <AnimatedCard>
    <GlowBorder tone="boom" intensity={0.7} rounded="rounded-[10px]">
    <section
      className={`dash-clickable-card overflow-hidden rounded-[10px] border border-transparent bg-[#0f1420] ${glowClass}`}
      style={{ borderLeft: '4px solid #36E7A1' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => onStageOffer(o)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onStageOffer(o);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 bg-[#0a0d14]/60 px-4 py-2">
        <div>
          <h2 className="font-figtree text-[12px] uppercase tracking-[2px] text-[#e8ecf4]">
            Trade of the Day
          </h2>
          <p className="font-mono text-[9px] text-boom/90">Today&apos;s highest-leverage move</p>
        </div>
        <div className="flex items-center gap-3">
          {pool.length > 1 ? (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => goTo(index - 1)} className="text-[#6b7a99] hover:text-boom">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono text-[10px] tabular-nums text-[#8b9bb8]">
                {index + 1} / {pool.length}
              </span>
              <button type="button" onClick={() => goTo(index + 1)} className="text-[#6b7a99] hover:text-boom">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <span className="font-mono text-[10px] text-[#6b7a99]">{o.leagueName}</span>
        </div>
      </div>

      <div className={`dash-priority-fade transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <TradePlayerHeadshot playerId={o.playerId} name={o.playerName} size={52} />
          <div className="min-w-0 flex-1">
            <div className="font-figtree text-lg font-bold text-[#e8ecf4] md:text-xl">{o.playerName}</div>
            <div className="font-mono text-[10px] uppercase text-[#8b9bb8]">
              {o.position} · {o.team} · vs {o.managerName}
            </div>
          </div>
        </div>

        <div key={o.id} className="mx-4 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <ScoreChip label="Acceptance" color={acceptanceColor(o.acceptanceProbability)}>
              <CountUpDelta key={`${o.id}-acc`} value={o.acceptanceProbability} />
              <span className="text-[12px]">%</span>
            </ScoreChip>
            <ScoreChip label="Impact" color={impactColor(o.championshipImpact)}>
              +<CountUpDelta key={`${o.id}-imp`} value={Math.round(o.championshipImpact * 10) / 10} />%
            </ScoreChip>
            <ScoreChip label="Rank Δ" color={rankDisplay != null ? valueGapColor(Math.abs(rankDisplay), o.type) : '#8b9bb8'}>
              {rankDisplay != null ? (
                <CountUpDelta key={`${o.id}-rd`} value={rankDisplay} />
              ) : (
                '—'
              )}
            </ScoreChip>
            <ScoreChip label="Confidence" color={confNum >= 80 ? '#36E7A1' : confNum >= 60 ? '#FBBF24' : '#A78BFA'}>
              <CountUpDelta key={`${o.id}-conf`} value={confNum} />
            </ScoreChip>
          </div>
          <div className="mt-2">
            <ScoreChip label="Fairness" color={fairnessColor(o.mutualBenefitScore)}>
              {o.mutualBenefitScore}/100
            </ScoreChip>
          </div>
        </div>

        <div className="grid gap-3 px-4 pb-3 lg:grid-cols-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wide text-boom">Why This Matters</div>
            <ul className="mt-1.5 space-y-1">
              {whyMatters.map((b) => (
                <li key={b} className="font-figtree text-[12px] leading-snug text-[#b8c4dc]">
                  <span className="text-boom">✓ </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-3 py-2.5">
            <div className="font-mono text-[9px] uppercase text-[#6b7a99]">Suggested Package</div>
            <div className="mt-1 font-figtree text-[12px] text-[#e8ecf4]">
              You give: {o.givePlayerName}
              {o.suggestedAddOn ? ` + ${o.suggestedAddOn}` : ''}
              {o.suggestedPrice ? ` + ${o.suggestedPrice}` : ''}
            </div>
            <div className="font-figtree text-[12px] font-semibold text-boom">You get: {o.getPlayerName}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#1e2640]/60 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onStageOffer(o)}
          className={`dash-action-btn rounded-md px-4 py-2 font-mono text-[11px] font-semibold uppercase ${
            o.type === 'sell_high' ? 'bg-boom text-[#0a0d14]' : 'bg-bust text-white'
          }`}
        >
          Stage Offer
        </button>
        <button
          type="button"
          onClick={() => onViewTrade(o)}
          className="dash-action-btn rounded-md border border-[#1e2640] px-4 py-2 font-mono text-[11px] text-boom"
        >
          View Full Trade
        </button>
        <button
          type="button"
          onClick={() => onSendCalculator(o)}
          className="dash-action-btn rounded-md border border-[#1e2640] px-4 py-2 font-mono text-[11px] text-[#8b9bb8]"
        >
          Send to Calculator
        </button>
      </div>
    </section>
    </GlowBorder>
    </AnimatedCard>
  );
}

function ScoreChip({
  label,
  children,
  color = '#e8ecf4',
}: {
  label: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex w-full flex-col items-center rounded border border-[#1e2640]/50 bg-[#0a0d14]/50 px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-[18px] font-semibold tabular-nums" style={{ color }}>
        {children}
      </div>
    </div>
  );
}
