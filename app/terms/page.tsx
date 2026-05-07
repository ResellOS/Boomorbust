import Link from 'next/link';
import AppBackground from '@/components/AppBackground';

export const metadata = { title: 'Terms of Service — The Front Office' };

export default function TermsPage() {
  return (
    <AppBackground intensity="subtle">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-2.5 mb-12">
            <span className="w-10 h-10 rounded-full bg-[var(--indigo)]/20 flex items-center justify-center text-xl">
              🏆
            </span>
            <span className="display text-[24px] tracking-[3px]">
              <span className="text-white">THE </span>
              <span style={{ color: 'var(--indigo)' }}>FRONT OFFICE</span>
            </span>
          </div>

          <div className="card p-8 space-y-8">
            <div>
              <h1 className="text-white text-2xl font-bold mb-1">Terms of Service</h1>
              <p className="text-[var(--text-muted)] text-xs">Last updated: April 28, 2026</p>
            </div>

            <section className="space-y-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
                1. Data Collection &amp; Privacy
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                By syncing your Sleeper leagues, you agree that anonymized trade and draft data
                may be used to improve dynasty value calculations. No personally identifiable
                information is stored. All collected data is stripped of user identifiers before
                being used in market analytics.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
                2. Read-Only Access
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                The Front Office connects to Sleeper in read-only mode. We never post, modify,
                make trades, or take any action on your behalf within Sleeper or any other
                platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
                3. No Guarantees
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Dynasty analysis, trade grades, and AI recommendations are provided for
                informational purposes only. The Front Office makes no guarantees about the
                accuracy of valuations or fantasy outcomes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
                4. Subscriptions &amp; Billing
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Paid plans are billed through Stripe. You may cancel at any time from the
                Settings page. Refunds are handled on a case-by-case basis — contact us at{' '}
                <a
                  href="mailto:getresellos@myyahoo.com"
                  className="text-[var(--indigo-light)] hover:underline"
                >
                  getresellos@myyahoo.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
                5. Changes to Terms
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                We may update these terms at any time. Continued use of The Front Office after
                changes constitutes acceptance of the updated terms.
              </p>
            </section>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-8">
            <Link href="/onboarding" className="text-[var(--indigo-light)] hover:underline">
              ← Back to setup
            </Link>
          </p>
        </div>
      </div>
    </AppBackground>
  );
}
