import Link from 'next/link';

const BG = '#0a0d14';
const BOOM = '#3ECFAD';

export default function LandingFinalCta() {
  return (
    <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6 sm:py-24 lg:px-10" style={{ background: BG }}>
      <div className="mx-auto max-w-[720px] text-center">
        <h2
          className="text-[clamp(1.75rem,6vw,2.75rem)] font-normal leading-tight tracking-[0.02em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Stop Guessing. Start Winning.
        </h2>
        <p className="mt-3 text-[16px] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
          Import your leagues and see the portfolio view in minutes.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex min-h-[48px] w-full max-w-[360px] items-center justify-center rounded-xl px-8 py-3 text-[17px] font-bold text-[#0a0d14] shadow-[0_0_32px_rgba(62,207,173,0.5)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_40px_rgba(62,207,173,0.55)] sm:w-auto"
          style={{ fontFamily: 'var(--font-body)', background: BOOM }}
        >
          Import My Leagues
        </Link>
      </div>
    </section>
  );
}
