'use client';

import type { RookieProspect } from './types';
import { gradeToValue } from './types';

interface Props {
  prospect: RookieProspect | null;
  loading: boolean;
}

// ─── Pentagon SVG (matching PlayerHubCard pentagon style) ─────────────────────

function pentagonPoints(cx: number, cy: number, r: number, values: number[]): string {
  // 5 vertices, starting from top (−90°), clockwise
  return values
    .map((v, i) => {
      const angle = ((i * 72 - 90) * Math.PI) / 180;
      const scale = v / 100;
      const x = cx + r * scale * Math.cos(angle);
      const y = cy + r * scale * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function benchmarkPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#36E7A1';
  if (grade.startsWith('B')) return '#22D3EE';
  if (grade.startsWith('C')) return '#FBBF24';
  return '#EF4444';
}

function LandingPentagon({ prospect }: { prospect: RookieProspect }) {
  const cx = 90;
  const cy = 90;
  const R  = 70;

  const { landingSpotPentagon: pts } = prospect;
  const values = pts.map((p) => gradeToValue(p.grade));
  const playerPts = pentagonPoints(cx, cy, R, values);
  const benchPts  = benchmarkPoints(cx, cy, R);

  // axis tip positions for labels
  const axisTips = pts.map((_, i) => {
    const angle = ((i * 72 - 90) * Math.PI) / 180;
    return {
      x: cx + (R + 18) * Math.cos(angle),
      y: cy + (R + 18) * Math.sin(angle),
    };
  });

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      {/* Benchmark outline */}
      <polygon points={benchPts} fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
      {/* Player fill */}
      <polygon points={playerPts} fill="rgba(167,139,250,0.18)" stroke="#A78BFA" strokeWidth="1.5" />
      {/* Axis lines */}
      {pts.map((_, i) => {
        const angle = ((i * 72 - 90) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(angle)} y2={cy + R * Math.sin(angle)}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
          />
        );
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2" fill="rgba(255,255,255,0.3)" />
      {/* Axis labels */}
      {pts.map((pt, i) => {
        const tip = axisTips[i];
        const lines = pt.label.split('\n');
        return (
          <text key={i} x={tip.x} y={tip.y} textAnchor="middle" dominantBaseline="middle">
            {lines.map((line, li) => (
              <tspan
                key={li}
                x={tip.x}
                dy={li === 0 ? (lines.length === 2 ? '-0.5em' : '0') : '1.1em'}
                fill="#64748B"
                fontSize="7"
                fontFamily="system-ui"
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

function GradeRow({ label, grade }: { label: string; grade: string }) {
  const color = gradeColor(grade);
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[12px] text-slate-400">{label}</span>
      </div>
      <span className="text-[13px] font-bold" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
        {grade}
      </span>
    </div>
  );
}

export default function LandingSpotAnalyzer({ prospect, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-white/[0.06] rounded w-40 mb-4" />
        <div className="flex gap-4">
          <div className="w-40 h-40 bg-white/[0.06] rounded-full" />
          <div className="flex-1 space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-white/[0.06] rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="glass-card p-4">
        <h2 className="text-[13px] font-bold text-white tracking-wide uppercase mb-3">LANDING SPOT ANALYZER</h2>
        <p className="text-[13px] text-slate-500 py-4 text-center">Select a player from the board</p>
      </div>
    );
  }

  const { grades } = prospect.landingSpotGrades
    ? { grades: prospect.landingSpotGrades }
    : { grades: null };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-white tracking-wide uppercase">LANDING SPOT ANALYZER</h2>
        <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          View Full Analysis
        </button>
      </div>

      <div className="flex items-start gap-4">
        {/* Pentagon */}
        <div className="flex-shrink-0">
          <LandingPentagon prospect={prospect} />
        </div>

        {/* Grade breakdown */}
        {grades && (
          <div className="flex-1 min-w-0 pt-4">
            <GradeRow label="Offensive Environment" grade={grades.offensiveEnvironment} />
            <GradeRow label="QB Quality" grade={grades.qbQuality} />
            <GradeRow label="Target Competition" grade={grades.targetCompetition} />
            <GradeRow label="Coaching Grade" grade={grades.coachingGrade} />
            <GradeRow label="Scheme Fit" grade={grades.schemeFit} />
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[12px] text-slate-400 font-semibold">Overall Landing Spot Grade</span>
              <span
                className="text-[15px] font-bold px-2 py-0.5 rounded-lg"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: gradeColor(grades.overall),
                  background: `${gradeColor(grades.overall)}15`,
                  border: `1px solid ${gradeColor(grades.overall)}30`,
                }}
              >
                {grades.overall}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
