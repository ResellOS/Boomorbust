import { formatPerformanceVerdictLabel } from '@/lib/ui/labels';

export type ProjectionCardProps = {
  playerName: string;
  position: string;
  team: string;
  week: number;
  tfoScore: number;
  grade: string;
  verdict: string;
  startScore: number;
  projLow: number;
  projHigh: number;
  opponent: string;
  matchupGrade: number;
  weatherCondition: string;
  weatherTemp: number;
  flags: string[];
  reasoning: string;
  verdictColor: string;
  gradeColor: string;
  matchupLabel: string;
  weatherIcon: string;
};

export default function ProjectionCard(p: ProjectionCardProps) {
  return (
    <div
      className="rounded-xl border border-white/[0.1] bg-[rgba(13,17,23,0.85)] p-4 shadow-[0_0_28px_rgba(34,211,238,0.12),0_0_48px_rgba(62,207,173,0.08)] backdrop-blur-md"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{p.playerName}</p>
          <p className="mt-0.5 text-[11px] text-[#64748B]">
            {p.position} · {p.team} · WK <span className="font-mono tabular-nums">{p.week}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Rating</p>
          <p className="text-xl font-black tabular-nums text-white font-mono">{p.tfoScore}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold"
          style={{ color: p.gradeColor, background: `${p.gradeColor}18`, border: `1px solid ${p.gradeColor}44` }}
        >
          {p.grade}
        </span>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
          style={{ color: p.verdictColor, background: `${p.verdictColor}14` }}
        >
          {formatPerformanceVerdictLabel(p.verdict)}
        </span>
        <span className="text-[10px] text-[#94A3B8]">
          Start score <span className="font-mono font-bold tabular-nums text-white">{p.startScore}</span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#64748B]">Projection</p>
          <p className="mt-0.5 font-bold text-white">
            <span className="font-mono tabular-nums">
              {p.projLow}–{p.projHigh}
            </span>{' '}
            <span className="text-[#64748B] font-normal">pts</span>
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-wide text-[#64748B]">{p.matchupLabel}</p>
          <p className="mt-0.5 font-bold text-white">
            Matchup <span className="font-mono tabular-nums text-[#22D3EE]">{p.matchupGrade}</span>
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-[#94A3B8]">
        <span aria-hidden>{p.weatherIcon}</span>
        <span>
          {p.weatherCondition} · <span className="font-mono tabular-nums">{p.weatherTemp}°</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {p.flags.map((f) => (
          <span
            key={f}
            className="rounded border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#94A3B8]"
          >
            {f.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <p className="mt-3 border-t border-white/[0.06] pt-3 text-[12px] leading-snug text-[#94A3B8]">{p.reasoning}</p>
    </div>
  );
}
