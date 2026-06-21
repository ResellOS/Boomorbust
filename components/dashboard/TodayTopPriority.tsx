'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import {
  buildHeroTargets,
  impactBadgeStyle,
  type HeroTarget,
} from '@/lib/dashboard/priorityHero';
import type { DailyTask } from '@/lib/dashboard/dailyTasks';
import type { LineupOpportunity, TradeTargetItem } from '@/lib/dashboard/rotation';
import type { OpportunityFeedItem } from '@/lib/dashboard/opportunityFeed';

const ROTATE_MS = 5000;

interface TodayTopPriorityProps {
  tasks: DailyTask[];
  tradeTargets: TradeTargetItem[];
  lineupOpportunity: LineupOpportunity | null;
  fallbackFeedItem?: OpportunityFeedItem | null;
}

export default function TodayTopPriority({
  tasks,
  tradeTargets,
  lineupOpportunity,
  fallbackFeedItem,
}: TodayTopPriorityProps) {
  const targets = useMemo(
    () => buildHeroTargets(tasks, tradeTargets, lineupOpportunity),
    [tasks, tradeTargets, lineupOpportunity],
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  const rotate = useCallback(() => {
    if (targets.length <= 1) return;
    setVisible(false);
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % targets.length);
      setVisible(true);
    }, 280);
  }, [targets.length]);

  useEffect(() => {
    setIndex(0);
  }, [targets]);

  useEffect(() => {
    if (targets.length <= 1 || paused) return;
    const iv = window.setInterval(rotate, ROTATE_MS);
    return () => window.clearInterval(iv);
  }, [targets.length, paused, rotate]);

  if (targets.length === 0) {
    return (
      <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] p-5">
        <h2 className="font-figtree text-[10px] uppercase tracking-[1.8px] text-[#e8ecf4]">
          Today&apos;s Top Priority
        </h2>
        <p className="mt-3 font-figtree text-[14px] text-[#e8ecf4]">No critical move today</p>
        {fallbackFeedItem ? (
          <div className="mt-3 rounded-md border border-[#1e2640]/60 bg-[#141929]/60 px-3 py-2.5">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase"
              style={{ color: fallbackFeedItem.color, background: `${fallbackFeedItem.color}14` }}
            >
              {fallbackFeedItem.category}
            </span>
            <p className="mt-1.5 font-figtree text-[13px] text-[#e8ecf4]">{fallbackFeedItem.headline}</p>
            <p className="mt-0.5 font-figtree text-[11px] text-[#6b7a99]">{fallbackFeedItem.explanation}</p>
            {fallbackFeedItem.href ? (
              <Link href={fallbackFeedItem.href} className="mt-2 inline-block font-mono text-[9px] text-boom no-underline hover:underline">
                View →
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 font-mono text-[10px] text-[#6b7a99]">
            BOB is analyzing your leagues — priorities appear once intelligence data is ready.
          </p>
        )}
      </section>
    );
  }

  const target = targets[index] ?? targets[0]!;
  const badge = impactBadgeStyle(target.impactLevel);

  return (
    <section
      className="relative overflow-hidden rounded-[10px] border border-[#A78BFA]/35 bg-[#0f1420] p-4 md:p-5"
      style={{ boxShadow: '0 0 28px rgba(167,139,250,0.1), 0 0 12px rgba(54,231,161,0.06)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-figtree text-[10px] uppercase tracking-[1.8px] text-[#e8ecf4]">
            Today&apos;s Top Priority
          </h2>
          {targets.length > 1 ? (
            <p className="mt-0.5 font-mono text-[8px] text-[#6b7a99]">
              Rotating {index + 1}/{targets.length} targets
            </p>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded px-2 py-0.5 font-mono text-[7px] uppercase tracking-wide"
          style={{ background: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      <div
        className="grid grid-cols-1 gap-4 transition-opacity duration-300 md:grid-cols-[1fr_240px]"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div className="flex min-w-0 gap-4">
          {target.playerId ? (
            <PlayerAvatar playerId={target.playerId} name={target.playerName ?? target.title} size={72} />
          ) : (
            <div className="h-[72px] w-[72px] shrink-0 rounded-full bg-[#141929]" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-figtree text-[22px] font-semibold leading-tight text-[#e8ecf4] md:text-[24px]">
              {target.title}
            </h3>
            {target.position ? (
              <p className="mt-0.5 font-mono text-[10px] text-[#6b7a99]">
                {target.position}
                {target.team ? ` · ${target.team}` : ''}
              </p>
            ) : null}
            <p className="mt-1 font-mono text-[10px] text-[#6b7a99]">
              League: <span className="text-[#e8ecf4]">{target.leagueName}</span>
            </p>
            <p className="mt-2 font-figtree text-[12px] leading-relaxed text-[#6b7a99]">
              <span className="font-medium text-[#e8ecf4]">Why: </span>
              {target.why}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroMetric label="Championship Impact" value={target.championshipImpact} accent />
              <HeroMetric label="Acceptance Chance" value={target.acceptanceChance} />
              <HeroMetric label="Trade Window" value={target.tradeWindow} accent />
              <HeroMetric label="Confidence" value={target.confidence} />
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-[8px] border border-[#1e2640] bg-[#141929]/80 p-3">
          <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">Suggested Offer</div>
          <p className="mt-1 flex-1 font-figtree text-[13px] leading-snug text-[#e8ecf4]">{target.suggestedOffer}</p>
          <Link
            href={target.ctaHref}
            className="mt-3 flex w-full items-center justify-center rounded-md bg-bust px-3 py-2.5 font-figtree text-[11px] font-semibold text-white no-underline hover:brightness-110"
          >
            Create Offer
          </Link>
          <Link
            href={target.ctaHref}
            className="mt-2 text-center font-mono text-[9px] text-boom no-underline hover:underline"
          >
            View Details →
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-2 py-1.5">
      <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{label}</div>
      <div className={`mt-0.5 font-mono text-[12px] tabular-nums ${accent ? 'text-boom' : 'text-[#e8ecf4]'}`}>
        {value}
      </div>
    </div>
  );
}
