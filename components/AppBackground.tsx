import { clsx } from 'clsx';

interface Props {
  intensity?: 'full' | 'subtle' | 'minimal';
  children?: React.ReactNode;
}

function HelmetSilhouette({ side, opacity }: { side: 'left' | 'right'; opacity: number }) {
  return (
    <svg
      aria-hidden
      className={clsx(
        'absolute pointer-events-none text-white',
        side === 'left' ? 'left-0 top-[14%] w-[min(280px,42vw)] h-[400px]' : 'right-0 top-[18%] w-[min(260px,38vw)] h-[380px]'
      )}
      viewBox="0 0 200 260"
      fill="none"
      style={{ opacity }}
    >
      <ellipse cx="100" cy="120" rx="85" ry="110" fill="currentColor" />
      <ellipse cx="100" cy="130" rx="65" ry="85" stroke="rgba(148,163,184,0.35)" strokeWidth="5" />
      <path d="M 40 165 Q 100 148 160 165" stroke="rgba(148,163,184,0.25)" strokeWidth="3" />
    </svg>
  );
}

function PlayDiagramSvg({ opacity }: { opacity: number }) {
  return (
    <svg
      aria-hidden
      className="absolute bottom-4 right-4 w-[min(200px,40vw)] h-[140px] pointer-events-none"
      style={{ opacity }}
      viewBox="0 0 200 140"
      fill="none"
    >
      <circle cx="40" cy="40" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <circle cx="90" cy="65" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <circle cx="140" cy="45" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <text x="28" y="98" fill="rgba(255,255,255,0.35)" fontSize="14" fontWeight="700">
        X
      </text>
      <text x="72" y="118" fill="rgba(255,255,255,0.35)" fontSize="14" fontWeight="700">
        X
      </text>
      <text x="116" y="102" fill="rgba(255,255,255,0.35)" fontSize="14" fontWeight="700">
        O
      </text>
      <path d="M 30 122 L 170 122" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 5" />
    </svg>
  );
}

export default function AppBackground({ intensity = 'minimal', children }: Props) {
  const full = intensity === 'full';
  const subtle = intensity === 'subtle';
  const helOpacity = full ? 0.04 : subtle ? 0.02 : 0;
  const meshOp = full ? 0.08 : subtle ? 0.04 : 0;

  return (
    <>
      <div aria-hidden className="fixed inset-0 -z-[1] overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 85% 65% at 50% 38%, var(--bg-secondary) 0%, var(--bg-primary) 75%)',
          }}
        />

        <div
          className="absolute left-[-12%] top-[8%] w-[min(520px,55vw)] h-[55vh] rounded-full blur-[80px]"
          style={{
            background: 'radial-gradient(circle, rgba(var(--team-primary-rgb), 0.15) 0%, transparent 68%)',
          }}
        />
        <div className="absolute right-[-10%] top-[22%] w-[min(480px,50vw)] h-[48vh] rounded-full blur-[80px] bg-cyan-400/[0.1]" />

        {(full || subtle) && (
          <>
            <div
              className="mesh-blob-1 absolute rounded-full blur-[100px]"
              style={{
                width: 'min(520px, 55vw)',
                height: 'min(520px, 55vh)',
                top: '6%',
                left: '16%',
                background: `rgba(99,102,241,${meshOp})`,
              }}
            />
            <div
              className="mesh-blob-2 absolute rounded-full blur-[90px]"
              style={{
                width: 'min(480px, 50vw)',
                height: 'min(480px, 50vh)',
                bottom: '10%',
                right: '12%',
                background: `rgba(34,211,238,${meshOp * 0.85})`,
              }}
            />
          </>
        )}

        {helOpacity > 0 && (
          <>
            <HelmetSilhouette side="left" opacity={helOpacity} />
            <HelmetSilhouette side="right" opacity={helOpacity * 0.85} />
          </>
        )}

        {full && (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(105deg, transparent, transparent 46px, rgba(255,255,255,0.015) 46px, rgba(255,255,255,0.015) 47px)',
              }}
            />
            <PlayDiagramSvg opacity={0.05} />
          </>
        )}
      </div>
      {children}
    </>
  );
}
