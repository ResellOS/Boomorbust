'use client';

import { useEffect, useMemo, useState } from 'react';

const CHROME = '#1a1d2a';
const BOOM = '#3ECFAD';
const CYAN = '#22D3EE';
const PURPLE = '#8B5CF6';

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function useCountUp(target: number, durationMs: number, decimals: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t >= 1 ? 1 : easeOutCubic(t);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  const formatted = useMemo(() => {
    if (decimals <= 0) return String(Math.round(v));
    return v.toFixed(decimals);
  }, [v, decimals]);
  return formatted;
}

function pentagonPoints(cx: number, cy: number, r: number, vals: number[]): string {
  const n = 5;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = r * vals[i];
    pts.push(`${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function MiniPentagon({
  vals,
  stroke,
  visible,
}: {
  vals: number[];
  stroke: string;
  visible: boolean;
}) {
  const cx = 50;
  const cy = 52;
  const r = 36;
  const outer = pentagonPoints(cx, cy, r, [1, 1, 1, 1, 1]);
  const inner = pentagonPoints(cx, cy, r, vals);
  return (
    <svg viewBox="0 0 100 104" className="mx-auto h-16 w-full max-w-[88px]" aria-hidden>
      <polygon points={outer} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <polygon
        points={inner}
        fill={`${stroke}18`}
        stroke={stroke}
        strokeWidth={1.25}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.8)',
          transformOrigin: '50px 52px',
          transition: 'opacity 0.45s ease-out, transform 0.45s ease-out',
          filter: visible ? `drop-shadow(0 0 6px ${stroke}55)` : 'none',
        }}
      />
    </svg>
  );
}

const PLAYERS = [
  { name: "Ja'Marr Chase", line: 'WR · CIN', posColor: CYAN, vals: [0.92, 0.88, 0.9, 0.94, 0.86], score: 92 },
  { name: 'Bijan Robinson', line: 'RB · ATL', posColor: BOOM, vals: [0.9, 0.92, 0.85, 0.88, 0.9], score: 88 },
  { name: 'CeeDee Lamb', line: 'WR · DAL', posColor: CYAN, vals: [0.9, 0.87, 0.88, 0.91, 0.85], score: 90 },
  { name: 'Sam LaPorta', line: 'TE · DET', posColor: PURPLE, vals: [0.72, 0.68, 0.7, 0.74, 0.66], score: 82 },
] as const;

const TITLE = 'Good Morning, Champ! 🏆';

export default function HeroMockup() {
  const empire = useCountUp(52.4, 1500, 1);
  const trade = useCountUp(18.4, 1800, 1);
  const winPct = useCountUp(78, 1600, 0);

  const [chartOn, setChartOn] = useState<boolean[]>(() => PLAYERS.map(() => false));
  useEffect(() => {
    const timers = PLAYERS.map((_, i) =>
      window.setTimeout(() => {
        setChartOn((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 200 * i),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setCursorOn(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-[#0a0d14]">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 sm:px-4" style={{ background: CHROME }}>
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/30 px-3 py-1.5 text-center">
          <span className="truncate font-mono text-[12px] text-white/50 sm:text-[13px]">boomorbust.app/dashboard</span>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
        <div className="text-center">
          <h2 className="inline-flex items-center justify-center gap-0.5 text-[13px] font-semibold text-white sm:text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
            <span>{TITLE}</span>
            {cursorOn ? (
              <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#3ECFAD]" aria-hidden />
            ) : null}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-white/40 sm:text-[12px]">
            <span className="tabular-nums">Week 8</span>
            <span> · </span>
            <span className="tabular-nums">6</span> of <span className="tabular-nums">9</span> matchups
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 backdrop-blur-[24px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
              Empire Score
            </div>
            <div
              className="hero-metric-pulse mt-1 font-mono text-[clamp(1.25rem,4vw,1.75rem)] font-bold tabular-nums text-[#3ECFAD]"
              style={{ textShadow: '0 0 20px rgba(62,207,173,0.35)' }}
            >
              {empire}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 backdrop-blur-[24px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
              Trade Edge
            </div>
            <div
              className="hero-metric-pulse mt-1 font-mono text-[clamp(1.25rem,4vw,1.75rem)] font-bold tabular-nums text-[#3ECFAD]"
              style={{ textShadow: '0 0 20px rgba(62,207,173,0.35)' }}
            >
              +{trade}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 backdrop-blur-[24px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
              Win Probability
            </div>
            <div
              className="hero-metric-pulse mt-1 font-mono text-[clamp(1.25rem,4vw,1.75rem)] font-bold tabular-nums text-[#3ECFAD]"
              style={{ textShadow: '0 0 20px rgba(62,207,173,0.35)' }}
            >
              {winPct}%
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
            Your top players
          </span>
          <span className="text-[11px] font-semibold text-[#22D3EE]" style={{ fontFamily: 'var(--font-body)' }}>
            View roster →
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {PLAYERS.map((p, i) => (
            <div
              key={p.name}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 pb-3 pt-2 backdrop-blur-[24px]"
              style={{ boxShadow: '0 0 18px rgba(62,207,173,0.06)' }}
            >
              <div className="mb-2 flex items-start gap-1.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 font-mono text-[10px] font-bold text-white/85"
                  style={{ background: `${p.posColor}22` }}
                >
                  {p.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[11px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                    {p.name}
                  </div>
                  <div className="truncate font-mono text-[10px] text-white/45">{p.line}</div>
                </div>
              </div>
              <MiniPentagon vals={[...p.vals]} stroke={p.posColor} visible={chartOn[i] ?? false} />
              <div className="mt-1 text-center font-mono text-[16px] font-semibold tabular-nums text-white">{p.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
