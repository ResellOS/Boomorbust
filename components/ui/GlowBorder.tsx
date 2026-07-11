import type { ReactNode } from 'react';

export type GlowTone = 'boom' | 'bust' | 'hold' | 'cyan';

/** RGB triplets for the locked design-system accent colors. */
const TONE_RGB: Record<GlowTone, string> = {
  boom: '54,231,161', // #36E7A1
  bust: '167,139,250', // #A78BFA
  hold: '251,191,36', // #FBBF24
  cyan: '34,211,238', // #22D3EE
};

export interface GlowBorderProps {
  tone?: GlowTone;
  className?: string;
  children: ReactNode;
  /** Outer glow strength, 0–1 (default 0.45). */
  intensity?: number;
  /** Tailwind rounding class (default `rounded-xl`). */
  rounded?: string;
}

/**
 * Neon glow border wrapper — border + outer/inner glow in a design-system tone.
 * No black drop shadows; neon glow only, per the locked design system.
 */
export default function GlowBorder({
  tone = 'boom',
  className = '',
  children,
  intensity = 0.45,
  rounded = 'rounded-xl',
}: GlowBorderProps) {
  const rgb = TONE_RGB[tone];
  return (
    <div
      className={`${rounded} ${className}`}
      style={{
        border: `1px solid rgba(${rgb},0.5)`,
        boxShadow: `0 0 12px rgba(${rgb},${intensity}), inset 0 0 8px rgba(${rgb},${intensity * 0.22})`,
      }}
    >
      {children}
    </div>
  );
}
