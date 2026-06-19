'use client';

import { forwardRef } from 'react';

export interface LoaderLogoProps {
  /** 0–100 loading progress */
  progress: number;
  /** Strike sequence phase */
  strikePhase?: 'idle' | 'charging' | 'strike' | 'flash' | 'activated';
  /** Skip motion-heavy effects */
  reducedMotion?: boolean;
}

/** Logo fill + glow derived from loading progress. */
function deriveLogoVisuals(
  progress: number,
  strikePhase: LoaderLogoProps['strikePhase'],
  reducedMotion: boolean,
) {
  const p = Math.max(0, Math.min(100, progress));
  const activated =
    strikePhase === 'activated' || strikePhase === 'flash' || strikePhase === 'strike';

  // Readable from frame zero — never invisible
  const baseOpacity = reducedMotion
    ? 0.85
    : 0.45 + (Math.min(p, 95) / 95) * 0.35;

  // GREEN >>> ⚡ <<< PURPLE — both sides charge toward center
  const fillStart = 28;
  const fillEnd = 72;
  const fillProgress =
    p < fillStart ? 0 : p >= fillEnd ? 100 : ((p - fillStart) / (fillEnd - fillStart)) * 100;

  const boomFill = fillProgress;
  const bustFill = fillProgress;

  // Center bolt energizes last
  const boltGlow = activated
    ? 1
    : p < 70
      ? 0
      : p < 92
        ? ((p - 70) / 22) * 0.75
        : 0.75 + ((p - 92) / 8) * 0.25;

  const fullColor = p >= 88 || activated;

  const sparkLevel =
    reducedMotion ? 0 : p < 48 ? 0 : p < 58 ? 1 : p < 68 ? 2 : 3;

  const showArcs = !reducedMotion && strikePhase === 'idle' && sparkLevel >= 1 && p < 98;

  const glowIntensity =
    activated ? 1 : p < 12 ? 0.08 : 0.08 + (Math.min(p, 88) / 88) * 0.55;

  return {
    baseOpacity,
    boomFill,
    boltGlow,
    bustFill,
    fullColor,
    showArcs,
    activated,
    sparkLevel,
    glowIntensity,
  };
}

const INTERNAL_ARCS = [
  { rot: '-42deg', len: 10, delay: '0s' },
  { rot: '38deg', len: 9, delay: '0.14s' },
  { rot: '92deg', len: 8, delay: '0.28s' },
];

