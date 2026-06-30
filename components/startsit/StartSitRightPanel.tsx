'use client';

import Link from 'next/link';
import type {
  HighConfidenceAlerts,
  SeasonRecord,
  WeekContext,
} from '@/lib/startsit/types';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import ConfidenceBadge from '@/components/startsit/ConfidenceBadge';

interface StartSitRightPanelProps {
  seasonRecord: SeasonRecord;
  alerts: HighConfidenceAlerts;
  weekContext: WeekContext;
  leagueCount: number;
}

export default function StartSitRightPanel({
  seasonRecord,
  alerts,
  weekContext,
  leagueCount,
}: StartSitRightPanelProps) {
  const preseason = weekContext.isOffseason || weekContext.nflWeek === 0;
  const hasTracking = seasonRecord.totalDecisions > 0;

  const highConfAlerts = [
    alerts.mustStart && alerts.mustStart.confidence >= 71
      ? { type: 'start' as const, rec: alerts.mustStart }
      : null,
    alerts.mustSit && alerts.mustSit.confidence >= 71
      ? { type: 'sit' as const, rec: alerts.mustSit }
      : null,
  ].filter(Boolean) as Array<{
    type: 'start' | 'sit';
    rec: NonNullable<HighConfidenceAlerts['mustStart']>;
  }>;

  return (
    <aside className="flex w-[272px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface">
      {/* BOB Track Record */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
          BOB Track Record
        </div>
        <div className="space-y-1.5 font-mono text-[12px]">
          <div className="flex justify-between">
            <span className="text-muted">Season</span>
            <span className="text-text">
              {seasonRecord.wins}-{seasonRecord.losses}-{seasonRecord.pushes}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Hit Rate</span>
            <span className="text-text">{hasTracking ? `${seasonRecord.winRate}%` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">High Confidence</span>
            <span className="text-text">—</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Medium Confidence</span>
            <span className="text-text">—</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Low Confidence</span>
            <span className="text-text">—</span>
          </div>
        </div>
        {!hasTracking && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
            Tracking begins Week 1
          </p>
        )}
        <Link
          href="/performance"
          className="mt-2 inline-block font-mono text-[10px] text-boom hover:underline"
        >
          View Full Record →
        </Link>
      </div>

      {/* High Confidence Alerts */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
          High Confidence Alerts
        </div>
        {highConfAlerts.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">
            {preseason
              ? 'Alerts appear when confidence exceeds 70%'
              : 'No high-confidence alerts this week'}
          </p>
        ) : (
          highConfAlerts.map(({ type, rec }) => (
            <div
              key={`${type}-${rec.playerId}`}
              className={`mb-1.5 rounded-[5px] p-2.5 ${
                type === 'start'
                  ? 'border border-boom/20 bg-boom/[0.06]'
                  : 'border border-bust/20 bg-bust/[0.06]'
              }`}
            >
              <div
                className={`mb-1.5 font-mono text-[9px] uppercase tracking-wide ${
                  type === 'start' ? 'text-boom' : 'text-bust'
                }`}
              >
                {type === 'start' ? 'Must Start' : 'Must Sit'}
              </div>
              <div className="flex items-start gap-2">
                <PlayerAvatar playerId={rec.playerId} name={rec.fullName} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] text-text">{rec.fullName}</div>
                  <div className="font-mono text-[10px] text-muted">
                    {rec.position} · {rec.opponent}
                  </div>
                  {rec.projectedPoints != null && (
                    <div className="mt-0.5 font-mono text-[10px] text-boom">
                      {rec.projectedPoints.toFixed(1)} proj pts
                    </div>
                  )}
                  <div className="mt-0.5 font-mono text-[9px] text-muted">{rec.reasoning}</div>
                </div>
                <ConfidenceBadge pct={rec.confidence} obviousCall={rec.obviousCall} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preseason Context */}
      <div className="px-3.5 py-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
          Preseason Context
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted">NFL Week</span>
            <span className="text-text">{preseason ? 'Preseason' : weekContext.nflWeek}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Start/Sit Window</span>
            <span className={weekContext.windowOpen ? 'text-boom' : 'text-bust'}>
              {weekContext.windowOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Lock Deadline</span>
            <span className="text-text">{weekContext.lockDeadline}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Weather Impact</span>
            <span className="text-text">{weekContext.weatherImpact}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Leagues Synced</span>
            <span className="text-text">{leagueCount}</span>
          </div>
        </div>
        <Link
          href="/startsit#matrix"
          className="mt-3 inline-block font-mono text-[10px] text-boom hover:underline"
        >
          View Matchup Matrix →
        </Link>
      </div>
    </aside>
  );
}
