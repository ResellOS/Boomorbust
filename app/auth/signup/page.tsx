'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignUpPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-2">The Front Office</h1>
        <p className="text-[#94A3B8] text-center mb-8">Manage your dynasty like a front office.</p>

        <div className="bg-[#1A2332] border border-white/5 rounded-xl p-8">
          {success ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: '#22D3EE' }}>
                Account created! Check your email to confirm your address.
              </p>
              <Link href="/auth/login" className="text-[#6366F1] hover:underline text-sm">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-[#CBD5E1] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] transition text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-[#CBD5E1] mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] transition text-sm"
                  placeholder="Min 6 characters"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-center text-sm text-[#94A3B8]">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-[#6366F1] hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
