'use client';

import type { DashboardPortfolioOverview } from '@/lib/dashboard/portfolioOverview';

export default function DashboardPortfolioOverview({
  data,
  title = 'Portfolio Overview (All Leagues)',
}: {
  data: DashboardPortfolioOverview;
  title?: string;
}) {
  const riskColor =
    data.injuryRiskStatus === 'good'
      ? '#36E7A1'
      : data.injuryRiskStatus === 'warn'
        ? '#FBBF24'
        : '#EF4444';

  return (
    <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-4 md:px-5">
      <h3 className="font-figtree text-[10px] uppercase tracking-[1.8px] text-[#e8ecf4]">{title}</h3>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total Players" value={String(data.totalPlayers)} />
        <Stat label="Avg Team Rank" value={data.avgTeamRank} />
        <Stat
          label="Young Core Score"
          value={`${data.youngCoreScore} / ${data.youngCoreLabel}`}
          accent
        />
        <Stat label="Future Picks" value={data.futurePicks} muted />
        <Stat label="Injury Risk" value={data.injuryRisk} color={riskColor} />
        <Stat label="Position Depth" value="See chart" />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-24 w-24 shrink-0 sm:mx-0">
          <PositionDonut segments={data.positionDepth} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          {data.positionDepth.map((seg) => (
            <div key={seg.position} className="flex items-center gap-2 font-mono text-[9px]">
              <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
              <span className="text-[#6b7a99]">{seg.position}</span>
              <span className="tabular-nums text-[#e8ecf4]">{seg.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
  color,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-[#1e2640]/50 bg-[#141929]/50 px-2.5 py-2">
      <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{label}</div>
      <div
        className={`mt-0.5 font-mono text-[11px] tabular-nums leading-snug ${muted ? 'text-[#6b7a99]' : accent ? 'text-boom' : 'text-[#e8ecf4]'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function PositionDonut({
  segments,
}: {
  segments: { position: string; pct: number; color: string }[];
}) {
  let cumulative = 0;
  const gradientParts = segments
    .filter((s) => s.pct > 0)
    .map((s) => {
      const start = cumulative;
      cumulative += s.pct;
      return `${s.color} ${start}% ${cumulative}%`;
    });

  const background =
    gradientParts.length > 0
      ? `conic-gradient(${gradientParts.join(', ')})`
      : 'conic-gradient(#1e2640 0% 100%)';

  return (
    <div
      className="h-full w-full rounded-full"
      style={{
        background,
        mask: 'radial-gradient(circle, transparent 52%, black 53%)',
        WebkitMask: 'radial-gradient(circle, transparent 52%, black 53%)',
      }}
      aria-hidden
    />
  );
}
