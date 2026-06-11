'use client';

import { useState } from 'react';
import type {
  HighConfidenceAlerts,
  WeekRecord,
} from '@/lib/startsit/types';

interface StartSitRightPanelProps {
  weekRecord: WeekRecord;
  seasonSparkline: { week: number; winRate: number }[];
  alerts: HighConfidenceAlerts;
  nflWeek: number;
  leagueCount: number;
}

function SeasonSparkline({ data }: { data: { week: number; winRate: number }[] }) {
  const pts = data.length > 0 ? data : [{ week: 1, winRate: 50 }];
  const w = 240;
  const h = 60;
  const poly = pts
    .map((p, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * w;
      const y = h - 8 - (p.winRate / 100) * (h - 16);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={60} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline
        points={poly}
        fill="none"
        stroke="#36E7A1"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StartSitRightPanel({
  weekRecord,
  seasonSparkline,
  alerts,
  nflWeek,
  leagueCount,
}: StartSitRightPanelProps) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState<string | null>(null);

  const decided = weekRecord.correct + weekRecord.incorrect;
  const correctPct = decided > 0 ? (weekRecord.correct / decided) * 100 : 0;
  const incorrectPct = decided > 0 ? (weekRecord.incorrect / decided) * 100 : 0;
  const pendingPct = Math.max(0, 100 - correctPct - incorrectPct);

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeMsg(null);
    try {
      const res = await fetch('/api/startsit/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: nflWeek }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      setOptimizeMsg(json.message ?? json.error ?? 'Lineup optimized');
    } catch {
      setOptimizeMsg('Optimization failed — try again');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <aside className="flex w-[272px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface">
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
          This Week&apos;s Record
        </div>
        <div className="flex items-center justify-between py-[3px] text-[11px]">
          <span className="flex items-center gap-1.5 text-text">
            <span className="h-[7px] w-[7px] rounded-full bg-boom" />
            Correct so far
          </span>
          <span className="font-mono text-muted">{weekRecord.correct}</span>
        </div>
        <div className="flex items-center justify-between py-[3px] text-[11px]">
          <span className="flex items-center gap-1.5 text-text">
            <span className="h-[7px] w-[7px] rounded-full bg-[#ef4444]" />
            Incorrect
          </span>
          <span className="font-mono text-muted">{weekRecord.incorrect}</span>
        </div>
        <div className="flex items-center justify-between py-[3px] text-[11px]">
          <span className="flex items-center gap-1.5 text-text">
            <span className="h-[7px] w-[7px] rounded-full bg-muted" />
            Pending
          </span>
          <span className="font-mono text-muted">{weekRecord.pending}</span>
        </div>
        <div className="my-2 flex items-center justify-between">
          <span className="text-[10px] text-muted">Win rate this week</span>
          <span className="font-mono text-[10px] text-boom">{weekRecord.winRate}%</span>
        </div>
        <div className="mb-1 flex h-[5px] overflow-hidden rounded-sm bg-border">
          <div className="h-full bg-boom" style={{ width: `${correctPct}%` }} />
          <div className="h-full bg-[#ef4444]" style={{ width: `${incorrectPct}%` }} />
          <div className="h-full bg-muted/40" style={{ width: `${pendingPct}%` }} />
        </div>
        <div className="flex justify-between text-[8px] text-muted">
          <span>{Math.round(correctPct)}%</span>
          <span>{Math.round(incorrectPct)}%</span>
          <span>{Math.round(pendingPct)}%</span>
        </div>
      </div>

      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
          Season Performance
        </div>
        <div className="mb-1.5 text-[9px] text-muted">Consistency beats luck</div>
        <SeasonSparkline data={seasonSparkline} />
        <div className="mt-0.5 text-right text-[8px] text-muted">Week</div>
      </div>

      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
          High Confidence Alerts
        </div>
        {alerts.mustStart && (
          <div className="mb-1.5 rounded-[5px] border border-boom/20 bg-boom/[0.06] p-2.5">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-boom">
              Must Start
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-[11px] text-text">
                  {alerts.mustStart.fullName} {alerts.mustStart.opponent}
                </div>
                <div className="mt-0.5 text-[9px] text-muted">{alerts.mustStart.reasoning}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base text-boom">{alerts.mustStart.confidence}</div>
                <div className="text-[8px] text-muted">Confidence</div>
              </div>
            </div>
          </div>
        )}
        {alerts.mustSit && (
          <div className="mb-1.5 rounded-[5px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] p-2.5">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-[#ef4444]">
              Must Sit
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-[11px] text-text">
                  {alerts.mustSit.fullName} {alerts.mustSit.opponent}
                </div>
                <div className="mt-0.5 text-[9px] text-muted">{alerts.mustSit.reasoning}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base text-[#ef4444]">{alerts.mustSit.confidence}</div>
                <div className="text-[8px] text-muted">Confidence</div>
              </div>
            </div>
          </div>
        )}
        {alerts.sleeperPick && (
          <div className="rounded-[5px] border border-bust/20 bg-bust/[0.06] p-2.5">
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-bust">
              Sleeper Pick
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-[11px] text-text">
                  {alerts.sleeperPick.fullName} {alerts.sleeperPick.opponent}
                </div>
                <div className="mt-0.5 text-[9px] text-muted">{alerts.sleeperPick.reasoning}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-base text-bust">{alerts.sleeperPick.confidence}</div>
                <div className="text-[8px] text-muted">Confidence</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-3.5 py-3">
        <div className="mb-2 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
          My Lineup Optimizer
        </div>
        <div className="mb-1.5 text-[10px] text-muted">Based on your rostered players</div>
        <button
          type="button"
          onClick={handleOptimize}
          disabled={optimizing}
          className="w-full rounded-[5px] border-none bg-boom py-2.5 font-figtree text-xs font-bold tracking-wide text-bg disabled:opacity-60"
        >
          {optimizing ? 'Optimizing...' : `Optimize My Week ${nflWeek} Lineup`}
        </button>
        {optimizeMsg && (
          <div className="mt-2 text-center text-[9px] text-boom">{optimizeMsg}</div>
        )}
        <div className="mt-1.5 text-center text-[9px] text-muted">
          Analyzes all {leagueCount} leagues
        </div>
      </div>
    </aside>
  );
}
