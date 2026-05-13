'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useInViewOnce } from '@/hooks/useInViewOnce';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const MUTED = '#64748B';

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function SleeperWordmark() {
  return (
    <div className="flex items-center justify-center gap-2 text-white">
      <svg width={24} height={24} viewBox="0 0 32 32" fill="none" aria-hidden className="h-6 w-6 shrink-0 sm:h-7 sm:w-7">
        <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12.5" cy="15" r="1.8" fill="currentColor" />
        <circle cx="19.5" cy="15" r="1.8" fill="currentColor" />
        <path d="M13 19c1 1.2 2.2 1.8 3.5 1.8S19 20.2 20 19" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
        <path d="M16 4v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx="16" cy="3" r="1.2" fill="currentColor" />
      </svg>
      <span
        className="text-[18px] font-semibold lowercase tracking-tight text-white sm:text-[22px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        sleeper
      </span>
    </div>
  );
}

type ParsedStat =
  | { kind: 'percent'; max: number }
  | { kind: 'record'; a: number; b: number; c: number }
  | { kind: 'decimal'; max: number };

function parseStatValue(raw: string): ParsedStat | null {
  if (raw.endsWith('%')) {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return { kind: 'percent', max: n };
    return null;
  }
  if (/^\d+-\d+-\d+$/.test(raw)) {
    const parts = raw.split('-').map(Number);
    return { kind: 'record', a: parts[0], b: parts[1], c: parts[2] };
  }
  const m = raw.match(/^(\d+\.?\d*)\s*Weeks?$/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n)) return { kind: 'decimal', max: n };
  }
  return null;
}

function formatFromParsed(p: ParsedStat, t: number): string {
  const e = easeOutCubic(t);
  if (p.kind === 'percent') {
    return `${Math.round(p.max * e)}%`;
  }
  if (p.kind === 'record') {
    return `${Math.round(p.a * e)}-${Math.round(p.b * e)}-${Math.round(p.c * e)}`;
  }
  return `${(p.max * e).toFixed(1)} Weeks`;
}

function valueStyle(color: 'green' | 'white'): CSSProperties {
  if (color === 'green') {
    return {
      color: BOOM,
      textShadow: '0 0 28px rgba(54, 231, 161, 0.35), 0 0 48px rgba(54, 231, 161, 0.12)',
    };
  }
  return { color: '#f8fafc' };
}

function CountUpStat({
  target,
  valueColor,
  active,
  skipAnimation,
}: {
  target: string;
  valueColor: 'green' | 'white';
  active: boolean;
  skipAnimation: boolean;
}) {
  const parsed = useMemo(() => parseStatValue(target), [target]);
  const [display, setDisplay] = useState(() =>
    skipAnimation || !parsed ? target : formatFromParsed(parsed, 0)
  );

  useEffect(() => {
    if (!parsed) {
      setDisplay(target);
      return;
    }
    if (skipAnimation) {
      setDisplay(target);
      return;
    }
    if (!active) {
      setDisplay(formatFromParsed(parsed, 0));
      return;
    }

    const duration = 1100;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(formatFromParsed(parsed, t));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, parsed, skipAnimation, target]);

  return (
    <div
      className="text-[clamp(1.35rem,6vw,2.35rem)] font-bold leading-none tracking-tight font-mono sm:text-[clamp(1.75rem,3.5vw,2.35rem)]"
      style={valueStyle(valueColor)}
    >
      {display}
    </div>
  );
}

type StatCol =
  | {
      kind: 'stat';
      value: string;
      valueColor: 'green' | 'white';
      label: string;
      sub: string;
    }
  | { kind: 'sleeper' };

const COLUMNS: StatCol[] = [
  {
    kind: 'stat',
    value: '84%',
    valueColor: 'green',
    label: 'DMS Accuracy',
    sub: 'Highest in the industry',
  },
  {
    kind: 'stat',
    value: '80%',
    valueColor: 'green',
    label: 'Breakout Detection Rate',
    sub: '5+ weeks early',
  },
  {
    kind: 'stat',
    value: '42-18-2',
    valueColor: 'white',
    label: 'Verified Record',
    sub: 'Last 62 weeks',
  },
  {
    kind: 'stat',
    value: '5.3 Weeks',
    valueColor: 'green',
    label: 'Average Market Lead Time',
    sub: 'Beat the market',
  },
  { kind: 'sleeper' },
];

export default function LandingStatsBar() {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const reducedMotion = usePrefersReducedMotion();
  const active = inView || reducedMotion;

  return (
    <section
      ref={ref}
      className={`landing-reveal-up border-y border-white/[0.06] py-8 sm:py-10 ${inView || reducedMotion ? 'landing-reveal-up--in' : ''}`}
      style={{ background: BG }}
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 border border-white/[0.06] lg:grid-cols-5">
          {COLUMNS.map((col, i) => {
            const key = col.kind === 'stat' ? col.label : 'sleeper';
            const isOddCol = i % 2 === 0;
            const isBottomRowMobile = i >= 4;
            const borderMobileR = isOddCol ? 'border-r border-white/[0.06]' : '';
            const borderMobileB = !isBottomRowMobile ? 'border-b border-white/[0.06] lg:border-b-0' : '';
            const borderLg = i < COLUMNS.length - 1 ? 'lg:border-r lg:border-white/[0.06]' : '';

            return (
              <div
                key={key}
                className={`flex flex-col items-center justify-center px-2 py-6 text-center sm:px-4 sm:py-8 ${borderMobileR} ${borderMobileB} ${borderLg}`}
              >
                {col.kind === 'stat' ? (
                  <>
                    <CountUpStat
                      target={col.value}
                      valueColor={col.valueColor}
                      active={active}
                      skipAnimation={reducedMotion}
                    />
                    <div
                      className="mt-2 max-w-[min(100%,260px)] text-[12px] font-medium leading-snug text-white sm:mt-3 sm:text-[14px]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {col.label}
                    </div>
                    <div
                      className="mt-1 max-w-[min(100%,280px)] text-[11px] leading-snug sm:mt-1.5 sm:text-[12px]"
                      style={{ fontFamily: 'var(--font-body)', color: MUTED }}
                    >
                      {col.sub}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 sm:gap-3">
                    <p
                      className="text-[11px] font-medium leading-none sm:text-[12px]"
                      style={{ fontFamily: 'var(--font-body)', color: MUTED }}
                    >
                      Built for
                    </p>
                    <SleeperWordmark />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
