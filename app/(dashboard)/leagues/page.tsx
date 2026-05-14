import Link from 'next/link';

/** Dedicated nav target for “Leagues”; full league hub remains on the dashboard. */
export default function LeaguesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10" style={{ background: '#0a0d14' }}>
      <h1
        className="text-white tracking-wide"
        style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', fontSize: 32 }}
      >
        Leagues
      </h1>
      <p className="mt-2 text-sm text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        Your league list and context switcher live on the main dashboard. Open the dashboard to pick a league; this
        route keeps the top nav “Leagues” item wired to a real URL.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#22D3EE] backdrop-blur-[24px] hover:bg-white/[0.06]"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        Go to dashboard →
      </Link>
    </div>
  );
}
