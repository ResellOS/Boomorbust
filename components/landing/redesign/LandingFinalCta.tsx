'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLightning } from '@/lib/hooks/useLightning';
import { LANDING } from './constants';

export default function LandingFinalCta() {
  const { canvasRef } = useLightning({ mode: 'ambient' });

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28" style={{ background: LANDING.dark }}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #080b10 75%)' }}
      />

      <div className="relative mx-auto max-w-[720px] text-center">
        <div className="mx-auto mb-8 flex justify-center" style={{ mixBlendMode: 'screen' }}>
          <Image
            src="/logo.png"
            alt="Boom or Bust"
            width={280}
            height={100}
            unoptimized
            className="h-auto w-[200px] sm:w-[260px]"
            style={{
              mixBlendMode: 'screen',
              filter: 'brightness(1.3) saturate(1.3) drop-shadow(0 0 40px rgba(54,231,161,0.35))',
            }}
          />
        </div>
        <h2 className="font-figtree text-[clamp(1.5rem,4vw,2.25rem)] leading-tight text-[#e8ecf4]">
          STOP MANAGING TEAMS.
          <br />
          START MANAGING ASSETS.
        </h2>
        <p className="mt-4 font-figtree text-[14px] text-[#e8ecf4]/55">
          Join the dynasty managers building an edge before the 2026 season begins.
        </p>
        <Link
          href="/onboarding"
          className="mt-8 inline-block rounded-md px-8 py-3.5 font-figtree text-[15px] text-[#0a0d14] transition hover:brightness-110"
          style={{ background: LANDING.boom, boxShadow: '0 0 28px rgba(54,231,161,0.35)' }}
        >
          Import My Leagues →
        </Link>
      </div>
    </section>
  );
}
