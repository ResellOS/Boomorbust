import Link from 'next/link';

const BG = '#0a0d14';

export default function ResourcesPlaceholderPage() {
  return (
    <div className="min-h-screen px-4 py-16 sm:px-8" style={{ background: BG, color: '#f8fafc' }}>
      <div className="mx-auto max-w-[720px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
          Resources
        </p>
        <h1
          className="mt-3 text-[clamp(1.75rem,5vw,2.5rem)] font-normal leading-tight tracking-[0.02em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Coming soon
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65" style={{ fontFamily: 'var(--font-body)' }}>
          Documentation, glossary, and changelog will live here. For now, explore the product from the home page.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.14] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          ← Back to home
        </Link>

        <section id="documentation" className="scroll-mt-24 mt-16 border-t border-white/[0.08] pt-12">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
            Documentation
          </h2>
          <p className="mt-2 text-[14px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
            Placeholder — guides and API references will be published here.
          </p>
        </section>
        <section id="glossary" className="scroll-mt-24 mt-12 border-t border-white/[0.08] pt-12">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
            Dynasty glossary
          </h2>
          <p className="mt-2 text-[14px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
            Placeholder — definitions for TFO, DMS, BVI, and more.
          </p>
        </section>
        <section id="changelog" className="scroll-mt-24 mt-12 border-t border-white/[0.08] pt-12">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
            Changelog
          </h2>
          <p className="mt-2 text-[14px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
            Placeholder — release notes and product updates.
          </p>
        </section>
      </div>
    </div>
  );
}
