'use client';

import { formatStartSitConfidence, startSitConfidenceStyle } from '@/lib/ui/labels';

interface ConfidenceRingProps {
  pct: number;
  /** When true, may exceed 85% cap (injured-out obvious calls). */
  obviousCall?: boolean;
  /** Offseason — show Preseason instead of tier. */
  isOffseason?: boolean;
}

/** Start/Sit confidence — tier label only, no raw percentages. */
export default function ConfidenceRing({
  pct,
  obviousCall = false,
  isOffseason = false,
}: ConfidenceRingProps) {
  if (isOffseason) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div className="font-figtree text-[22px] font-bold leading-none tracking-wide text-hold">
          Preseason
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
          Limited Season Data
        </div>
      </div>
    );
  }

  const tier = formatStartSitConfidence(pct, { obviousCall });
  const style = startSitConfidenceStyle(tier);

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div
        className="font-figtree text-[22px] font-bold leading-none tracking-wide"
        style={{ color: style.color, opacity: style.opacity }}
      >
        {tier}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        Lineup Confidence
      </div>
    </div>
  );
}
