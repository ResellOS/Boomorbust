'use client';

import { clsx } from 'clsx';

export default function WeeklyDynastyReport({
  bullets,
  className = '',
}: {
  bullets: string[];
  className?: string;
}) {
  const lines = bullets.filter(Boolean).slice(0, 3);

  return (
    <div
      className={clsx(
        'glass-panel rounded-lg border border-[#FBBF24]/25 bg-[#FBBF24]/[0.06] p-2 flex flex-col gap-2',
        className,
      )}
    >
      <h4
        className="font-bold uppercase tracking-[0.06em] text-white leading-tight px-0.5"
        style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}
      >
        Weekly Dynasty Report
      </h4>
      <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#64748B] px-0.5">
        Pre-generated summary · roster pulse (max 3)
      </p>
      {lines.length === 0 ? (
        <p className="text-[10px] text-[#475569] font-mono px-0.5 py-2">Sync completes to generate bullets.</p>
      ) : (
        <ul className="list-disc pl-4 space-y-1.5 pr-1">
          {lines.map((b, i) => (
            <li key={i} className="text-[10px] text-[#E2E8F0] leading-snug font-mono marker:text-[#FBBF24]">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
