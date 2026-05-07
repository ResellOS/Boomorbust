'use client';

import { useId } from 'react';
import { ShieldCheck } from 'lucide-react';

export interface RosterStatusEntry {
  /** Tailwind-friendly color name to render the dot in. */
  tone: 'green' | 'red' | 'amber' | 'gray';
  count: number;
  label: string;
}

interface Props {
  /** 0–100 health gauge value. */
  score: number;
  /** Headline text to the right of the score, e.g. "Great". */
  headline: string;
  /** Status rows rendered to the right of the gauge. */
  entries: RosterStatusEntry[];
  /** Rotating league context (e.g. per-league injury snapshot). */
  leagueContext?: string;
  className?: string;
}

const DOT_COLORS: Record<RosterStatusEntry['tone'], string> = {
  green: '#36E7A1',
  red: '#FF5757',
  amber: '#FBBF24',
  gray: '#475569',
};

export default function RosterRester({
  score,
  headline,
  entries,
  leagueContext,
  className = '',
}: Props) {
  const uid = useId().replace(/:/g, '');
  const arcId = `rester-arc-${uid}`;
  /** Stroke centered on r=36: thick cyan progress ring without filling the gauge. */
  const RING_R = 36;
  const TRACK_W = 7;
  const RING_W = 11;
  const circumference = 2 * Math.PI * RING_R;
  const stroke = (circumference * Math.max(0, Math.min(100, score))) / 100;
  const ringColor =
    score >= 80 ? '#00E5FF' : score >= 60 ? '#FBBF24' : '#FF5757';
  const ringSoft =
    score >= 80
      ? 'rgba(0,229,255,0.60)'
      : score >= 60
        ? 'rgba(251,191,36,0.60)'
        : 'rgba(255,87,87,0.60)';

  return (
    <div className={`glass-panel p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-[#00E5FF]" />
          Roster Rester
        </h3>
        <span className="text-[8px] font-mono-tactical text-slate-600 uppercase">
          Battle readiness
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <path
                id={arcId}
                d="M 12 48 Q 50 10 88 48"
                fill="none"
              />
              <radialGradient id={`rester-glass-${uid}`} cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter id={`rester-glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Faint glass disc behind everything */}
            <circle cx="50" cy="50" r="40" fill={`url(#rester-glass-${uid})`} />

            <text
              className="font-mono-tactical uppercase"
              fill="rgba(248,250,252,0.35)"
              fontSize="5.4"
              fontWeight="800"
              letterSpacing="0.16em"
            >
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                ROSTER RESTING…
              </textPath>
            </text>

            {/* Track — 3× original width for chunky HUD gauge */}
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={TRACK_W}
            />
            {/* Score ring — 3× original width with intensified neon glow */}
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke={ringColor}
              strokeWidth={RING_W}
              strokeLinecap="round"
              strokeDasharray={`${stroke} ${circumference}`}
              transform="rotate(-90 50 50)"
              filter={`url(#rester-glow-${uid})`}
              style={{
                filter: `drop-shadow(0 0 10px ${ringSoft}) drop-shadow(0 0 22px ${ringSoft}) drop-shadow(0 0 42px ${ringColor}66)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-3xl font-black font-mono-tactical leading-none"
              style={{
                color: ringColor,
                textShadow: `0 0 10px ${ringSoft}, 0 0 24px ${ringSoft}`,
              }}
            >
              {Math.round(score)}
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-[0.3em] mt-1"
              style={{
                color: ringColor,
                textShadow: `0 0 6px ${ringSoft}`,
              }}
            >
              {headline}
            </span>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5">
          {entries.map((e, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-[11px] font-mono-tactical"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: DOT_COLORS[e.tone],
                  boxShadow: `0 0 6px ${DOT_COLORS[e.tone]}`,
                }}
              />
              <span className="text-white font-bold">{e.count}</span>
              <span className="text-slate-500">{e.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {leagueContext && (
        <p className="mt-3 text-[9px] text-slate-600 font-mono-tactical uppercase tracking-wider truncate border-t border-white/[0.04] pt-2">
          {leagueContext}
        </p>
      )}
    </div>
  );
}