const LoaderLogo = forwardRef<HTMLDivElement, LoaderLogoProps>(function LoaderLogo(
  { progress, strikePhase = 'idle', reducedMotion = false },
  ref,
) {
  const {
    baseOpacity,
    boomFill,
    boltGlow,
    bustFill,
    fullColor,
    showArcs,
    activated,
    sparkLevel,
    glowIntensity,
  } = deriveLogoVisuals(progress, strikePhase, reducedMotion);

  const pulse = strikePhase === 'charging' || (sparkLevel >= 3 && strikePhase === 'idle');

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes wr-arc-charge {
  0% { transform: rotate(var(--rot)) scaleX(0.1); opacity: 0; }
  30% { opacity: 0.7; }
  100% { transform: rotate(var(--rot)) scaleX(1); opacity: 0; }
}
@keyframes wr-bolt-pulse {
  0%, 100% { opacity: var(--bolt-base); transform: translate(-50%, -50%) scale(1); }
  50% { opacity: calc(var(--bolt-base) + 0.4); transform: translate(-50%, -50%) scale(1.12); }
}
@keyframes wr-logo-activate {
  0% { transform: scale(1); filter: brightness(1.4) saturate(1.5); }
  40% { transform: scale(1.05); filter: brightness(1.85) saturate(1.75); }
  100% { transform: scale(1); filter: brightness(1.45) saturate(1.55); }
}
@keyframes wr-spark-tiny {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  35% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
}
@keyframes wr-spark-medium {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  30% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
}
.wr-arc-charge {
  animation: wr-arc-charge 0.75s ease-out infinite;
  animation-delay: var(--delay);
}
.wr-bolt-pulse {
  animation: wr-bolt-pulse 0.85s ease-in-out infinite;
}
.wr-logo-activate {
  animation: wr-logo-activate 480ms ease-out forwards;
}
.wr-spark-tiny {
  animation: wr-spark-tiny 0.55s ease-out infinite;
}
.wr-spark-medium {
  animation: wr-spark-medium 0.7s ease-out infinite;
  animation-delay: 0.18s;
}
`,
        }}
      />

      <div
        ref={ref}
        className={`relative mx-auto w-[min(220px,70vw)] max-w-[340px] bg-transparent sm:w-[min(320px,82vw)] ${pulse ? 'wr-logo-activate' : ''} ${activated ? 'wr-logo-activate' : ''}`}
        style={{
          mixBlendMode: 'screen',
        }}
      >
        {/* Ambient glow behind logo */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full"
          style={{
            width: '140%',
            height: '140%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(54,231,161,${0.06 + glowIntensity * 0.14}) 0%, rgba(124,58,237,${0.04 + glowIntensity * 0.1}) 38%, transparent 68%)`,
            opacity: glowIntensity,
            transition: 'opacity 400ms ease-out',
          }}
          aria-hidden
        />

        {/* Desaturated base — always readable */}
        <div
          className="absolute inset-0"
          style={{ opacity: fullColor ? Math.min(baseOpacity, 0.35) : baseOpacity, pointerEvents: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={320}
            height={320}
            className="block h-auto w-full bg-transparent sm:max-w-[320px]"
            style={{
              mixBlendMode: 'screen',
              filter: 'brightness(0.55) saturate(0.25) contrast(1.1)',
            }}
            draggable={false}
            aria-hidden
          />
        </div>

        {/* BOOM — green fill left → center */}
        <div className="absolute inset-y-0 left-0 w-[50%] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 ${100 - boomFill}% 0 0)`,
              transition: reducedMotion ? 'none' : 'clip-path 400ms ease-out',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={320}
              height={320}
              className="block h-auto w-[200%] max-w-none bg-transparent"
              style={{
                mixBlendMode: 'screen',
                filter: 'brightness(1.4) saturate(1.65) hue-rotate(-8deg)',
              }}
              draggable={false}
              aria-hidden
            />
          </div>
        </div>

        {/* BUST — purple fill right → center */}
        <div className="absolute inset-y-0 right-0 w-[50%] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 0 0 ${100 - bustFill}%)`,
              transition: reducedMotion ? 'none' : 'clip-path 400ms ease-out',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={320}
              height={320}
              className="absolute right-0 block h-auto w-[200%] max-w-none bg-transparent"
              style={{
                mixBlendMode: 'screen',
                filter: 'brightness(1.3) saturate(1.55) hue-rotate(38deg)',
              }}
              draggable={false}
              aria-hidden
            />
          </div>
        </div>

        {/* Full-color structure layer */}
        <div className="relative" style={{ opacity: fullColor ? 1 : baseOpacity * 0.65 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Boom or Bust"
            width={320}
            height={320}
            className="block h-auto w-full bg-transparent sm:max-w-[320px]"
            style={{
              mixBlendMode: 'screen',
              filter: fullColor
                ? 'brightness(1.4) saturate(1.5) contrast(1.08) drop-shadow(0 0 32px rgba(54,231,161,0.55)) drop-shadow(0 0 40px rgba(167,139,250,0.45))'
                : 'brightness(0.5) saturate(0.4) contrast(1.08)',
              transition: 'filter 500ms ease-out',
            }}
            draggable={false}
          />
        </div>

        {/* Staged internal sparks */}
        {sparkLevel >= 1 && !activated && (
          <div
            className="pointer-events-none absolute wr-spark-tiny"
            style={{
              top: '40.5%',
              left: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(54,231,161,0.95)',
              boxShadow: '0 0 10px rgba(54,231,161,0.9)',
            }}
            aria-hidden
          />
        )}
        {sparkLevel >= 2 && !activated && (
          <div
            className="pointer-events-none absolute wr-spark-medium"
            style={{
              top: '40.5%',
              left: '50%',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #fff 0%, rgba(54,231,161,0.9) 55%, transparent 100%)',
              boxShadow: '0 0 16px rgba(54,231,161,0.85), 0 0 8px rgba(167,139,250,0.5)',
            }}
            aria-hidden
          />
        )}

        {/* Center bolt glow — brightens last */}
        {boltGlow > 0.04 && (
          <div
            className={`pointer-events-none absolute ${boltGlow >= 0.5 && !activated ? 'wr-bolt-pulse' : ''}`}
            style={{
              top: '40.5%',
              left: '50%',
              width: 32,
              height: 52,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(ellipse at center, rgba(255,255,255,${0.15 + boltGlow * 0.35}) 0%, rgba(54,231,161,${0.2 + boltGlow * 0.5}) 30%, rgba(167,139,250,${boltGlow * 0.3}) 55%, transparent 75%)`,
              '--bolt-base': boltGlow,
              boxShadow: `0 0 ${16 + boltGlow * 28}px rgba(54,231,161,${0.4 + boltGlow * 0.45}), 0 0 ${10 + boltGlow * 20}px rgba(167,139,250,${boltGlow * 0.4})`,
              opacity: boltGlow,
              borderRadius: '50%',
            } as React.CSSProperties}
            aria-hidden
          />
        )}

        {/* Tiny arcs radiating from bolt */}
        {showArcs && (
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{ inset: '30% 40% 34% 40%' }}
            aria-hidden
          >
            <div className="absolute left-1/2 top-1/2 h-0 w-0">
              {INTERNAL_ARCS.map((arc, i) => (
                <span
                  key={i}
                  className="wr-arc-charge absolute left-0 top-0 h-[1.5px] origin-left rounded-full"
                  style={{
                    width: arc.len,
                    background: 'linear-gradient(90deg, rgba(54,231,161,0.9), rgba(167,139,250,0.35))',
                    boxShadow: '0 0 6px rgba(54,231,161,0.6)',
                    '--rot': arc.rot,
                    '--delay': arc.delay,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export default LoaderLogo;
