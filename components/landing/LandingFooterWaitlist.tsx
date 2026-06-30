'use client';

import { useState } from 'react';

export default function LandingFooterWaitlist() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing-footer-cta' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-t border-white/[0.06] px-4 py-12 sm:px-6 sm:py-16 lg:px-12 lg:py-[72px]" style={{ background: '#0a0d14' }}>
      <div className="mx-auto max-w-[720px] text-center">
        <h2
          className="text-[clamp(1.5rem,8vw,3.25rem)] leading-[0.95] text-white uppercase"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}
        >
          STOP GUESSING. START WINNING.
        </h2>
        <p
          className="mt-3 text-[clamp(1.75rem,9vw,3.25rem)] leading-none uppercase sm:mt-4 lg:text-[52px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span style={{ color: '#3ECFAD' }}>BOOM</span>
          <span style={{ color: '#EF4444' }}> OR BUST</span>
        </p>

        {success ? (
          <p className="mt-10 text-[16px] text-[#3ECFAD]" style={{ fontFamily: 'var(--font-body)' }}>
            You&apos;re on the list. 🚀
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex w-full max-w-[480px] flex-col gap-3 sm:mt-10 sm:flex-row sm:items-stretch">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[48px] flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              style={{ fontFamily: 'var(--font-body)' }}
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] shrink-0 rounded-xl px-6 py-3 text-[14px] font-bold text-[#0a0d14] transition-opacity hover:opacity-95 disabled:opacity-50 whitespace-nowrap uppercase tracking-wide"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'linear-gradient(135deg, #3ECFAD, #22D3EE)',
              }}
            >
              {loading ? '…' : 'GET EARLY ACCESS →'}
            </button>
          </form>
        )}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </div>
    </section>
  );
}
