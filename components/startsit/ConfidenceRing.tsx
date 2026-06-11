'use client';

interface ConfidenceRingProps {
  pct: number;
  size?: number;
}

export default function ConfidenceRing({ pct, size = 80 }: ConfidenceRingProps) {
  const r = 32;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div className="relative mx-auto my-2" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden>
        <circle cx={40} cy={40} r={r} fill="none" stroke="#1e2640" strokeWidth={8} />
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke="#36E7A1"
          strokeWidth={8}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl text-boom">{pct}%</span>
        <span className="text-[8px] text-muted">Model</span>
        <span className="text-[8px] text-muted">Confidence</span>
      </div>
    </div>
  );
}
