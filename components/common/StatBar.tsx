'use client';

import Image from 'next/image';
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';

// ─── Tones ────────────────────────────────────────────────────────────────────

export type StatTone = 'boom' | 'bust' | 'hold' | 'text' | 'muted';

const TONE_HEX: Record<StatTone, string> = {
  boom: '#36E7A1',
  bust: '#A78BFA',
  hold: '#FBBF24',
  text: '#E8ECF4',
  muted: '#6B7A99',
};

const GLOW_SHADOW = '0 0 9px rgba(54,231,161,0.45)';

// ─── Cell model ───────────────────────────────────────────────────────────────

export interface StatBarItem {
  label: string;
  /**
   * Display value. Pure numbers and numeric strings ("92%", "+4.2", "1,204")
   * count up from zero on mount. Non-numeric strings ("GOOD", "11-3") render static.
   */
  value: string | number;
  /** Small caption line under the value. */
  sub?: ReactNode;
  /** Value color. Defaults to `text`. */
  tone?: StatTone;
  /** Neon glow on the value — used for hero / accent cells. */
  glow?: boolean;
  /** Smaller value text (timestamps, short labels). */
  small?: boolean;
  /** Skip the count-up animation for this cell. */
  animate?: boolean;
}

/** Escape hatch — render a fully custom cell (e.g. an interactive tooltip cell). */
export interface StatBarRawCell {
  raw: ReactNode;
}

export type StatBarCell = StatBarItem | StatBarRawCell;

function isRaw(cell: StatBarCell): cell is StatBarRawCell {
  return 'raw' in cell;
}

// ─── Count-up ─────────────────────────────────────────────────────────────────

interface Animatable {
  leading: string;
  forceSign: '' | '+';
  target: number;
  decimals: number;
  thousands: boolean;
  suffix: string;
}

const NUMERIC_RE = /^([^\d+-]*)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/;

function parseAnimatable(value: string | number): Animatable | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return {
      leading: '',
      forceSign: '',
      target: value,
      decimals: Number.isInteger(value) ? 0 : 1,
      thousands: Math.abs(value) >= 1000,
      suffix: '',
    };
  }

  const match = NUMERIC_RE.exec(value.trim());
  if (!match) return null;
  const [, leading, sign, numRaw, suffix] = match;
  const cleaned = numRaw.replace(/,/g, '');
  const target = Number(`${sign}${cleaned}`);
  if (!Number.isFinite(target)) return null;
  const dot = cleaned.indexOf('.');
  return {
    leading,
    forceSign: sign === '+' ? '+' : '',
    target,
    decimals: dot === -1 ? 0 : cleaned.length - dot - 1,
    thousands: numRaw.includes(','),
    suffix,
  };
}

function formatNumber(n: number, decimals: number, thousands: boolean): string {
  const fixed = Math.abs(n).toFixed(decimals);
  if (!thousands) return fixed;
  const [intPart, fracPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fracPart != null ? `${grouped}.${fracPart}` : grouped;
}

const DURATION_MS = 750;

/** Animates 0 → target once on mount. Server + first client render show 0 (matched). */
function useCountUp(spec: Animatable | null): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!spec) return undefined;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCurrent(spec.target);
      return undefined;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setCurrent(spec.target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(spec.target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spec]);

  return current;
}

function AnimatedValue({ item }: { item: StatBarItem }) {
  const spec = item.animate === false ? null : parseAnimatable(item.value);
  const current = useCountUp(spec);

  if (!spec) return <>{item.value}</>;

  const sign = current < 0 ? '-' : spec.forceSign;
  return (
    <>
      {spec.leading}
      {sign}
      {formatNumber(current, spec.decimals, spec.thousands)}
      {spec.suffix}
    </>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell({ item }: { item: StatBarItem }) {
  const color = TONE_HEX[item.tone ?? 'text'];
  return (
    <div className="flex min-w-[110px] shrink-0 flex-col justify-center border-r border-border px-3 py-1.5 last:border-r-0 md:min-w-0 md:px-[18px]">
      <div className="mb-[3px] font-mono text-[8.5px] uppercase tracking-[1.5px] text-muted">
        {item.label}
      </div>
      <div
        className={`font-mono ${item.small ? 'text-[16px]' : 'text-[22px]'} font-semibold leading-none tracking-[-0.5px] tabular-nums`}
        style={{ color, textShadow: item.glow ? GLOW_SHADOW : undefined }}
      >
        <AnimatedValue item={item} />
      </div>
      {item.sub != null ? (
        <div className="mt-0.5 font-mono text-[9px] text-muted">{item.sub}</div>
      ) : null}
    </div>
  );
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

export interface StatBarProps {
  cells: StatBarCell[];
  /** Tailwind md grid columns for the cell row. Defaults to `md:grid-cols-5`. */
  columnsClassName?: string;
}

/**
 * Shared terminal-style top stat bar: logo box + a scrollable row of stat cells.
 * Numeric cells count up from zero on mount. Used across dashboard pages.
 */
export default function StatBar({ cells, columnsClassName = 'md:grid-cols-5' }: StatBarProps) {
  return (
    <header className="col-span-1 row-start-1 grid h-[66px] border-b border-border bg-bg grid-cols-1 md:col-span-2 md:grid-cols-[215px_1fr]">
      <div className="hidden items-center justify-center overflow-hidden border-r border-border bg-bg px-1.5 py-1 md:flex">
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={203}
          height={58}
          unoptimized
          className="h-full w-full object-contain"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.2) saturate(1.3) contrast(1.1)',
            transform: 'scale(1.08)',
            transformOrigin: 'center',
          }}
        />
      </div>

      <div className={`flex overflow-x-auto scrollbar-hide md:grid ${columnsClassName}`}>
        {cells.map((cell, i) =>
          isRaw(cell) ? (
            <Fragment key={i}>{cell.raw}</Fragment>
          ) : (
            <Cell key={cell.label} item={cell} />
          ),
        )}
      </div>
    </header>
  );
}
