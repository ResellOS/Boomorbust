export interface PulsingDotProps {
  /** Dot color (any CSS color). Defaults to the live-red #EF4444. */
  color?: string;
  /** Diameter in px (default 8). */
  size?: number;
  className?: string;
}

/**
 * A small pulsing status dot — solid core with an animated ping halo + neon glow.
 * Green for BOOM/live-good states, red (#EF4444) for BUST/alerts.
 */
export default function PulsingDot({ color = '#EF4444', size = 8, className = '' }: PulsingDotProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  );
}
