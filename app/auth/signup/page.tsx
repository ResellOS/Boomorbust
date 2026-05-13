'use client';

import { useState } from 'react';
import Link from 'next/link';

const TWITTER_HREF = process.env.NEXT_PUBLIC_TWITTER_URL ?? 'https://x.com';

export default function SignUpPage() {
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
        body: JSON.stringify({ email }),
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#060910' }}>
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-full2.png"
          height={48}
          alt="Boom or Bust"
          className="mx-auto mb-10 h-12 w-auto"
          style={{ width: 'auto' }}
        />
        <h1
          className="text-white uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 52,
            letterSpacing: '0.03em',
            lineHeight: 1.05,
          }}
        >
          WE&apos;RE ALMOST READY
        </h1>
        <p
          className="mt-6 max-w-[480px] text-[14px] leading-relaxed text-[#94A3B8] mx-auto"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Boom or Bust is putting the final touches on the most advanced dynasty intelligence platform ever built.
        </p>

        {success ? (
          <p className="mt-10 text-[15px] text-[#36E7A1] font-mono">You&apos;re on the list. 🚀</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 w-full max-w-md flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-[48px] flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] shrink-0 rounded-xl bg-[#6366F1] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#5254cc] disabled:opacity-50 font-mono whitespace-nowrap"
            >
              {loading ? '…' : 'NOTIFY ME ON LAUNCH'}
            </button>
          </form>
        )}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-12 w-full max-w-md text-center">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[#64748B] font-mono">
            Follow for weekly player predictions:
          </p>
          <div className="mt-3 flex justify-center">
            <a
              href={TWITTER_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-[20px] px-[14px] py-[6px] text-[11px] font-mono transition hover:opacity-90"
              style={{
                color: '#22D3EE',
                border: '1px solid rgba(34,211,238,0.2)',
                fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
              }}
            >
              𝕏 @YourHandle
            </a>
          </div>
        </div>

        <p className="mt-14 text-[13px] text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-[#22D3EE] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
