'use client';

import { type RefObject } from 'react';
import { useLightning, type UseLightningOptions } from '@/lib/hooks/useLightning';

export interface LightningCanvasProps extends UseLightningOptions {
  className?: string;
  anchorRef?: RefObject<HTMLElement | null>;
}

/** Thin canvas wrapper around {@link useLightning} — same engine as login + War Room loader. */
export default function LightningCanvas({
  className,
  anchorRef,
  ...options
}: LightningCanvasProps) {
  const { canvasRef } = useLightning({ ...options, anchorRef });

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'pointer-events-none absolute inset-0 z-10'}
      aria-hidden
    />
  );
}
