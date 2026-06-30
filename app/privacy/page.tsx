import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Boom or Bust' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: '#0a0d14' }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[#64748B]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            Legal
          </p>
          <h1
            className="mt-1 text-[32px] font-bold text-white"
            style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
          >
            Privacy Policy
          </h1>
          <p className="mt-2 text-[14px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            Last updated: June 22, 2026
          </p>
        </div>

        <div
          className="rounded-xl border border-white/[0.08] p-8 space-y-8"
          style={{ background: 'rgba(255,255,255,0.02)', fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          <Section title="1. Information We Collect">
            <p>We collect information you provide directly: email address, Sleeper username, and fantasy league data synced from Sleeper. We also collect usage data and analytics to improve the product.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information to provide and improve the Boom or Bust service, send weekly digest emails (if opted in), and calculate dynasty analytics. We do not sell your personal data to third parties.</p>
          </Section>

          <Section title="3. Data from Sleeper">
            <p>When you connect your Sleeper account, we access your roster data, league information, and trade history via the Sleeper API. This data is used exclusively to power your dynasty analytics within Boom or Bust.</p>
          </Section>

          <Section title="4. Data Storage and Security">
            <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security. All data is encrypted in transit. We use industry-standard security practices to protect your information.</p>
          </Section>

          <Section title="5. Cookies and Analytics">
            <p>We use cookies for authentication (Supabase session) and basic analytics (Vercel Analytics). We do not use third-party advertising cookies.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data by emailing support@boomorbust.app.</p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>We use the following third-party services: Supabase (database), Vercel (hosting), Stripe (payments), Resend (email), and Anthropic (AI analysis). Each maintains their own privacy practices.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to access, correct, or delete your personal data. Contact us at support@boomorbust.app for any data requests.</p>
          </Section>

          <Section title="9. Contact">
            <p>For privacy questions: <a href="mailto:support@boomorbust.app" className="text-[#22D3EE] hover:underline">support@boomorbust.app</a></p>
          </Section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[13px] text-[#64748B] hover:text-white transition"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        className="text-[16px] font-semibold text-white mb-2"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        {title}
      </h2>
      <div className="text-[14px] text-[#94A3B8] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}
