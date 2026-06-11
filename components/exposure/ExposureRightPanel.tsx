import Link from 'next/link';
import type {
  ExposurePlayer,
  PortfolioRisk,
  PositionBreakdown,
  WeeklyPerformance,
} from '@/lib/exposure/types';
import { subScoreRiskLabel } from '@/lib/exposure/utils';

function diversityLabel(diversity: number): { text: string; className: string } {
  if (diversity >= 67) return { text: `${diversity}% Low`, className: 'text-boom' };
  if (diversity >= 34) return { text: `${diversity}% Medium`, className: 'text-hold' };
  return { text: `${diversity}% High`, className: 'text-[#ef4444]' };
}

interface ExposureRightPanelProps {
  portfolioRisk: PortfolioRisk;
  dangerAlerts: ExposurePlayer[];
  positionBreakdown: PositionBreakdown[];
  positionAdvisory: string | null;
  weeklyPerformance: WeeklyPerformance;
  nflWeek: number;
}

function riskTitleColor(label: PortfolioRisk['label']): string {
  if (label === 'Low Risk') return 'text-boom';
  if (label === 'Moderate Risk') return 'text-hold';
  return 'text-[#ef4444]';
}

function riskCircleColor(score: number): string {
  if (score <= 33) return '#36E7A1';
  if (score <= 66) return '#FBBF24';
  return '#ef4444';
}

function DonutChart({ segments }: { segments: PositionBreakdown[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) {
    return (
      <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden>
        <circle cx={40} cy={40} r={30} fill="none" stroke="#1e2640" strokeWidth={12} />
      </svg>
    );
  }

  const circumference = 2 * Math.PI * 30;
  let offset = 0;

  return (
    <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden>
      <circle cx={40} cy={40} r={30} fill="none" stroke="#1e2640" strokeWidth={12} />
      {segments
        .filter((s) => s.count > 0)
        .map((seg) => {
          const dash = (seg.count / total) * circumference;
          const el = (
            <circle
              key={seg.position}
              cx={40}
              cy={40}
              r={30}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 40 40)"
            />
          );
          offset += dash;
          return el;
        })}
    </svg>
  );
}

