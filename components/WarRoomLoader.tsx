'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LightningCanvas from '@/components/LightningCanvas';

const LOADER_CSS = `
@keyframes wr-flash {
  0% { opacity: 0; }
  35% { opacity: var(--flash-max, 0.12); }
  100% { opacity: 0; }
}
@keyframes wr-hud-pulse {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.2; }
}
@keyframes wr-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(260%); }
}
@keyframes wr-ready-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes wr-logo-surge {
  0% { opacity: 0; }
  25% { opacity: 1; }
  100% { opacity: 0; }
}
.wr-flash { animation: wr-flash var(--flash-ms, 150ms) ease-out forwards; }
.wr-hud { animation: wr-hud-pulse 4s ease-in-out infinite; }
.wr-shimmer { animation: wr-shimmer 1.4s ease-in-out infinite; }
.wr-ready { animation: wr-ready-in 400ms ease-out forwards; }
.wr-logo-surge { animation: wr-logo-surge 600ms ease-out forwards; }
`;

/** Logo center in the background art, as % of the image. */
const LOGO_ORIGIN = { xPct: 50, yPct: 45 };

export interface WarRoomLoaderProps {
  /** 0–100. Omit or pass null for indeterminate shimmer mode. */
  progress?: number | null;
  status?: string;
  /** Show the large green READY. state. */
  ready?: boolean;
  /** Fire the double-ended completion strike. */
  mega?: boolean;
}

export default function WarRoomLoader({
  progress = null,
  status = 'LOADING THE WAR ROOM...',
  ready = false,
  mega = false,
}: WarRoomLoaderProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [flashMax, setFlashMax] = useState(0.12);
  const [flashMs, setFlashMs] = useState(150);
  const [logoSurge, setLogoSurge] = useState(false);
  const prevStatus = useRef(status);
  const megaFired = useRef(false);

  const handleStrike = useCallback((intensity: number) => {
    setFlashMax(intensity);
    setFlashMs(150);
    setFlashKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      setFlashMax(0.05);
      setFlashMs(150);
      setFlashKey((k) => k + 1);
    }
  }, [status]);

  useEffect(() => {
    if (mega && !megaFired.current) {
      megaFired.current = true;
      setLogoSurge(true);
    }
  }, [mega]);

  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center overflow-hidden bg-[#0a0d14]">
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      {/* Art + lightning — sized to natural image ratio */}
      <div className="relative flex flex-col items-center px-4">
        <div className="relative inline-block max-w-full">
          <img
            ref={imgRef}
            src="/backgrounds/loading-bg.png"
            alt=""
            className="block max-h-[78vh] w-auto max-w-[min(100vw,960px)]"
            style={{
              objectFit: 'contain',
              objectPosition: 'center',
            }}
            draggable={false}
          />

          <LightningCanvas
            mode="warroom"
            origin={LOGO_ORIGIN}
            anchorRef={imgRef}
            megaStrike={mega}
            onStrike={handleStrike}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />

          {/* Electrify flash — scoped to the image bounds */}
          <div
            key={`flash-${flashKey}`}
            className="wr-flash pointer-events-none absolute inset-0 z-[15] bg-white"
            style={{ '--flash-max': flashMax, '--flash-ms': `${flashMs}ms` } as React.CSSProperties}
            aria-hidden
          />

          {logoSurge ? (
            <div
              className="wr-logo-surge pointer-events-none absolute z-[12] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${LOGO_ORIGIN.xPct}%`,
                top: `${LOGO_ORIGIN.yPct}%`,
                width: '38%',
                height: '38%',
                background:
                  'radial-gradient(circle, rgba(54,231,161,0.55) 0%, rgba(54,231,161,0.18) 40%, transparent 70%)',
                filter: 'blur(12px)',
              }}
              aria-hidden
            />
          ) : null}
        </div>

        {/* Progress + status — centered below the image */}
        <div className="mt-6 flex w-full max-w-[500px] flex-col items-center px-2">
          <div className="flex w-full items-center gap-3">
            <div
              className="relative h-[6px] flex-1 overflow-hidden rounded-[3px]"
              style={{ background: 'rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(54,231,161,0.5)' }}
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
            {pct != null ? (
              <span className="w-[52px] shrink-0 text-right font-mono text-[14px] text-boom">
                {Math.round(pct)}%
              </span>
            ) : null}
          </div>

          {ready ? (
            <p
              className="wr-ready mt-5 font-figtree text-[22px] font-bold uppercase text-boom"
              style={{ letterSpacing: '6px', textShadow: '0 0 20px rgba(54,231,161,0.8)' }}
            >
              Ready.
            </p>
          ) : (
            <p className="mt-5 font-figtree text-[10px] uppercase text-[#6b7a99]" style={{ letterSpacing: '3px' }}>
              {status}
            </p>
          )}
        </div>
      </div>

      {/* HUD edge lines — viewport chrome */}
      <div className="wr-hud pointer-events-none absolute left-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col justify-between md:flex" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + (i % 2) * 26 }} />
        ))}
        <div className="absolute left-0 top-0 h-full w-px bg-boom" />
      </div>
      <div
        className="wr-hud pointer-events-none absolute right-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col items-end justify-between md:flex"
        style={{ animationDelay: '2s' }}
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + ((i + 1) % 2) * 26 }} />
        ))}
        <div className="absolute right-0 top-0 h-full w-px bg-boom" />
      </div>
    </div>
  );
}
