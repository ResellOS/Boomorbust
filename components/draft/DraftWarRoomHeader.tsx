'use client';

import { Settings, LogOut } from 'lucide-react';
import type { DraftConfig } from '@/lib/draft/types';
import { draftSubheading, draftEdgeScore, userUpcomingPicks, teamOnClockName } from '@/lib/draft/warRoomUi';
import { fmtClock, safePickLabel, safeRoundDisplay, safeTeams, safeTotalPicks } from '@/lib/draft/safeDisplay';

interface DraftWarRoomHeaderProps {
  config: DraftConfig;
  currentOverall: number;
  currentSlot: number;
  clock: number;
  poolCount: number;
  userPickCount: number;
  onSettings: () => void;
  onLeave: () => void;
}

export default function DraftWarRoomHeader({
  config,
  currentOverall,
  currentSlot,
  clock,
  poolCount,
  userPickCount,
  onSettings,
  onLeave,
}: DraftWarRoomHeaderProps) {
  const teams = safeTeams(config);
  const total = safeTotalPicks(config);
  const sub = draftSubheading(config);
  const pickLabel = safePickLabel(currentOverall, teams);
  const onClock = teamOnClockName(config, currentSlot);
  const upcoming = userUpcomingPicks(config, currentOverall, 4);
  const edge = draftEdgeScore(config);

  return (
    <header className="shrink-0 border-b border-border bg-[#0a0d14] px-3 py-2.5 md:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-figtree text-[18px] font-extrabold uppercase tracking-[-0.5px] text-text md:text-[22px]">
            Draft Room
          </div>
          <div className="font-mono text-[11px] text-boom">{sub}</div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-muted">
            Simulated Mock Draft · Not live Sleeper
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSettings}
            className="flex items-center gap-1.5 rounded border border-border bg-[#141929] px-2.5 py-1.5 font-mono text-[10px] uppercase text-muted hover:text-text"
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={2} />
            Room Settings
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 rounded border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-[#A78BFA] hover:bg-[#7c3aed]/20"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Leave Draft Room
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <StatChip label="On The Clock" value={fmtClock(clock)} sub={`${onClock} · ${pickLabel}`} accent />
        <StatChip label="Round" value={safeRoundDisplay(currentOverall, config)} sub={`Pick ${pickLabel}`} />
        <StatChip label="Teams" value={String(teams)} sub={`${total} total picks`} />
        <StatChip
          label={config.draftType === 'rookie' ? 'Rookies' : 'Pool'}
          value={String(poolCount)}
          sub="Available"
        />
        <StatChip label="Roster Spots" value={`${userPickCount}/${config.rosterSlots.reduce((s, x) => s + x.count, 0)}`} sub="Your team" />
        <StatChip
          label="Your Picks"
          value={upcoming[0] ?? '—'}
          sub={upcoming.slice(1).join(' · ') || 'Upcoming'}
        />
        <StatChip label="Draft Assistant" value="Active" sub="Mock pick optimization" boom />
        <StatChip label="Draft Edge" value={String(edge.score)} sub={edge.label} />
      </div>
    </header>
  );
}

function StatChip({
  label,
  value,
  sub,
  accent,
  boom,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  boom?: boolean;
}) {
  return (
    <div
      className={`min-w-[100px] shrink-0 rounded-md border px-2.5 py-1.5 ${
        accent ? 'border-boom/35 bg-boom/[0.06]' : 'border-border/70 bg-[#0f1420]'
      }`}
    >
      <div className="font-mono text-[8px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`font-mono text-[15px] tabular-nums leading-tight ${
          accent || boom ? 'text-boom' : 'text-text'
        }`}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-[9px] text-muted">{sub}</div>}
    </div>
  );
}
