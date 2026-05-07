'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProjectionCard from '@/components/cards/ProjectionCard';
import type { ProjectionCardData } from '@/app/api/cards/projection/route';
import { espnNflLogoUrl } from '@/lib/nfl/espnTeam';

const BG = '#060910';

const SAMPLE_CARD: ProjectionCardData = {
  playerId: '6794',
  playerName: "Ja'Marr Chase",
  position: 'WR',
  team: 'CIN',
  week: 14,
  tfoScore: 91,
  grade: 'ELITE',
  verdict: 'START',
  startScore: 94,
  projLow: 18,
  projHigh: 28,
  opponent: 'PIT',
  matchupGrade: 82,
  weatherCondition: 'Dome',
  weatherTemp: 72,
  flags: ['ELITE_OPPORTUNITY', 'RZ_MONSTER'],
  reasoning: 'Elite opportunity in scheme that maximizes this profile — buy window is open',
  verdictColor: '#36E7A1',
  gradeColor: '#36E7A1',
  brandTag: 'thefrontoffice.app',
  matchupLabel: 'vs PIT',
  weatherIcon: '🏟️',
  caption:
    "Ja'Marr Chase is a LOCK this week. TFO 91 | 18-28 pts proj | thefrontoffice.app",
};

const FEATURES = [
  {
    icon: '📊',
    title: 'WEEKLY PROJECTIONS',
    body:
      'Stat line projections for every player — yards, TDs, fantasy points. Powered by TFO formula + live matchup data.',
  },
  {
    icon: '🌦️',
    title: 'MATCHUP + WEATHER',
    body:
      'Opponent defensive grade, game weather, and stadium context built into every projection.',
  },
  {
    icon: '📤',
    title: 'ONE-TAP SHARE',
    body: 'Export any card as a PNG. Share directly to X. Look like the sharpest manager in your group chat.',
  },
] as const;

export default function BoomOrBustComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Try again.');
        return;
      }
      setSuccess(true);
      setEmail('');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const chasePhoto = 'https://sleepercdn.com/content/nfl/players/6794.jpg';
  const cinLogo = espnNflLogoUrl('CIN') ?? undefined;

  return (
    <div className="min-h-screen antialiased" style={{ background: BG, color: '#f8fafc' }}>
      <main className="mx-auto max-w-[900px] px-6 py-16 sm:px-12 sm:py-[80px] lg:px-[48px]">
        {/* HERO */}
        <section>
          <span
            className="inline-block rounded-[20px] border px-4 py-1.5 text-[11px] font-bold font-mono-tactical uppercase tracking-[0.15em]"
            style={{
              background: 'rgba(251,191,36,0.1)',
              borderColor: 'rgba(251,191,36,0.25)',
              color: '#FBBF24',
            }}
          >
            COMING SOON
          </span>

          <h1
            className="mt-6 text-white uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 6vw, 72px)',
              lineHeight: 0.95,
              letterSpacing: '0.03em',
            }}
          >
            <span className="block">
              WEEKLY{' '}
              <span style={{ color: '#36E7A1' }}>BOOM</span>
              <span className="text-white"> OR </span>
              <span style={{ color: '#EF4444' }}>BUST</span>
            </span>
            <span className="block mt-1">PROJECTION CARDS</span>
          </h1>

          <p
            className="mt-5 max-w-[560px] text-base leading-relaxed"
            style={{ color: '#94A3B8', fontFamily: 'var(--font-body)' }}
          >
            Sharp weekly projections for every player on your roster. One tap to share on X. Built to make you look
            like the sharpest manager in the room.
          </p>
        </section>

        {/* SAMPLE CARD */}
        <section className="mt-14 flex justify-center">
          <div className="relative inline-block max-w-full overflow-x-auto pb-2">
            <div
              className="relative mx-auto scale-[0.92] sm:scale-100 origin-top"
              style={{ width: 480, maxWidth: 'min(480px, 100vw - 32px)' }}
            >
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                <span
                  className="select-none text-white/[0.2] whitespace-nowrap"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 48,
                    transform: 'rotate(-20deg)',
                  }}
                >
                  SAMPLE
                </span>
              </div>
              <ProjectionCard
                data={SAMPLE_CARD}
                playerImageUrl={chasePhoto}
                teamLogoUrl={cinLogo}
                showShareButton
              />
            </div>
          </div>
        </section>

        {/* EMAIL */}
        <section className="mt-16 max-w-xl mx-auto text-center sm:text-left">
          <h2 className="display text-[28px] text-white tracking-wide">GET NOTIFIED AT LAUNCH</h2>
          <p className="mt-2 text-sm" style={{ color: '#94A3B8', fontFamily: 'var(--font-body)' }}>
            Be first to know when weekly projection cards go live.
          </p>

          {success ? (
            <p className="mt-6 text-sm font-medium" style={{ color: '#36E7A1', fontFamily: 'var(--font-body)' }}>
              You&apos;re on the list! We&apos;ll notify you at launch. 🚀
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-start"
            >
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="min-w-0 flex-1 rounded-[10px] border px-4 py-3 text-sm outline-none transition-colors sm:min-w-[280px]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: '#e2e8f0',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#36E7A1';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 rounded-[10px] px-6 py-3 text-sm font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
                  color: BG,
                  border: 'none',
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {submitting ? 'Saving…' : 'Notify Me'}
              </button>
            </form>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </section>

        {/* FEATURES */}
        <section className="mt-20">
          <h3 className="display text-xl text-white tracking-[0.12em] mb-4">WHAT&apos;S COMING</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-panel rounded-xl p-5" style={{ borderRadius: 12 }}>
                <div className="mb-3 text-[32px] leading-none" aria-hidden>
                  {f.icon}
                </div>
                <p className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  {f.title}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#94A3B8', fontFamily: 'var(--font-body)' }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <footer className="mt-20 border-t border-white/[0.06] pt-10 text-center">
          <p className="text-sm" style={{ color: '#94A3B8', fontFamily: 'var(--font-body)' }}>
            Already have an account?
          </p>
          <Link
            href="/dashboard/lineup"
            className="mt-2 inline-block text-sm font-mono-tactical font-semibold text-[#22D3EE] hover:text-[#67E8F9] transition-colors"
          >
            Go to Lineup Optimizer →
          </Link>
        </footer>
      </main>
    </div>
  );
}
