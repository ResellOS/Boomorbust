'use client';

import { useEffect, useState } from 'react';

// Phases: 'icon' → 'shockwave' → 'text' → 'hold' → 'exit' → 'done'
type Phase = 'icon' | 'shockwave' | 'text' | 'hold' | 'exit' | 'done';

interface SplashScreenProps {
  /** Set to true once all data is fetched — triggers the dismiss sequence */
  ready?: boolean;
}

export default function SplashScreen({ ready = false }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>('icon');
  const [dots, setDots] = useState('');

  // Phase progression
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shockwave'), 1500);
    const t2 = setTimeout(() => setPhase('text'), 2500);
    const t3 = setTimeout(() => setPhase('hold'), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Dismiss once data is ready and we've reached 'hold'
  useEffect(() => {
    if (ready && phase === 'hold') {
      setPhase('exit');
      const t = setTimeout(() => setPhase('done'), 420);
      return () => clearTimeout(t);
    }
  }, [ready, phase]);

  // Animated dots during hold
  useEffect(() => {
    if (phase !== 'hold') return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 4;
      setDots('.'.repeat(i));
    }, 400);
    return () => clearInterval(id);
  }, [phase]);

  // Lock body scroll while visible
  useEffect(() => {
    if (phase === 'done') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <>
      <style>{`
        @keyframes bbFlicker {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px #06B6D4) drop-shadow(0 0 24px #06B6D4); }
          30%       { opacity: 0.5; filter: drop-shadow(0 0 2px #06B6D4); }
          60%       { opacity: 0.9; filter: drop-shadow(0 0 20px #06B6D4) drop-shadow(0 0 48px rgba(6,182,212,0.4)); }
        }
        @keyframes shockwave {
          0%   { transform: scale(0); opacity: 0.8; }
          60%  { opacity: 0.5; }
          100% { transform: scale(7); opacity: 0; }
        }
        @keyframes slamLeft {
          0%   { transform: translateX(-120px); opacity: 0; }
          60%  { transform: translateX(6px); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slamRight {
          0%   { transform: translateX(120px); opacity: 0; }
          60%  { transform: translateX(-6px); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes orFadeIn {
          0%   { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashExit {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
      `}</style>

      <div
        role="status"
        aria-label="Loading BOOM OR BUST"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#0B0E14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation: phase === 'exit' ? 'splashExit 420ms ease-out forwards' : undefined,
        }}
      >
        {/* Phase 1 — BB icon flicker */}
        {(phase === 'icon' || phase === 'shockwave') && (
          <div
            style={{
              animation: 'bbFlicker 0.7s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(6,182,212,0.15))',
              border: '1px solid rgba(6,182,212,0.4)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-icon.png"
              alt=""
              aria-hidden
              style={{ width: 52, height: 52, objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Phase 2 — Crimson shockwave */}
        {phase === 'shockwave' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239,68,68,0.55) 0%, transparent 70%)',
              animation: 'shockwave 900ms ease-out forwards',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Phase 3 + hold — Text lockup */}
        {(phase === 'text' || phase === 'hold' || phase === 'exit') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)',
              letterSpacing: '4px',
            }}
          >
            <span
              style={{
                fontSize: 64,
                color: '#F1F5F9',
                lineHeight: 1,
                animation: 'slamLeft 500ms cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              BOOM
            </span>
            <span
              style={{
                fontSize: 40,
                color: '#06B6D4',
                lineHeight: 1,
                animation: 'orFadeIn 400ms ease 200ms both',
              }}
            >
              OR
            </span>
            <span
              style={{
                fontSize: 64,
                color: '#F1F5F9',
                lineHeight: 1,
                animation: 'slamRight 500ms cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              BUST
            </span>
          </div>
        )}

        {/* Hold — loading indicator */}
        {(phase === 'hold' || phase === 'exit') && (
          <p
            style={{
              marginTop: 24,
              fontFamily: 'monospace',
              fontSize: 13,
              color: '#475569',
              letterSpacing: '0.15em',
              animation: 'dotPulse 1.2s ease-in-out infinite',
              minWidth: 120,
              textAlign: 'center',
            }}
          >
            LOADING{dots}
          </p>
        )}
      </div>
    </>
  );
}
