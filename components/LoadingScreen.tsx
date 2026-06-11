'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const MIN_DISPLAY_MS = 800;
const FADE_MS = 300;

const LOADER_CSS = `
@keyframes bob-bolt-out {
  0% { transform: scale(0.2); opacity: 0; }
  15% { opacity: 1; }
  55% { opacity: 0.9; }
  100% { transform: scale(1.25); opacity: 0; }
}
@keyframes bob-bar-fill {
  0% { width: 0%; }
  60% { width: 72%; }
  100% { width: 100%; }
}
@keyframes bob-logo-pulse {
  0%, 100% {
    filter: drop-shadow(0 0 24px rgba(54,231,161,0.55)) drop-shadow(0 0 48px rgba(167,139,250,0.35));
  }
  50% {
    filter: drop-shadow(0 0 36px rgba(54,231,161,0.8)) drop-shadow(0 0 70px rgba(167,139,250,0.55));
  }
}
.bob-load-logo { animation: bob-logo-pulse 1.4s ease-in-out infinite; }
.bob-load-bar { animation: bob-bar-fill 1.1s ease-out infinite; }
.bob-bolt-ray { transform-origin: 110px 110px; animation: bob-bolt-out 1.2s ease-out infinite; }
`;

const RAYS = [
  { rotate: 0, color: '#36E7A1', delay: 0 },
  { rotate: 45, color: '#A78BFA', delay: 0.15 },
  { rotate: 90, color: '#36E7A1', delay: 0.3 },
  { rotate: 135, color: '#A78BFA', delay: 0.45 },
  { rotate: 180, color: '#36E7A1', delay: 0.6 },
  { rotate: 225, color: '#A78BFA', delay: 0.75 },
  { rotate: 270, color: '#36E7A1', delay: 0.9 },
  { rotate: 315, color: '#A78BFA', delay: 1.05 },
];

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fading'), MIN_DISPLAY_MS);
    const goneTimer = setTimeout(() => setPhase('gone'), MIN_DISPLAY_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0d14]"
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
      aria-hidden={phase === 'fading'}
    >
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      <div className="relative flex h-[220px] w-[220px] items-center justify-center">
        {/* Lightning rays shooting outward */}
        <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full" aria-hidden>
          {RAYS.map((ray) => (
            <g
              key={ray.rotate}
              style={{ transform: `rotate(${ray.rotate}deg)`, transformOrigin: '110px 110px' }}
            >
              <g className="bob-bolt-ray" style={{ animationDelay: `${ray.delay}s` }}>
                <path
                  d="M110 62 L106 44 L113 42 L107 24 L114 22 L108 4"
                  fill="none"
                  stroke={ray.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 6px ${ray.color})` }}
                />
              </g>
            </g>
          ))}
        </svg>

        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={150}
          height={60}
          priority
          unoptimized
          className="bob-load-logo relative h-auto w-[140px] object-contain"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      {/* Loading bar */}
      <div className="mt-6 h-[3px] w-[180px] overflow-hidden rounded-full bg-[#1e2640]">
        <div
          className="bob-load-bar h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #36E7A1, #A78BFA)',
            boxShadow: '0 0 10px rgba(54,231,161,0.6)',
          }}
        />
      </div>

      <p
        className="mt-4 text-[10px] uppercase text-[#6b7a99]"
        style={{ letterSpacing: '3px' }}
      >
        Loading the War Room...
      </p>
    </div>
  );
}
