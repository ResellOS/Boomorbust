'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { generateBolt, renderBolt, type BoltSegment } from '@/lib/lightning';

const BOOM = '#36E7A1';
const BUST = '#A78BFA';
const WHITE = '#ffffff';

interface Channel {
  segments: BoltSegment[];
  color: string;
  weight: number;
}

interface Strike {
  channels: Channel[];
  bornAt: number;
  drawInMs: number;
  holdMs: number;
  fadeMs: number;
}

export interface UseLightningOptions {
  /** ambient — same pattern as login page (green left / purple right vertical strikes). */
  mode?: 'ambient' | 'radial' | 'warroom';
  origin?: { xPct: number; yPct: number };
  anchorRef?: RefObject<HTMLElement | null>;
  megaStrike?: boolean;
  onStrike?: (intensity: number) => void;
}

export interface UseLightningResult {
  canvasRef: RefObject<HTMLCanvasElement>;
  canvasWidth: number;
  canvasHeight: number;
  strikeCount: number;
  forceMegaStrike: () => void;
}

export function useLightning({
  mode = 'ambient',
  origin = { xPct: 50, yPct: 50 },
  anchorRef,
  megaStrike = false,
  onStrike,
}: UseLightningOptions = {}): UseLightningResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strikesRef = useRef<Strike[]>([]);
  const rafRef = useRef<number>(0);
  const onStrikeRef = useRef(onStrike);
  const megaFiredRef = useRef(false);
  const megaSpawnRef = useRef<(() => void) | null>(null);
  const strikeCountRef = useRef(0);

  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);

  onStrikeRef.current = onStrike;

  const recordStrike = useCallback((intensity: number) => {
    strikeCountRef.current += 1;
    setStrikeCount(strikeCountRef.current);
    onStrikeRef.current?.(intensity);
  }, []);

  const forceMegaStrike = useCallback(() => {
    megaSpawnRef.current?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const target = anchorRef?.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (target) {
        w = target.clientWidth;
        h = target.clientHeight;
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }

      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setCanvasWidth(w);
      setCanvasHeight(h);
    };

    resize();
    window.addEventListener('resize', resize);

    const anchor = anchorRef?.current;
    const ro = anchor ? new ResizeObserver(resize) : null;
    if (anchor) {
      ro?.observe(anchor);
      if (anchor instanceof HTMLImageElement && !anchor.complete) {
        anchor.addEventListener('load', resize);
      }
    }

    const makeChannels = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      branches: number,
      color: string,
      echo = true,
    ): Channel[] => {
      const main: Channel = {
        segments: generateBolt(x1, y1, x2, y2, branches),
        color,
        weight: 1,
      };
      if (!echo) return [main];
      return [
        main,
        {
          segments: generateBolt(
            x1 + (Math.random() * 12 - 6),
            y1,
            x2 + (Math.random() * 12 - 6),
            y2,
            branches,
          ),
          color,
          weight: 0.35,
        },
      ];
    };

    const spawnAmbient = () => {
      const left = Math.random() < 0.5;
      const x = left ? w * (0.06 + Math.random() * 0.22) : w * (0.72 + Math.random() * 0.22);
      const drift = (Math.random() - 0.5) * w * 0.12;
      const endY = h * (0.55 + Math.random() * 0.3);
      strikesRef.current.push({
        channels: makeChannels(x, -20, x + drift, endY, 6, left ? BOOM : BUST),
        bornAt: performance.now(),
        drawInMs: 80,
        holdMs: 0,
        fadeMs: 400,
      });
      recordStrike(0.12);
    };

    const spawnRadial = () => {
      const cx = (w * origin.xPct) / 100;
      const cy = (h * origin.yPct) / 100;
      const reach = Math.min(w, h) * (0.28 + Math.random() * 0.14);
      const channels: Channel[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + Math.random() * 24 - 12) * (Math.PI / 180);
        const ex = cx + Math.cos(angle) * reach;
        const ey = cy + Math.sin(angle) * reach;
        channels.push(...makeChannels(cx, cy, ex, ey, 5, i % 2 === 0 ? BOOM : BUST));
      }
      strikesRef.current.push({
        channels,
        bornAt: performance.now(),
        drawInMs: 80,
        holdMs: 0,
        fadeMs: 400,
      });
      recordStrike(0.12);
    };

    const spawnWarroom = () => {
      const cx = (w * origin.xPct) / 100;
      const cy = (h * origin.yPct) / 100;
      const pad = 24;

      const channels: Channel[] = [
        ...makeChannels(cx, cy, -pad, cy - h * 0.06, 7, BOOM),
        ...makeChannels(cx, cy, cx - w * 0.1, -pad, 7, BOOM),
        ...makeChannels(cx, cy, w + pad, cy - h * 0.06, 7, BUST),
        ...makeChannels(cx, cy, cx + w * 0.1, -pad, 7, BUST),
        ...makeChannels(cx, cy, cx, -pad, 8, WHITE),
        ...makeChannels(cx, cy, cx, h + pad, 8, WHITE),
      ];

      strikesRef.current.push({
        channels,
        bornAt: performance.now(),
        drawInMs: 80,
        holdMs: 0,
        fadeMs: 400,
      });
      recordStrike(0.12);
    };

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        if (mode === 'ambient') spawnAmbient();
        else if (mode === 'radial') spawnRadial();
        else spawnWarroom();
        schedule();
      }, 2000 + Math.random() * 1000);
    };
    schedule();

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      const alive: Strike[] = [];

      for (const strike of strikesRef.current) {
        const t = now - strike.bornAt;
        let alpha = 1;
        let reveal = 1;

        if (t < strike.drawInMs) {
          reveal = t / strike.drawInMs;
        } else if (t > strike.drawInMs + strike.holdMs) {
          alpha = 1 - (t - strike.drawInMs - strike.holdMs) / strike.fadeMs;
        } else {
          alpha = 0.88 + Math.random() * 0.12;
        }

        if (alpha > 0) {
          for (const ch of strike.channels) {
            renderBolt(ctx, ch.segments, ch.color, alpha * ch.weight, reveal);
          }
          alive.push(strike);
        }
      }

      strikesRef.current = alive;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    megaSpawnRef.current = () => {
      const cx = (w * origin.xPct) / 100;
      const cy = (h * origin.yPct) / 100;
      strikesRef.current.push({
        channels: [
          ...makeChannels(cx, cy, cx, -30, 8, BOOM, false),
          ...makeChannels(cx, cy, cx, h + 30, 8, BUST, false),
        ],
        bornAt: performance.now(),
        drawInMs: 80,
        holdMs: 600,
        fadeMs: 400,
      });
      recordStrike(0.3);
    };

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
      if (anchor instanceof HTMLImageElement) {
        anchor.removeEventListener('load', resize);
      }
      strikesRef.current = [];
      megaSpawnRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, origin.xPct, origin.yPct, recordStrike]);

  useEffect(() => {
    if (megaStrike && !megaFiredRef.current) {
      megaFiredRef.current = true;
      megaSpawnRef.current?.();
    }
  }, [megaStrike]);

  return {
    canvasRef: canvasRef as RefObject<HTMLCanvasElement>,
    canvasWidth,
    canvasHeight,
    strikeCount,
    forceMegaStrike,
  };
}
