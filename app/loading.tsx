export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#0a0d14' }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg width={48} height={54} viewBox="0 0 36 40" aria-hidden className="animate-pulse">
          <polygon
            points="18,2 33,11 33,29 18,38 3,29 3,11"
            fill="rgba(255,255,255,0.02)"
            stroke="#22D3EE"
            strokeWidth={1.25}
            strokeLinejoin="round"
          />
          <path
            fill="#36E7A1"
            d="M19.5 9.5L14 20h4.2l-2.1 10.5L24 17.2h-3.8l2.3-7.7z"
            style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.75))' }}
          />
        </svg>
        <p
          className="text-[11px] uppercase tracking-[0.18em] text-[#36E7A1]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}
