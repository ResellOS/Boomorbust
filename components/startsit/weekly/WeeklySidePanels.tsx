'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import PulsingDot from '@/components/ui/PulsingDot';
import type { StartSitRecommendation } from '@/lib/startsit/types';

interface WeeklySidePanelsProps {
  boom: StartSitRecommendation[];
  bust: StartSitRecommendation[];
  weeklyRisks: string[];
  waiverAdd: StartSitRecommendation | null;
  benchRegret: { playerName: string; regretPct: number; threatens: string }[];
  weatherImpact: string;
  onSelectPlayer: (playerId: string) => void;
}

function PanelShell({
  title,
  dotColor,
  children,
}: {
  title: string;
  dotColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        {dotColor ? <PulsingDot color={dotColor} size={6} /> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

// Sunday game-day timeline: 9 AM → 4 PM window.
const TIMELINE_START = 9;
const TIMELINE_END = 16;
const timelinePct = (hour: number): number =>
  Math.max(0, Math.min(100, ((hour - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));

const TIME_MARKERS = [
  { hour: 9, label: '9:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 13, label: '1:00 PM' },
  { hour: 14, label: '2:00 PM' },
  { hour: 16, label: '4:00 PM' },
];

const TIMELINE_EVENTS = [
  { hour: 9, label: 'Active Lineup' },
  { hour: 11, label: 'Decisions' },
  { hour: 12, label: 'Waiver Sub' },
  { hour: 12.75, label: 'Final Edit' },
  { hour: 13, label: 'Kickoff' },
];

/** Green marker at the viewer's current local time (client-only to avoid SSR mismatch). */
function useCurrentTimePct(): number | null {
  const [pct, setPct] = useState<number | null>(null);
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      setPct(timelinePct(now.getHours() + now.getMinutes() / 60));
    };
    compute();
    const iv = window.setInterval(compute, 60_000);
    return () => window.clearInterval(iv);
  }, []);
  return pct;
}

export default function WeeklySidePanels({
  boom,
  bust,
  weeklyRisks,
  waiverAdd,
  benchRegret,
  weatherImpact,
  onSelectPlayer,
}: WeeklySidePanelsProps) {
  const currentTimePct = useCurrentTimePct();
  return (
    <div className="space-y-2">
      <PanelShell title="Boom Candidates" dotColor="#36E7A1">
        {boom.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">No boom signals yet</p>
        ) : (
          <ul className="space-y-1.5">
            {boom.map((p) => (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => onSelectPlayer(p.playerId)}
                  className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
                >
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[10px] uppercase text-text">
                      {p.fullName}
                    </div>
                    <div className="font-mono text-[9px] text-boom">
                      {(p.projectedPoints ?? 0).toFixed(1)} pts · {p.confidence}%
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Bust Risks" dotColor="#EF4444">
        {bust.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">No bust flags</p>
        ) : (
          <ul className="space-y-1.5">
            {bust.map((p) => (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => onSelectPlayer(p.playerId)}
                  className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
                >
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[10px] uppercase text-text">
                      {p.fullName}
                    </div>
                    <div className="font-mono text-[9px] text-bust">
                      Risk {Math.round(100 - p.startScore)}%
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Weekly Risks">
        {weeklyRisks.length === 0 && weatherImpact === 'Low' ? (
          <p className="font-mono text-[10px] text-muted">No major risks flagged</p>
        ) : (
          <ul className="space-y-0.5 font-mono text-[10px] text-muted">
            {weatherImpact !== 'Low' && (
              <li className="text-[#22D3EE]">Weather: {weatherImpact}</li>
            )}
            {weeklyRisks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Waiver Recommendation">
        {waiverAdd ? (
          <div>
            <button
              type="button"
              onClick={() => onSelectPlayer(waiverAdd.playerId)}
              className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
            >
              <PlayerAvatar playerId={waiverAdd.playerId} name={waiverAdd.fullName} size={28} />
              <div>
                <div className="font-mono text-[11px] uppercase text-boom">
                  Add {waiverAdd.fullName}
                </div>
                <div className="font-mono text-[9px] text-muted">
                  {waiverAdd.position} · {waiverAdd.confidence}% conf
                </div>
              </div>
            </button>
            <Link
              href="/dashboard"
              className="mt-1.5 inline-block w-full rounded border border-boom/30 bg-boom/10 py-1 text-center font-mono text-[9px] uppercase text-boom hover:bg-boom/15"
            >
              Approve Move
            </Link>
          </div>
        ) : (
          <p className="font-mono text-[10px] text-muted">No waiver edge this week</p>
        )}
      </PanelShell>

      <PanelShell title="Bench Regret Risk">
        {benchRegret.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">No close bench calls</p>
        ) : (
          <ul className="space-y-1 font-mono text-[10px]">
            {benchRegret.map((b) => (
              <li key={b.playerName} className="flex justify-between gap-2">
                <span className="truncate text-text">{b.playerName}</span>
                <span className="shrink-0 text-hold">{b.regretPct}% vs {b.threatens.split(' ').pop()}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Sunday Timeline">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="relative min-w-[440px] px-2 pb-1 pt-4">
            {/* Event labels above the axis */}
            {TIMELINE_EVENTS.map((ev) => (
              <div
                key={ev.label}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] uppercase leading-none text-muted"
                style={{ left: `${timelinePct(ev.hour)}%` }}
              >
                {ev.label}
              </div>
            ))}

            {/* Axis with time markers + current-time indicator */}
            <div className="relative h-[2px] w-full rounded-full bg-[#1e2640]">
              {TIME_MARKERS.map((m) => (
                <div
                  key={m.label}
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1e2640]"
                  style={{ left: `${timelinePct(m.hour)}%` }}
                />
              ))}
              {currentTimePct != null ? (
                <div
                  className="absolute top-1/2 h-3.5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-boom transition-all duration-500"
                  style={{ left: `${currentTimePct}%`, boxShadow: '0 0 6px rgba(54,231,161,0.6)' }}
                />
              ) : null}
            </div>

            {/* Time marker labels below the axis */}
            <div className="relative mt-1.5 h-3">
              {TIME_MARKERS.map((m) => (
                <div
                  key={m.label}
                  className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[7px] leading-none text-muted"
                  style={{ left: `${timelinePct(m.hour)}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}
