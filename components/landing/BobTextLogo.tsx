const BOOM = '#3ECFAD';
const PURPLE = '#8B5CF6';
const DISPLAY = { fontFamily: 'var(--font-display), "Bebas Neue", sans-serif' } as const;

function LightningBolt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 10px rgba(62,207,173,0.55))' }}
    >
      <path d="M13 1.5L3.5 15.5h6.2L7 23.5l11.5-14H12l1-8z" fill={BOOM} />
    </svg>
  );
}

/** Text-based BOB mark: green bolt + BOOM / OR / BUST in Bebas Neue. No images. */
export default function BobTextLogo({ className, size = 'default' }: { className?: string; size?: 'default' | 'compact' }) {
  const main = size === 'compact' ? 'text-[18px] sm:text-[20px]' : 'text-[22px] sm:text-[26px]';
  const orSize = size === 'compact' ? 'text-[12px] sm:text-[13px]' : 'text-[13px] sm:text-[15px]';
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LightningBolt className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className={`inline-flex items-baseline gap-0.5 whitespace-nowrap ${main}`} style={DISPLAY}>
        <span className="font-bold tracking-[0.04em]" style={{ color: BOOM }}>
          BOOM
        </span>
        <span className={`font-bold uppercase text-white ${orSize}`} style={{ ...DISPLAY, letterSpacing: '0.08em' }}>
          OR
        </span>
        <span className="font-bold tracking-[0.04em]" style={{ color: PURPLE }}>
          BUST
        </span>
      </span>
    </span>
  );
}
