'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const BG = '#0a0d14';
const BOOM = '#36E7A1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <svg width={36} height={40} viewBox="0 0 36 40" className="mx-auto mb-4">
            <polygon points="18,2 33,11 33,29 18,38 3,29 3,11" fill="rgba(255,255,255,0.02)" stroke="#22D3EE" strokeWidth={1.25} strokeLinejoin="round" />
            <path fill={BOOM} d="M19.5 9.5L14 20h4.2l-2.1 10.5L24 17.2h-3.8l2.3-7.7z" style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.75))' }} />
          </svg>
          <h1 className="text-[22px] font-bold text-white" style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}>
            Reset Password
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            Enter your email to receive a reset link
          </p>
        </div>

        <div
          className="rounded-xl border border-white/[0.08] p-6"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(24px)' }}
        >
          {sent ? (
            <div className="text-center py-4">
              <p className="text-[28px]">📬</p>
              <p className="mt-3 text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                Check your email
              </p>
              <p className="mt-1 text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                We sent a reset link to <span className="text-white">{email}</span>
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg px-6 text-[13px] font-semibold text-[#22D3EE] hover:underline"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#94A3B8] mb-1.5" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white placeholder-[#475569] outline-none transition focus:border-[#22D3EE]/50"
                  style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-[12px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[44px] w-full items-center justify-center rounded-lg text-[13px] font-semibold text-[#0a0d14] transition disabled:opacity-60"
                style={{ background: BOOM, fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/auth/login"
                  className="text-[12px] text-[#64748B] hover:text-white transition"
                  style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
