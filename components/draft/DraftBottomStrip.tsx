'use client';

import type { ChatMessage, DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { computeDraftDynamics } from '@/lib/draft/analyst';
import { slotForOverall } from '@/lib/draft/engine';
import { abbrevName, safePickLabel, safeTeams, safeTotalPicks } from '@/lib/draft/safeDisplay';

interface DraftBottomStripProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
  currentOverall: number;
  isUserTurn: boolean;
  chat: ChatMessage[];
  taken: Set<string>;
  poolLength: number;
}

export default function DraftBottomStrip({
  config,
  picks,
  currentOverall,
  isUserTurn,
  chat,
  taken,
  poolLength,
}: DraftBottomStripProps) {
  const teams = safeTeams(config);
  const total = safeTotalPicks(config);
  const dynamics = computeDraftDynamics(picks, [], taken, currentOverall);
  const posRun = dynamics.find((d) => d.kind === 'position_run');

  const recent = picks.slice(-5).reverse();
  const slotOpts = {
    thirdRoundReversal: config.thirdRoundReversal,
    linear: config.draftOrderType === 'linear',
  };

  const nextPicks = Array.from({ length: Math.min(4, total - picks.length) }, (_, i) => {
    const overall = picks.length + 1 + i;
    const { slot } = slotForOverall(overall, teams, slotOpts);
    const team = config.teamOrder.find((t) => t.slot === slot);
    return {
      overall,
      label: safePickLabel(overall, teams),
      team: team?.name?.slice(0, 3).toUpperCase() ?? `T${slot}`,
    };
  });

  const pickLabel = safePickLabel(currentOverall, teams);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-border bg-[#0f1420] px-4 py-2 font-mono text-[8px] text-muted">
      <div className="min-w-[140px]">
        <div className="uppercase tracking-wide">Draft Trends</div>
        <div className="text-text">
          {posRun && posRun.kind === 'position_run'
            ? `${posRun.position}s going early`
            : 'Balanced board flow'}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="uppercase tracking-wide">Live Feed</div>
        <div className="truncate text-text">
          {chat.length > 0
            ? chat[chat.length - 1]!.text
            : recent.length > 0
              ? `${abbrevName(recent[0]!.player.name)} drafted`
              : 'Draft live — BOB assistant online'}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="uppercase">Next Picks</span>
        {nextPicks.map((p) => (
          <span
            key={p.overall}
            className="rounded border border-border bg-[#141929] px-1.5 py-0.5 tabular-nums text-text"
          >
            {p.label} {p.team}
          </span>
        ))}
      </div>

      <div className="ml-auto text-right">
        <div className="uppercase tracking-wide">On The Clock</div>
        <div className={isUserTurn ? 'text-boom' : 'text-text'}>
          {pickLabel} {isUserTurn ? 'Your Pick' : '—'}
        </div>
      </div>

      <span className="hidden text-muted/60 sm:inline">Pool {poolLength}</span>
    </div>
  );
}
