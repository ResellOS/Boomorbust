'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

function EdgeSparkline() {
  const d = 'M0 28 L10 22 L20 26 L30 14 L40 18 L48 8 L56 4';
  return (
    <svg className="mt-4 h-16 w-full max-w-[220px]" viewBox="0 0 56 32" aria-hidden>
      <path d={d} fill="none" stroke="#22D3EE" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.45))' }} />
    </svg>
  );
}

export default function LandingDynastyStatsSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section
      className="border-y border-emerald-500/15 py-20 sm:py-24"
      style={{ background: 'rgba(62,207,173,0.04)' }}
    >
      <div ref={ref} className={`landing-reveal-up mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10 ${inView ? 'landing-reveal-up--in' : ''}`}>
        <h2
          className="text-center text-[clamp(1.35rem,5vw,2.25rem)] font-normal tracking-[0.03em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Built for Serious Dynasty Players
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
          <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[24px] sm:p-8" style={{ boxShadow: '0 0 24px rgba(34,211,238,0.14)' }}>
            <p className="font-mono text-[clamp(2.25rem,8vw,3.5rem)] font-bold tabular-nums leading-none text-[#22D3EE]" style={{ textShadow: '0 0 28px rgba(34,211,238,0.35)' }}>
              13.4%
            </p>
            <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Sit/Start Edge
            </p>
            <EdgeSparkline />
            <p className="mt-3 text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Validated lift vs consensus ranks when decisions follow the model.
            </p>
          </article>

          <article className="rounded-xl p-6 backdrop-blur-[24px] sm:p-8" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}>
            <p style={{ fontSize: 11, color: 'rgba(34,211,238,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              Verified <span style={{ color: '#22D3EE' }}>✓</span>
            </p>
            <p
              className="font-mono text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-none tabular-nums text-[#3ECFAD]"
              style={{ textShadow: '0 0 28px rgba(62,207,173,0.35)' }}
            >
              42-18-2
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Verified Record
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Tracked outcomes across active Sleeper leagues — not cherry-picked highlights.
            </p>
          </article>

          <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[24px] sm:p-8" style={{ boxShadow: '0 0 24px rgba(139,92,246,0.18)' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8B5CF6]/40 text-[#8B5CF6]" style={{ boxShadow: '0 0 18px rgba(139,92,246,0.35)' }} aria-hidden>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth={1.5} />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth={1.25}
                />
              </svg>
            </div>
            <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-[#8B5CF6]" style={{ fontFamily: 'var(--font-body)' }}>
              Refinement Feedback Loop
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-mono tabular-nums">100%</span> transparency — every miss feeds the next model pass.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
