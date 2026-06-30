'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WarRoomLoader, { type LightningDebugInfo } from '@/components/WarRoomLoader';
import { LOADER_TIMELINE, progressFromElapsed } from '@/lib/loader/timeline';

export default function TestLoaderPage() {
  const [runKey, setRunKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [debug, setDebug] = useState<LightningDebugInfo>({
    progress: 0,
    status: '',
    canvasWidth: 0,
    canvasHeight: 0,
    strikeCount: 0,
  });

  const forceMegaRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef(Date.now());

  const progress = progressFromElapsed(elapsed);
  const showWarRoomText = elapsed >= LOADER_TIMELINE.WAR_ROOM_TEXT_MS;
  const strikeReady = elapsed >= LOADER_TIMELINE.STRIKE_MS;

  const resetRun = useCallback(() => {
    startedAtRef.current = Date.now();
    setElapsed(0);
    setCompleted(false);
    setRunKey((k) => k + 1);
  }, []);

  useEffect(() => {
    startedAtRef.current = Date.now();
    const tick = window.setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 40);
    return () => window.clearInterval(tick);
  }, [runKey]);

  const handleStrikeComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  return (
    <>
      <WarRoomLoader
        key={runKey}
        progress={progress}
        ready={strikeReady}
        showWarRoomText={showWarRoomText}
        onDebugUpdate={setDebug}
        onStrikeComplete={handleStrikeComplete}
        forceMegaRef={forceMegaRef}
      />

      <div
        className="fixed left-3 top-3 z-[10000] rounded border border-white/10 bg-black/70 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[#6b7a99]"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div>elapsed: {elapsed}ms</div>
        <div>progress: {Math.round(progress)}%</div>
        <div>
          canvas: {debug.canvasWidth}×{debug.canvasHeight}
        </div>
        <div>strikes: {debug.strikeCount}</div>
        <button
          type="button"
          onClick={() => forceMegaRef.current?.()}
          className="mt-1 rounded border border-boom/40 px-1.5 py-0.5 text-[10px] uppercase text-boom hover:bg-boom/10"
        >
          Force Final Strike
        </button>
      </div>

      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
        {completed ? (
          <button
            type="button"
            onClick={resetRun}
            className="rounded-lg border border-boom/40 bg-[#0a0d14]/90 px-4 py-2 font-mono text-xs uppercase tracking-wider text-boom hover:bg-boom/10"
          >
            Replay
          </button>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#6b7a99]">
            Playing cinematic sequence…
          </p>
        )}
      </div>
    </>
  );
}
