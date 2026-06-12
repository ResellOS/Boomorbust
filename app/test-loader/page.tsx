'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import WarRoomLoader, { type LightningDebugInfo } from '@/components/WarRoomLoader';

const DURATION_MS = 15_000;

const SYNC_STAGES = [
  'CONNECTING TO SLEEPER...',
  'IMPORTING LEAGUES...',
  'SCANNING ROSTERS...',
  'ANALYZING PLAYERS...',
  'CALCULATING DYNASTY SCORES...',
  'BUILDING YOUR EDGE...',
];

const ANALYSIS_STAGES = [
  'CROSS-REFERENCING TRADE HISTORY...',
  'MAPPING LEAGUE TENDENCIES...',
  'CALIBRATING DYNASTY SCORES...',
  'IDENTIFYING MARKET INEFFICIENCIES...',
  'SCANNING WAIVER WIRE OPPORTUNITIES...',
  'CALCULATING YOUR EDGE...',
  'FINALIZING WAR ROOM...',
];

const ALL_STAGES = [...SYNC_STAGES, ...ANALYSIS_STAGES];

function stageForProgress(pct: number): string {
  const idx = Math.min(ALL_STAGES.length - 1, Math.floor((pct / 100) * ALL_STAGES.length));
  return ALL_STAGES[idx];
}

export default function TestLoaderPage() {
  const [runKey, setRunKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(ALL_STAGES[0]);
  const [ready, setReady] = useState(false);
  const [mega, setMega] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [debug, setDebug] = useState<LightningDebugInfo>({
    progress: 0,
    status: ALL_STAGES[0],
    canvasWidth: 0,
    canvasHeight: 0,
    strikeCount: 0,
  });

  const forceMegaRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const resetRun = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setProgress(0);
    setStatus(ALL_STAGES[0]);
    setReady(false);
    setMega(false);
    setCompleted(false);
    setRunKey((k) => k + 1);
  }, []);

  const skipTo90 = useCallback(() => {
    if (finishedRef.current) return;
    setProgress(90);
    setStatus(stageForProgress(90));
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();

    const progressTick = setInterval(() => {
      if (finishedRef.current) return;
      const elapsed = Date.now() - startedAtRef.current;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      setStatus(stageForProgress(pct));

      if (pct >= 100) {
        finishedRef.current = true;
        setMega(true);
        setReady(true);
        setCompleted(true);
      }
    }, 100);

    return () => clearInterval(progressTick);
  }, [runKey]);

  return (
    <>
      <WarRoomLoader
        key={runKey}
        progress={progress}
        status={status}
        ready={ready}
        mega={mega}
        onDebugUpdate={setDebug}
        forceMegaRef={forceMegaRef}
      />

      {/* Debug panel — top-left, tiny text */}
      <div
        className="fixed left-3 top-3 z-[10000] rounded border border-white/10 bg-black/70 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[#6b7a99]"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div>progress: {debug.progress == null ? '—' : `${Math.round(debug.progress)}%`}</div>
        <div>status: {debug.status}</div>
        <div>
          canvas: {debug.canvasWidth}×{debug.canvasHeight}
        </div>
        <div>strikes: {debug.strikeCount}</div>
        <button
          type="button"
          onClick={() => forceMegaRef.current?.()}
          className="mt-1 rounded border border-boom/40 px-1.5 py-0.5 text-[9px] uppercase text-boom hover:bg-boom/10"
        >
          Force Final Strike
        </button>
      </div>

      {/* Test controls — bottom-right */}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
        {!completed ? (
          <button
            type="button"
            onClick={skipTo90}
            className="rounded-lg border border-white/15 bg-[#0a0d14]/90 px-4 py-2 font-figtree text-xs uppercase tracking-wider text-[#6b7a99] hover:border-boom/40 hover:text-boom"
          >
            Skip to 90%
          </button>
        ) : (
          <button
            type="button"
            onClick={resetRun}
            className="rounded-lg border border-boom/40 bg-[#0a0d14]/90 px-4 py-2 font-figtree text-xs uppercase tracking-wider text-boom hover:bg-boom/10"
          >
            Replay
          </button>
        )}
      </div>
    </>
  );
}
