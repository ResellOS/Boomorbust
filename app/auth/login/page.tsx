'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { triggerAutoSync } from '@/lib/sync/autoSync';
import LightningCanvas from '@/components/LightningCanvas';

const LIGHTNING_CSS = `
@keyframes glow-breathe {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.12); }
}
@keyframes particle-rise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  12% { opacity: 0.8; }
  88% { opacity: 0.4; }
  100% { transform: translateY(-90vh) translateX(24px); opacity: 0; }
}
.glow-blob { animation: glow-breathe 6s ease-in-out infinite; }
.particle { animation: particle-rise linear infinite; }
`;

function LightningBackground() {
  const particles = [
    { left: '8%', size: 3, dur: 14, delay: 0, color: '#36E7A1' },
    { left: '16%', size: 2, dur: 18, delay: 4, color: '#36E7A1' },
    { left: '27%', size: 2, dur: 16, delay: 8, color: '#36E7A1' },
    { left: '41%', size: 2, dur: 20, delay: 2, color: '#36E7A1' },
    { left: '58%', size: 2, dur: 17, delay: 6, color: '#A78BFA' },
    { left: '72%', size: 3, dur: 15, delay: 10, color: '#A78BFA' },
    { left: '84%', size: 2, dur: 19, delay: 1, color: '#A78BFA' },
    { left: '93%', size: 2, dur: 13, delay: 7, color: '#A78BFA' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Ambient glows */}
      <div
        className="glow-blob absolute -left-[15%] top-[5%] h-[70vh] w-[55vw] rounded-full"
        style={{ background: 'radial-gradient(ellipse at center, rgba(54,231,161,0.14) 0%, transparent 65%)' }}
      />
      <div
        className="glow-blob absolute -right-[15%] top-[10%] h-[75vh] w-[55vw] rounded-full"
        style={{ background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.16) 0%, transparent 65%)', animationDelay: '3s' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-[40vh]"
        style={{ background: 'linear-gradient(to top, rgba(54,231,161,0.05) 0%, transparent 60%)' }}
      />

      {/* Procedural canvas lightning — green left, purple right */}
      <LightningCanvas mode="ambient" />

      {/* Energy particles */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(10,13,20,0.85) 100%)' }}
      />
    </div>
  );
}