export default function ExposureRightPanel({
  portfolioRisk,
  dangerAlerts,
  positionBreakdown,
  positionAdvisory,
  weeklyPerformance,
  nflWeek,
}: ExposureRightPanelProps) {
  const ringColor = riskCircleColor(portfolioRisk.score);
  const conc = subScoreRiskLabel(portfolioRisk.concentrationRisk);
  const div = diversityLabel(portfolioRisk.positionDiversity);
  const age = subScoreRiskLabel(portfolioRisk.ageCurveRisk);

  return (
    <aside className="min-h-0 w-[285px] shrink-0 overflow-y-auto border-l border-border bg-surface">
      <div className="border-b border-border px-[13px] py-[11px]">
        <div className="mb-3.5 flex items-center gap-[5px] text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
          Portfolio Risk Score
        </div>
        <div className="flex items-center gap-3.5">
          <div className="relative h-[72px] w-[72px] shrink-0">
            <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
              <circle cx={36} cy={36} r={30} fill="none" stroke="#1e2640" strokeWidth={6} />
              <circle
                cx={36}
                cy={36}
                r={30}
                fill="none"
                stroke={ringColor}
                strokeWidth={6}
                strokeDasharray={`${(portfolioRisk.score / 100) * 188.5} 188.5`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[22px] leading-none text-text">
                {portfolioRisk.score}
              </span>
              <span className="text-[9px] text-muted">/100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`mb-2 text-sm font-medium ${riskTitleColor(portfolioRisk.label)}`}
            >
              {portfolioRisk.label}
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="text-[10px] text-muted">Concentration Risk</span>
              <span className={`font-mono text-[10px] ${conc.className}`}>{conc.text}</span>
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="text-[10px] text-muted">Position Diversity</span>
              <span className={`font-mono text-[10px] ${div.className}`}>{div.text}</span>
            </div>
            <div className="flex items-center justify-between py-[3px]">
              <span className="text-[10px] text-muted">Age Curve Risk</span>
              <span className={`font-mono text-[10px] ${age.className}`}>{age.text}</span>
            </div>
          </div>
        </div>
      </div>

      {dangerAlerts.length > 0 && (
        <div className="border-b border-border px-[13px] py-[11px]">
          <div className="rounded-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[#ef4444]">⚠</span>
              <span className="text-[11px] font-medium text-[#ef4444]">Danger Zone Alert</span>
            </div>
            <div className="mb-2 text-[10px] text-muted">
              {dangerAlerts.filter((p) => p.riskLevel === 'DANGER').length || dangerAlerts.length}{' '}
              players at maximum exposure
            </div>
            {dangerAlerts.slice(0, 3).map((p) => (
              <div
                key={p.playerId}
                className="mb-1.5 flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-[7px] w-[7px] rounded-full"
                    style={{
                      background: p.riskLevel === 'DANGER' ? '#ef4444' : '#FBBF24',
                    }}
                  />
                  <span className="text-text">{p.fullName}</span>
                  {p.riskLevel !== 'DANGER' && (
                    <span className="text-[9px] text-muted">(approaching)</span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-muted">
                  {p.leagueCount}/{p.totalLeagues} leagues
                </span>
              </div>
            ))}
            <div className="mb-2 mt-2 text-[10px] text-muted">
              Consider reducing before Week {nflWeek}
            </div>
            <Link
              href="/trade?filter=reduce"
              className="block w-full rounded-[5px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2 text-center font-figtree text-[10px] font-medium text-[#ef4444] no-underline"
            >
              View Reduction Targets
            </Link>
          </div>
        </div>
      )}

      <div className="border-b border-border px-[13px] py-[11px]">
        <div className="mb-3.5 text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
          Position Breakdown
        </div>
        <div className="flex items-center gap-3">
          <DonutChart segments={positionBreakdown} />
          <div className="flex flex-1 flex-col gap-1">
            {positionBreakdown.map((seg) => (
              <div key={seg.position} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: seg.color }}
                  />
                  <span className="text-text">{seg.position}</span>
                </div>
                <span className="font-mono text-muted">{Math.round(seg.pct)}%</span>
              </div>
            ))}
          </div>
        </div>
        {positionAdvisory && (
          <div className="mt-2 text-[10px] text-hold">{positionAdvisory}</div>
        )}
      </div>

      <div className="px-[13px] py-[11px]">
        <div className="mb-3 text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
          Weekly Performance
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted">
            <span className="mr-1 text-boom">↑</span>Beating Projection
          </span>
          <span className="font-mono text-text">{weeklyPerformance.beating} players</span>
        </div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted">
            <span className="mr-1">→</span>On Track
          </span>
          <span className="font-mono text-text">{weeklyPerformance.onTrack} players</span>
        </div>
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-muted">
            <span className="mr-1 text-[#ef4444]">↓</span>Below Projection
          </span>
          <span className="font-mono text-text">{weeklyPerformance.below} players</span>
        </div>
        <div className="mb-2 h-px bg-border" />
        <div className="flex items-center justify-between py-0.5 text-[11px]">
          <span className="text-muted">Total Points</span>
          <span className="font-mono text-text">{weeklyPerformance.totalPoints.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 text-[11px]">
          <span className="text-muted">Projected</span>
          <span className="font-mono text-text">{weeklyPerformance.projected.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 text-[11px]">
          <span className="text-muted">Delta</span>
          <span
            className={`font-mono ${
              weeklyPerformance.delta >= 0 ? 'text-boom' : 'text-[#ef4444]'
            }`}
          >
            {weeklyPerformance.delta >= 0 ? '+' : ''}
            {weeklyPerformance.delta.toFixed(1)}
          </span>
        </div>
      </div>
    </aside>
  );
}
