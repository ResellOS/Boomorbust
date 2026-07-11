'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import AnimatedCard from '@/components/ui/AnimatedCard';
import GlowBorder from '@/components/ui/GlowBorder';
import { buildHeroTargets, impactBadgeStyle } from '@/lib/dashboard/priorityHero';
import type { DailyTask } from '@/lib/dashboard/dailyTasks';
import type { LineupOpportunity, TradeTargetItem } from '@/lib/dashboard/rotation';
import type { OpportunityFeedItem } from '@/lib/dashboard/opportunityFeed';

const ROTATE_MS = 6500;

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
  const router = useRouter();
  const targets = useMemo(
    () => buildHeroTargets(tasks, tradeTargets, lineupOpportunity),
    [tasks, tradeTargets, lineupOpportunity],
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback(
    (next: number) => {
      if (targets.length <= 1) return;
      setVisible(false);
      window.setTimeout(() => {
        setIndex((next + targets.length) % targets.length);
        setVisible(true);
      }, 220);
    },
    [targets.length],
  );

  const rotate = useCallback(() => goTo(index + 1), [goTo, index]);

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
      <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-2.5">
        <h2 className="font-figtree text-[11px] uppercase tracking-[1.8px] text-[#e8ecf4]">
          Today&apos;s Top Priority
        </h2>
        <p className="mt-1.5 font-figtree text-[14px] text-[#e8ecf4]">No critical move today</p>
        {fallbackFeedItem ? (
          <button
            type="button"
            onClick={() => fallbackFeedItem.href && router.push(fallbackFeedItem.href)}
            className="mt-2 w-full rounded-md border border-[#1e2640]/60 bg-[#141929]/60 px-2.5 py-2 text-left dash-clickable-row"
          >
            <p className="font-figtree text-[13px] text-[#e8ecf4]">{fallbackFeedItem.headline}</p>
            <p className="mt-0.5 font-figtree text-[12px] text-[#9aa8c4]">{fallbackFeedItem.explanation}</p>
          </button>
        ) : (
          <p className="mt-1 font-mono text-[11px] text-[#6b7a99]">
            Priorities appear once intelligence data is ready.
          </p>
        )}
      </section>
    );
  }

  const target = targets[index] ?? targets[0]!;
  const badge = impactBadgeStyle(target.impactLevel);
  const posTeam =
    target.position && target.team
      ? `${target.position} · ${target.team}`
      : target.position ?? target.team ?? '';
  const glowClass = target.isSell ? 'dash-bust-glow' : target.impactLevel === 'HIGH' ? 'dash-boom-glow' : '';

  const openPrimary = () => router.push(target.stageHref);

  return (
    <AnimatedCard>
    <GlowBorder tone="boom" intensity={0.7} rounded="rounded-[10px]">
    <section
      className={`dash-clickable-card overflow-hidden rounded-[10px] border border-transparent bg-[#0f1420] ${glowClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={openPrimary}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPrimary();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Top priority: ${target.title}. Click to open action.`}
    >
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <h2 className="font-figtree text-[11px] uppercase tracking-[1.8px] text-[#e8ecf4]">
            Today&apos;s Top Priority
          </h2>
          {targets.length > 1 ? (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="rounded p-0.5 text-[#6b7a99] hover:text-boom"
                aria-label="Previous priority"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-[9px] tabular-nums text-[#8b9bb8]">
                {index + 1}/{targets.length}
              </span>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="rounded p-0.5 text-[#6b7a99] hover:text-boom"
                aria-label="Next priority"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide"
          style={{ background: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      <div className={`dash-priority-fade px-3 py-2.5 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {target.playerId ? (
              <PlayerAvatar
                playerId={target.playerId}
                name={target.playerName ?? target.title}
                size={48}
                borderClass="ring-2 ring-boom/40"
              />
            ) : (
              <div className="h-[48px] w-[48px] shrink-0 rounded-full bg-[#141929] ring-2 ring-boom/40" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-figtree text-[17px] font-semibold leading-tight text-[#e8ecf4]">
                {target.title}
              </h3>
              {posTeam ? (
                <p className="font-mono text-[10px] uppercase text-[#8b9bb8]">{posTeam}</p>
              ) : null}
              <p className="font-mono text-[10px] text-[#6b7a99]">{target.leagueName}</p>
              <p className="mt-1 line-clamp-2 font-figtree text-[12px] leading-snug text-[#b8c4dc]">
                <span className="text-[#e8ecf4]">Why: </span>
                {target.why}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-[#1e2640]/60 lg:border-l lg:pl-3">
            <MiniMetric label={target.offerLabel} value={target.suggestedOffer} />
            <MiniMetric label="Accept" value={target.acceptanceChance} />
            <MiniMetric label="Impact" value={target.portfolioImpact} accent />
            <MiniMetric label="Conf." value={target.confidence} />
          </div>

          <div className="flex shrink-0 gap-1.5 lg:flex-col" onClick={(e) => e.stopPropagation()}>
            <Link
              href={target.stageHref}
              className={`dash-action-btn inline-flex items-center justify-center rounded-md px-3 py-1.5 font-figtree text-[11px] font-semibold no-underline ${
                target.isSell ? 'bg-bust text-white' : 'bg-boom text-[#0a0d14]'
              }`}
            >
              {target.isSell ? 'View Trade' : 'Stage Offer'}
            </Link>
            <Link
              href={target.detailHref}
              className="dash-action-btn inline-flex items-center justify-center rounded-md border border-[#1e2640] px-3 py-1.5 font-mono text-[10px] text-boom no-underline"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </section>
    </GlowBorder>
    </AnimatedCard>
  );
}

function MiniMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-[72px]">
      <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{label}</div>
      <div className={`font-mono text-[11px] tabular-nums leading-tight ${accent ? 'text-boom' : 'text-[#e8ecf4]'}`}>
        {value}
      </div>
    </div>
  );
}
