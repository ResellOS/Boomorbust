import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Terms of Service — Boom or Bust',
  description: 'Terms of Service for Boom or Bust (BOB) dynasty fantasy football analytics.',
};

const TEXT = '#e8ecf4';
const MUTED = '#6b7a99';
const ACCENT = '#36E7A1';
const BG = '#0a0d14';
const CONTACT = 'hello@boomorbust.app';

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-[13px] font-bold uppercase tracking-[0.12em]"
        style={{ color: TEXT, fontFamily: 'var(--font-figtree), Figtree, sans-serif' }}
      >
        <span className="font-mono text-[12px] tabular-nums" style={{ color: ACCENT }}>
          {n}.
        </span>{' '}
        {title}
      </h2>
      <div
        className="space-y-2 text-[14px] leading-relaxed"
        style={{ color: MUTED, fontFamily: 'var(--font-figtree), Figtree, sans-serif' }}
      >
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-dvh px-4 py-12 sm:px-6 sm:py-16" style={{ background: BG, color: TEXT }}>
      <div className="mx-auto max-w-2xl">
        <header className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 opacity-80 transition hover:opacity-100">
            <Image src="/logo.png" alt="Boom or Bust" width={140} height={36} className="h-8 w-auto" unoptimized />
          </Link>
          <p
            className="mt-8 text-[10px] font-mono uppercase tracking-[0.18em]"
            style={{ color: MUTED }}
          >
            Legal
          </p>
          <h1
            className="mt-2 text-[28px] font-bold sm:text-[32px]"
            style={{ color: TEXT, fontFamily: 'var(--font-figtree), Figtree, sans-serif' }}
          >
            Terms of Service
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
            Last updated: June 2026
          </p>
        </header>

        <div
          className="space-y-10 rounded-xl border border-white/[0.08] p-6 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <Section n={1} title="Introduction">
            <p style={{ color: TEXT }}>
              Boom or Bust (&quot;BOB&quot;) is a dynasty fantasy football analytics platform
              operated by SaaSylum. By using this service you agree to these terms.
            </p>
          </Section>

          <Section n={2} title="Use of Service">
            <ul className="list-disc space-y-2 pl-5">
              <li>Must be 18+ to use</li>
              <li>One account per person</li>
              <li>
                Do not scrape, reverse engineer, or resell BOB data
              </li>
              <li>Free tier subject to usage limits</li>
            </ul>
          </Section>

          <Section n={3} title="Subscriptions & Billing">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Tiers: Free /{' '}
                <span className="font-mono tabular-nums" style={{ color: ACCENT }}>
                  $5
                </span>{' '}
                /{' '}
                <span className="font-mono tabular-nums" style={{ color: ACCENT }}>
                  $15
                </span>{' '}
                /{' '}
                <span className="font-mono tabular-nums" style={{ color: ACCENT }}>
                  $35
                </span>{' '}
                per month
              </li>
              <li>Billed monthly, cancel anytime</li>
              <li>One-time purchases non-refundable after use</li>
              <li>7-day money back guarantee on first charge</li>
            </ul>
          </Section>

          <Section n={4} title="Data & Privacy">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                We sync your Sleeper league data to provide the service — we do not sell your
                data
              </li>
              <li>
                Ads shown to free tier are programmatic only — no personal data sold
              </li>
              <li>
                You can export or delete your data at any time via Settings
              </li>
            </ul>
          </Section>

          <Section n={5} title="Predictions & Accuracy">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                BOB&apos;s projections are analytical tools, not guaranteed outcomes
              </li>
              <li>Past accuracy does not guarantee future results</li>
              <li>
                Never use BOB as the sole basis for financial decisions including sports betting
              </li>
            </ul>
          </Section>

          <Section n={6} title="Intellectual Property">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                BOB&apos;s formula engine, scoring methodology, and market verdict system are
                proprietary
              </li>
              <li>
                You may not reproduce or redistribute BOB&apos;s output for commercial purposes
              </li>
            </ul>
          </Section>

          <Section n={7} title="Limitation of Liability">
            <p style={{ color: TEXT }}>
              To the fullest extent permitted by law, SaaSylum and Boom or Bust are not liable for
              any indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits, data, or goodwill, arising from your use of the service. Our total liability
              for any claim related to the service is limited to the amount you paid us in the
              twelve months before the claim arose.
            </p>
          </Section>

          <Section n={8} title="Changes to Terms">
            <p style={{ color: TEXT }}>
              We may update these terms from time to time. Continued use of BOB after changes are
              posted constitutes acceptance of the updated terms.
            </p>
          </Section>

          <Section n={9} title="Contact">
            <p style={{ color: TEXT }}>
              For questions about these terms, contact us at{' '}
              <a
                href={`mailto:${CONTACT}`}
                className="underline underline-offset-2 transition hover:opacity-90"
                style={{ color: ACCENT }}
              >
                {CONTACT}
              </a>
              .
            </p>
          </Section>
        </div>

        <p className="mt-8 text-center text-[13px]" style={{ color: MUTED }}>
          <Link href="/" className="transition hover:opacity-80" style={{ color: ACCENT }}>
            ← Back to home
          </Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="transition hover:opacity-80" style={{ color: ACCENT }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
