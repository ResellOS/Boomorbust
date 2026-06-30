'use client';

import { Settings } from 'lucide-react';
import type { DraftConfig } from '@/lib/draft/types';
import {
  fmtClock,
  safeFormatLabel,
  safePickLabel,
  safeRoundDisplay,
  safeTeams,
} from '@/lib/draft/safeDisplay';

interface DraftHeaderProps {
  config: DraftConfig;
  currentOverall: number;
  picksRemaining: number;
  isUserTurn: boolean;
  clock: number;
  onSettings?: () => void;
  draftStartedAt?: number;
}

export default function DraftHeader({
  config,
  currentOverall,
  picksRemaining,
  isUserTurn,
  clock,
  onSettings,
  draftStartedAt,
}: DraftHeaderProps) {
  const teams = safeTeams(config);
  const pickLabel = safePickLabel(currentOverall, teams);
  const userPickLabel = isUserTurn ? `${pickLabel} You` : pickLabel;

  const startLabel = draftStartedAt
    ? new Date(draftStartedAt).toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <header className="shrink-0 border-b border-border bg-[#0f1420] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted">
          <div>
            <span className="text-[9px] uppercase tracking-wide">Draft Type</span>
            <div className="text-text">{safeFormatLabel(config.draftType)}</div>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wide">Teams</span>
            <div className="tabular-nums text-text">{teams}</div>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wide">Round</span>
            <div className="tabular-nums text-text">{safeRoundDisplay(currentOverall, config)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-boom/30 bg-boom/[0.06] px-4 py-2 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-boom">On The Clock</div>
            <div className="font-mono text-[28px] tabular-nums leading-none text-boom">
              {fmtClock(clock)}
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-text">{userPickLabel}</div>
          </div>

          <div className="hidden gap-4 font-mono text-[11px] text-muted lg:flex">
            <div>
              <span className="text-[9px] uppercase">Picks Remaining</span>
              <div className="tabular-nums text-text">{Math.max(0, picksRemaining)}</div>
            </div>
            <div>
              <span className="text-[9px] uppercase">Avg Pick Time</span>
              <div className="text-text">—</div>
            </div>
            <div>
              <span className="text-[9px] uppercase">Draft Start</span>
              <div className="text-text">{startLabel}</div>
            </div>
          </div>

          {onSettings && (
            <button
              type="button"
              onClick={onSettings}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-border bg-[#141929] px-3 py-2 font-mono text-[10px] uppercase text-muted hover:text-text"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2} />
              League Settings
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
