'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Count-up for numeric dossier stats — runs once per resetKey change. */
export function CountUpNumber({
  value,
  resetKey,
  decimals = 0,
  duration = 620,
  prefix = '',
  suffix = '',
  className = '',
  style,
}: {
  value: number;
  resetKey: string;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    setDisplay(0);
    const start = performance.now();
    const target = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = target * eased;
      setDisplay(next);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [resetKey, value, duration]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));

  return (
    <span className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/** Card flip transition when playerId changes */
export function DossierTransition({
  playerId,
  children,
}: {
  playerId: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const [renderId, setRenderId] = useState(playerId);

  useEffect(() => {
    if (playerId === renderId) return;
    setVisible(false);
    const t = window.setTimeout(() => {
      setRenderId(playerId);
      setVisible(true);
    }, 200);
    return () => window.clearTimeout(t);
  }, [playerId, renderId]);

  return (
    <div
      key={renderId}
      className="transition-all duration-[220ms] ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
      }}
    >
      {children}
    </div>
  );
}

export function VerdictReveal({
  playerId,
  label,
  color,
  glowClass,
}: {
  playerId: string;
  label: string;
  color: string;
  glowClass: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
    const t = window.setTimeout(() => setShown(true), 320);
    return () => window.clearTimeout(t);
  }, [playerId]);

  return (
    <div
      className={`font-figtree text-3xl font-bold uppercase tracking-wide transition-all duration-300 md:text-4xl ${glowClass}`}
      style={{
        color,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(4px)',
        textShadow: shown ? `0 0 20px ${color}55` : 'none',
      }}
    >
      {label}
    </div>
  );
}

export function StaggerBullets({ playerId, items }: { playerId: string; items: string[] }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= items.length) window.clearInterval(iv);
    }, 65);
    return () => window.clearInterval(iv);
  }, [playerId, items]);

  return (
    <ul className="space-y-1.5 rounded-[10px] border border-border bg-[#0f1420] p-3">
      {items.map((b, idx) => (
        <li
          key={b}
          className="flex gap-2 font-figtree text-[12px] leading-snug text-muted transition-opacity duration-200"
          style={{ opacity: idx < visibleCount ? 1 : 0 }}
        >
          <span className="shrink-0 text-boom">✓</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export function CollapsibleDossierSection({
  title,
  defaultOpen = false,
  compact = false,
  href,
  onHeaderClick,
  children,
  footer,
}: {
  title: string;
  defaultOpen?: boolean;
  compact?: boolean;
  href?: string;
  onHeaderClick?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    if (onHeaderClick) onHeaderClick();
    setOpen((v) => !v);
  };

  const header = (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between gap-2 text-left"
    >
      <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">{title}</span>
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );

  const body = (
    <div
      className={`overflow-hidden transition-all duration-200 ${open || !compact ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
    >
      <div className={compact ? 'pt-2' : 'pt-0'}>{children}</div>
      {footer}
    </div>
  );

  const card = (
    <div className="rounded-[10px] border border-border bg-[#0f1420] p-3 transition-colors hover:border-boom/20">
      {header}
      {compact ? body : <div className="pt-2">{children}{footer}</div>}
    </div>
  );

  if (href && !open) {
    return (
      <Link href={href} className="block no-underline">
        {card}
      </Link>
    );
  }

  return card;
}

export function QuickActionBtn({
  href,
  onClick,
  children,
  accent,
  external,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  accent?: boolean;
  external?: boolean;
}) {
  const cls = `rounded-md border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors hover:border-boom/40 hover:text-boom ${
    accent
      ? 'border-boom/30 bg-boom/10 text-boom'
      : 'border-border text-muted hover:bg-white/[0.02]'
  }`;

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} no-underline`}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={`${cls} no-underline`}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function verdictGlowClass(label: string): string {
  if (label === 'STRONG BUY' || label === 'BUY') return 'dash-boom-glow';
  if (label === 'STRONG SELL') return 'dash-bust-glow';
  if (label === 'SELL') return 'opacity-95';
  return '';
}
