'use client';

import { useEffect, useState } from 'react';
import WarRoomLoader from '@/components/WarRoomLoader';

const MIN_DISPLAY_MS = 800;
const FADE_MS = 300;

/** Initial app-load overlay: War Room loader, 800ms minimum, 300ms fade out. */
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
      className="fixed inset-0 z-[9999]"
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
      aria-hidden={phase === 'fading'}
    >
      <WarRoomLoader status="LOADING THE WAR ROOM..." />
    </div>
  );
}
