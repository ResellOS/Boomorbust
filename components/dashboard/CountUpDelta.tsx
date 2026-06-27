'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface CountUpDeltaProps {
  value: number;
  className?: string;
  style?: CSSProperties;
}

/** Animates rank delta once on mount — premium terminal count-up. */
export default function CountUpDelta({ value, className, style }: CountUpDeltaProps) {
  const [display, setDisplay] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (value === 0) {
      setDisplay(0);
      return;
    }

    const start = performance.now();
    const duration = 620;
    const sign = Math.sign(value);
    const target = Math.abs(value);
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased) * sign);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted = display > 0 ? `+${display}` : `${display}`;
  return (
    <span className={className} style={style}>
      {formatted}
    </span>
  );
}