function GhostPanelLeft() {
  const players = [
    { name: 'Justin Jefferson', meta: 'WR · MIN', score: '94.7', badge: 'STRONG BOOM' },
    { name: 'Breece Hall', meta: 'RB · NYJ', score: '76.3', badge: 'HOLD' },
    { name: 'CeeDee Lamb', meta: 'WR · DAL', score: '89.1', badge: 'BOOM' },
    { name: 'Bijan Robinson', meta: 'RB · ATL', score: '71.3', badge: 'HOLD' },
    { name: 'Kyle Pitts', meta: 'TE · ATL', score: '48.7', badge: 'STRONG BUST' },
  ];
  return (
    <div className="pointer-events-none absolute left-6 top-1/2 hidden w-[230px] -translate-y-1/2 flex-col gap-4 opacity-[0.15] xl:flex" aria-hidden>
      <div className="rounded-lg border border-boom/40 bg-surface p-3">
        <div className="mb-2 text-[8px] uppercase tracking-[2px] text-boom">Top Boom Players</div>
        {players.map((p) => (
          <div key={p.name} className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-b-0">
            <div className="h-5 w-5 shrink-0 rounded-full bg-surface2" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[9px] text-text">{p.name}</div>
              <div className="text-[7px] text-muted">{p.meta}</div>
            </div>
            <span className="font-mono text-[10px] text-text">{p.score}</span>
            <span className="rounded-sm bg-boom/10 px-1 py-0.5 text-[6px] font-semibold text-boom">{p.badge}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-boom/40 bg-surface p-3">
        <div className="mb-2 text-[8px] uppercase tracking-[2px] text-boom">BOB Confidence Score</div>
        <div className="relative mx-auto h-[90px] w-[90px]">
          <svg viewBox="0 0 90 90" className="h-full w-full">
            <circle cx="45" cy="45" r="38" fill="none" stroke="#1e2640" strokeWidth="6" />
            <circle cx="45" cy="45" r="38" fill="none" stroke="#36E7A1" strokeWidth="6" strokeDasharray="208 240" strokeLinecap="round" transform="rotate(-90 45 45)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg text-text">87%</span>
            <span className="text-[6px] uppercase text-muted">Model Confidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GhostPanelRight() {
  const targets = [
    { name: 'Amon-Ra St. Brown', meta: 'WR · DET', score: '84.2' },
    { name: 'Garrett Wilson', meta: 'WR · NYJ', score: '78.6' },
    { name: 'Drake London', meta: 'WR · ATL', score: '76.1' },
  ];
  return (
    <div className="pointer-events-none absolute right-6 top-1/2 hidden w-[230px] -translate-y-1/2 flex-col gap-4 opacity-[0.15] xl:flex" aria-hidden>
      <div className="rounded-lg border border-bust/40 bg-surface p-3">
        <div className="mb-2 text-[8px] uppercase tracking-[2px] text-muted">League Overview</div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-boom to-bust" />
          <div className="flex-1">
            <div className="text-[9px] text-text">Dynasty Alpha</div>
            <div className="text-[7px] text-muted">12 Teams · Superflex · PPR</div>
          </div>
          <span className="rounded-sm bg-boom/10 px-1.5 py-0.5 text-[6px] text-boom">Contender</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center">
          {[
            ['8-3', 'Record'],
            ['1412.6', 'Points For'],
            ['1.8', 'Proj Finish'],
            ['94%', 'Playoff Odds'],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="font-mono text-[10px] text-boom">{v}</div>
              <div className="text-[6px] uppercase text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-bust/40 bg-surface p-3">
        <div className="mb-2 text-[8px] uppercase tracking-[2px] text-muted">Trade Opportunities</div>
        {targets.map((t) => (
          <div key={t.name} className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-b-0">
            <div className="h-5 w-5 shrink-0 rounded-full bg-surface2" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[9px] text-text">{t.name}</div>
              <div className="text-[7px] text-muted">{t.meta}</div>
            </div>
            <span className="font-mono text-[10px] text-text">{t.score}</span>
            <span className="rounded-sm border border-boom/30 bg-boom/10 px-1 py-0.5 text-[6px] text-boom">TARGET</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-bust/40 bg-surface p-3">
        <div className="mb-1 text-[8px] uppercase tracking-[2px] text-muted">Weeks Ahead Signal</div>
        <div className="flex items-end justify-between">
          <div>
            <span className="font-mono text-xl text-boom">3</span>
            <span className="ml-1 text-[8px] text-text">Weeks</span>
            <div className="text-[6px] text-muted">Ahead of the Field</div>
          </div>
          <svg viewBox="0 0 80 30" className="h-7 w-20">
            <polyline points="2,26 14,22 26,24 38,16 50,18 62,9 78,4" fill="none" stroke="#36E7A1" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SleeperIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2C8.5 2 5.7 4.6 5.7 8c0 1.6.7 3 1.7 4.1-1.9 1.2-3.2 3.3-3.2 5.7C4.2 20.1 5.9 22 8 22h8c2.1 0 3.8-1.9 3.8-4.2 0-2.4-1.3-4.5-3.2-5.7 1-1.1 1.7-2.5 1.7-4.1C18.3 4.6 15.5 2 12 2zm0 3c1.8 0 3.3 1.4 3.3 3S13.8 11 12 11 8.7 9.6 8.7 8 10.2 5 12 5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.43-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.43C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams?.get('error') === 'oauth' ? 'Social sign-in failed. Try again or use email.' : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      triggerAutoSync();
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg font-figtree text-text">
      <style dangerouslySetInnerHTML={{ __html: LIGHTNING_CSS }} />
      <LightningBackground />
      <GhostPanelLeft />
      <GhostPanelRight />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <div className="mb-2 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Boom or Bust"
            width={340}
            height={120}
            priority
            unoptimized
            className="h-auto w-[280px] object-contain sm:w-[340px]"
            style={{
              mixBlendMode: 'screen',
              filter:
                'drop-shadow(0 0 30px rgba(54,231,161,0.6)) drop-shadow(0 0 60px rgba(167,139,250,0.4))',
            }}
          />
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[4px] text-text/80">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-boom" />
            The Dynasty
            <span className="text-boom">⚡</span>
            War Room
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-bust" />
          </div>
        </div>

        {/* Glass card */}
        <div
          className="mt-8 w-full max-w-[400px] rounded-xl border border-white/10 p-7"
          style={{
            background: 'rgba(15,20,32,0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 40px rgba(54,231,161,0.08), 0 0 80px rgba(167,139,250,0.06)',
          }}
        >
          <h1 className="text-center text-sm font-bold uppercase tracking-[2px] text-boom">
            Welcome Back, Champion
          </h1>
          <p className="mb-6 mt-1.5 text-center text-[11px] text-muted">
            Log in to your Boom or Bust account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[1.5px] text-muted">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boom" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-boom/50 bg-bg/70 py-2.5 pl-9 pr-3 text-xs text-text placeholder-muted/60 outline-none transition focus:border-boom focus:shadow-[0_0_12px_rgba(54,231,161,0.25)]"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-[9px] font-semibold uppercase tracking-[1.5px] text-muted">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-[10px] text-bust no-underline hover:text-bust/80">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bust" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••••••••"
                  className="w-full rounded-md border border-bust/50 bg-bg/70 py-2.5 pl-9 pr-3 text-xs text-text placeholder-muted/60 outline-none transition focus:border-bust focus:shadow-[0_0_12px_rgba(167,139,250,0.25)]"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-[#ef4444]/25 bg-[#ef4444]/10 px-3 py-2 text-[11px] text-[#ef4444]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold uppercase tracking-[1.5px] text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #36E7A1 0%, #A78BFA 100%)',
                boxShadow: '0 0 20px rgba(54,231,161,0.35), 0 0 30px rgba(167,139,250,0.2)',
              }}
            >
              {loading ? 'Signing In…' : 'Sign In'}
              <span aria-hidden>⚡</span>
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] uppercase tracking-[2px] text-muted">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-2">
            <Link
              href="/auth/signup?via=sleeper"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-bg/60 py-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-text no-underline transition hover:border-boom/40 hover:bg-bg/80"
            >
              <SleeperIcon />
              Sign In with Sleeper
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-2 rounded-md border border-white/15 bg-bg/60 py-2.5 text-[11px] font-semibold text-text transition hover:border-white/30 hover:bg-bg/80"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('apple')}
                className="flex items-center justify-center gap-2 rounded-md border border-white/15 bg-bg/60 py-2.5 text-[11px] font-semibold text-text transition hover:border-white/30 hover:bg-bg/80"
              >
                <AppleIcon />
                Apple
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted">
            New to Boom or Bust?{' '}
            <Link href="/auth/signup" className="font-semibold text-boom no-underline hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Trust bar */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4">
          {[
            ['🔒', '256-bit Encrypted'],
            ['✓', '42-18-2 Verified Record'],
            ['🏈', '68+ Leagues Synced'],
            ['⚡', 'BOB-POWERED Analytics'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-1.5 text-[10px] text-muted">
              <span aria-hidden>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
