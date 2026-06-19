'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WarRoomLoader from '@/components/WarRoomLoader';
import { LOADER_TIMELINE, progressFromElapsed } from '@/lib/loader/timeline';

/** Root layout overlay — logo powers up, strike opens the dashboard. */
export default function LoadingScreen() {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'gone'>('loading');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const dismissed = useRef(false);

  const progress = progressFromElapsed(elapsed);
  const showWarRoomText = elapsed >= LOADER_TIMELINE.WAR_ROOM_TEXT_MS;
  const strikeReady = elapsed >= LOADER_TIMELINE.STRIKE_MS;

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    setPhase('fading');
    window.setTimeout(() => setPhase('gone'), LOADER_TIMELINE.FADE_MS);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 40);
    return () => window.clearInterval(tick);
  }, []);

  const handleStrikeComplete = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // Safety net — never block the app past 3.5s
  useEffect(() => {
    const safety = window.setTimeout(dismiss, LOADER_TIMELINE.SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, [dismiss]);

  if (phase === 'gone') return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        opacity: phase === 'fading' ? 0 : 1,
        transition: `opacity ${LOADER_TIMELINE.FADE_MS}ms ease-out`,
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
      aria-hidden={phase === 'fading'}
    >
      <WarRoomLoader
        progress={progress}
        ready={strikeReady}
        showWarRoomText={showWarRoomText}
        onStrikeComplete={handleStrikeComplete}
      />
    </div>
  );
}
