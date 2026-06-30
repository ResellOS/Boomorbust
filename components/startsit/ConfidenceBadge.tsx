'use client';

import {
  formatStartSitConfidence,
  startSitConfidenceStyle,
} from '@/lib/ui/labels';

interface ConfidenceBadgeProps {
  pct: number;
  obviousCall?: boolean;
  className?: string;
}

/** Tier label badge — Lean / Strong / Smash, never raw %. */
export default function ConfidenceBadge({
  pct,
  obviousCall = false,
  className = '',
}: ConfidenceBadgeProps) {
  const tier = formatStartSitConfidence(pct, { obviousCall });
  const style = startSitConfidenceStyle(tier);

  return (
    <span
      className={`font-mono text-[12px] font-semibold uppercase tracking-wide ${className}`}
      style={{ color: style.color, opacity: style.opacity }}
    >
      {tier}
    </span>
  );
}
