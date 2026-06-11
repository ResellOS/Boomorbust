'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LightningCanvas from '@/components/LightningCanvas';

const LOADER_CSS = `
@keyframes wr-flash {
  0% { opacity: 0; }
  40% { opacity: var(--flash-max, 0.15); }
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
.wr-flash { animation: wr-flash var(--flash-ms, 140ms) ease-out forwards; }
.wr-hud { animation: wr-hud-pulse 4s ease-in-out infinite; }
.wr-shimmer { animation: wr-shimmer 1.4s ease-in-out infinite; }
.wr-ready { animation: wr-ready-in 400ms ease-out forwards; }
.wr-logo-surge { animation: wr-logo-surge 600ms ease-out forwards; }
`;

/** Logo center in the background art, as % of viewport. */
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
  const [flashKey, setFlashKey] = useState(0);
  const [flashMax, setFlashMax] = useState(0.15);
  const [flashMs, setFlashMs] = useState(140);
  const [logoSurge, setLogoSurge] = useState(false);
  const prevStatus = useRef(status);
  const megaFired = useRef(false);

  // Screen flash whenever the canvas spawns a strike.
  const handleStrike = useCallback((intensity: number) => {
    setFlashMax(intensity);
    setFlashMs(intensity >= 0.5 ? 200 : 140);
    setFlashKey((k) => k + 1);
  }, []);

  // Small flash on status change (0.3 intensity of a normal flash).
  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      setFlashMax(0.05);
      setFlashMs(140);
      setFlashKey((k) => k + 1);
    }
  }, [status]);

  // Logo glow surge for 600ms on the final strike.
  useEffect(() => {
    if (mega && !megaFired.current) {
      megaFired.current = true;
      setLogoSurge(true);
    }
  }, [mega]);

  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div
      className="fixed inset-0 z-[9990] flex flex-col items-center justify-center overflow-hidden bg-[#0a0d14]"
      style={{
        backgroundImage: "url('/backgrounds/loading-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      {/* Procedural canvas lightning — radial strikes from the logo center */}
      <LightningCanvas
        mode="radial"
        origin={LOGO_ORIGIN}
        megaStrike={mega}
        onStrike={handleStrike}
      />

      {/* Lightning flash overlay */}
      <div
        key={`flash-${flashKey}`}
        className="wr-flash pointer-events-none absolute inset-0 bg-white"
        style={{ '--flash-max': flashMax, '--flash-ms': `${flashMs}ms` } as React.CSSProperties}
        aria-hidden
      />

      {/* Logo glow surge on completion */}
      {logoSurge ? (
        <div
          className="wr-logo-surge pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            top: `${LOGO_ORIGIN.yPct}%`,
            width: '46vmin',
            height: '46vmin',
            background: 'radial-gradient(circle, rgba(54,231,161,0.55) 0%, rgba(54,231,161,0.18) 40%, transparent 70%)',
            filter: 'blur(12px)',
          }}
          aria-hidden
        />
      ) : null}

      {/* HUD edge lines */}
      <div className="wr-hud pointer-events-none absolute left-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col justify-between md:flex" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + (i % 2) * 26 }} />
        ))}
        <div className="absolute left-0 top-0 h-full w-px bg-boom" />
      </div>
      <div className="wr-hud pointer-events-none absolute right-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col items-end justify-between md:flex" style={{ animationDelay: '2s' }} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + ((i + 1) % 2) * 26 }} />
        ))}
        <div className="absolute right-0 top-0 h-full w-px bg-boom" />
      </div>

      {/* Progress + status — positioned in the lower third, below the baked-in logo */}
      <div className="absolute bottom-[14%] left-1/2 flex w-full -translate-x-1/2 flex-col items-center px-6">
        <div className="flex w-full max-w-[500px] items-center gap-3">
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
          <p className="wr-ready mt-5 font-figtree text-[22px] font-bold uppercase text-boom" style={{ letterSpacing: '6px', textShadow: '0 0 20px rgba(54,231,161,0.8)' }}>
            Ready.
          </p>
        ) : (
          <p className="mt-5 font-figtree text-[10px] uppercase text-[#6b7a99]" style={{ letterSpacing: '3px' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
