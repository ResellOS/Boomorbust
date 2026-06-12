'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useLightning } from '@/lib/hooks/useLightning';

const LOADER_CSS = `
@keyframes wr-flash {
  0% { opacity: 0; }
  35% { opacity: var(--flash-max, 0.12); }
  100% { opacity: 0; }
}
@keyframes wr-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(260%); }
}
@keyframes wr-ready-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.wr-flash { animation: wr-flash var(--flash-ms, 150ms) ease-out forwards; }
.wr-shimmer { animation: wr-shimmer 1.4s ease-in-out infinite; }
.wr-ready { animation: wr-ready-in 400ms ease-out forwards; }
`;

export interface LightningDebugInfo {
  progress: number | null;
  status: string;
  canvasWidth: number;
  canvasHeight: number;
  strikeCount: number;
}

export interface WarRoomLoaderProps {
  /** 0–100. Omit or pass null for indeterminate shimmer mode. */
  progress?: number | null;
  status?: string;
  /** Show the large green READY. state. */
  ready?: boolean;
  /** Fire the double-ended completion strike. */
  mega?: boolean;
  /** Optional debug callback (test page only). */
  onDebugUpdate?: (info: LightningDebugInfo) => void;
  /** Optional ref to expose forceMegaStrike for debug controls. */
  forceMegaRef?: MutableRefObject<(() => void) | null>;
}

export default function WarRoomLoader({
  progress = null,
  status = 'LOADING THE WAR ROOM...',
  ready = false,
  mega = false,
  onDebugUpdate,
  forceMegaRef,
}: WarRoomLoaderProps) {
  const [flashKey, setFlashKey] = useState(0);
  const [flashMax, setFlashMax] = useState(0.12);
  const [flashMs, setFlashMs] = useState(150);
  const prevStatus = useRef(status);

  const handleStrike = useCallback((intensity: number) => {
    setFlashMax(intensity);
    setFlashMs(150);
    setFlashKey((k) => k + 1);
  }, []);

  const { canvasRef, canvasWidth, canvasHeight, strikeCount, forceMegaStrike } = useLightning({
    mode: 'ambient',
    megaStrike: mega,
    onStrike: handleStrike,
  });

  useEffect(() => {
    if (forceMegaRef) forceMegaRef.current = forceMegaStrike;
    return () => {
      if (forceMegaRef) forceMegaRef.current = null;
    };
  }, [forceMegaRef, forceMegaStrike]);

  useEffect(() => {
    onDebugUpdate?.({
      progress: progress == null ? null : Math.max(0, Math.min(100, progress)),
      status,
      canvasWidth,
      canvasHeight,
      strikeCount,
    });
  }, [progress, status, canvasWidth, canvasHeight, strikeCount, onDebugUpdate]);

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      setFlashMax(0.05);
      setFlashMs(150);
      setFlashKey((k) => k + 1);
    }
  }, [status]);

  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center overflow-hidden bg-[#0a0d14]">
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      {/* Same ambient canvas lightning as login page */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10"
        aria-hidden
      />

      {/* Full-screen white flash on each strike */}
      <div
        key={`flash-${flashKey}`}
        className="wr-flash pointer-events-none absolute inset-0 z-[15] bg-white"
        style={{ '--flash-max': flashMax, '--flash-ms': `${flashMs}ms` } as React.CSSProperties}
        aria-hidden
      />

      {/* Logo + progress + status */}
      <div className="relative z-20 flex flex-col items-center px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Boom or Bust"
          width={320}
          height={320}
          className="h-auto w-[320px]"
          style={{
            mixBlendMode: 'screen',
            filter:
              'drop-shadow(0 0 40px rgba(54,231,161,0.5)) drop-shadow(0 0 80px rgba(167,139,250,0.3))',
          }}
          draggable={false}
        />

        <div className="mt-10 flex flex-col items-center">
          <div
            className="relative overflow-hidden rounded-[3px]"
            style={{
              width: 400,
              height: 6,
              background: 'rgba(255,255,255,0.08)',
              boxShadow: '0 0 12px rgba(54,231,161,0.5)',
            }}
          >
            {pct == null ? (
              <div
                className="wr-shimmer absolute inset-y-0 w-[38%] rounded-[3px]"
                style={{ background: 'linear-gradient(90deg, transparent, #36E7A1, #A78BFA, transparent)' }}
              />
            ) : (
              <div
                className="h-full rounded-[3px] transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #36E7A1, #A78BFA)' }}
              />
            )}
          </div>

          {ready ? (
            <p
              className="wr-ready mt-5 font-figtree text-[22px] font-bold uppercase text-boom"
              style={{ letterSpacing: '6px', textShadow: '0 0 20px rgba(54,231,161,0.8)' }}
            >
              Ready.
            </p>
          ) : (
            <p
              className="mt-5 font-figtree text-[10px] uppercase text-[#6b7a99]"
              style={{ letterSpacing: '3px' }}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
