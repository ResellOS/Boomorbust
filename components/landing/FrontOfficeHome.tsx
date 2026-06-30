'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { LandingModal } from '@/components/landing/LandingModal';
import {
  arbitrage,
  comparisonRows,
  dashboardMetrics,
  exposures,
  featureGrid,
  flowSteps,
  matchups,
  myLeagues,
  pricingTiers,
  prospects,
  testimonials,
  type ArbRow,
  type Exposure,
  type LeagueHero,
  type Prospect,
} from '@/components/landing/frontOfficeData';

/** CTAs until Sleeper OAuth route exists (`/api/auth/sleeper`). */
function gotoImportFlow() {
  window.location.href = '/auth/signup';
}

export default function FrontOfficeHome() {
  const [navOpen, setNavOpen] = useState(false);
  const [leagueModal, setLeagueModal] = useState<LeagueHero | null>(null);
  const [matchupModal, setMatchupModal] = useState<(typeof matchups)[number] | null>(null);
  const [prospectModal, setProspectModal] = useState<Prospect | null>(null);
  const [exposureModal, setExposureModal] = useState<Exposure | null>(null);
  const [arbModal, setArbModal] = useState<ArbRow | null>(null);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setNavOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased selection:bg-teal-500/30 selection:text-teal-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <button
            type="button"
            onClick={() => scrollTo('hero')}
            className="font-bold tracking-tight text-slate-100 transition hover:text-white"
          >
            The Front Office
          </button>
          <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <button type="button" onClick={() => scrollTo('preview')} className="transition hover:text-white">
              Preview
            </button>
            <button type="button" onClick={() => scrollTo('feature-grid')} className="transition hover:text-white">
              Features
            </button>
            <button type="button" onClick={() => scrollTo('comparison')} className="transition hover:text-white">
              Compare
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="transition hover:text-white">
              Pricing
            </button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="hidden rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-white sm:inline-block"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={gotoImportFlow}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 transition hover:bg-teal-500"
            >
              Import My Leagues
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 md:hidden"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-label="Menu"
            >
              <ChevronDown className={clsx('h-5 w-5 transition', navOpen && 'rotate-180')} />
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <button type="button" className="py-2 text-left" onClick={() => scrollTo('preview')}>
                Preview
              </button>
              <button type="button" className="py-2 text-left" onClick={() => scrollTo('feature-grid')}>
                Features
              </button>
              <button type="button" className="py-2 text-left" onClick={() => scrollTo('comparison')}>
                Compare
              </button>
              <button type="button" className="py-2 text-left" onClick={() => scrollTo('pricing')}>
                Pricing
              </button>
              <Link href="/auth/login" className="py-2 text-slate-400">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 1 Hero */}
      <section id="hero" className="border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[2.6rem] lg:text-[2.75rem]">
            Manage All Your Fantasy Leagues Like a Portfolio.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
            Sync your Sleeper leagues and get personalized sit/start decisions, trade analysis, and strategy advice—built
            specifically for dynasty.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={gotoImportFlow}
              className="rounded-xl bg-teal-600 px-8 py-3.5 text-center text-sm font-bold text-white shadow-[0_0_40px_rgba(20,184,166,0.25)] transition hover:bg-teal-500"
            >
              Import My Leagues
            </button>
            <button
              type="button"
              onClick={() => scrollTo('feature-grid')}
              className="rounded-xl border border-slate-600 bg-slate-900/60 px-8 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Explore Features
            </button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>✓ 100% Free to Start</span>
            <span className="hidden sm:inline">·</span>
            <span>✓ No Credit Card Required</span>
            <span className="hidden sm:inline">·</span>
            <span>✓ Secure with Sleeper</span>
          </div>
        </div>
      </section>

      {/* 2 Dashboard preview cards */}
      <section id="preview" className="border-b border-slate-800 bg-slate-900 px-4 py-10 md:py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 md:gap-6">
          <div
            className="flex h-[100px] w-full max-w-[180px] flex-col justify-center rounded-xl border border-teal-500/30 bg-teal-950/50 px-4 py-3 shadow-inner"
            style={{ minWidth: 'min(100%, 180px)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-200/80">Week &amp; league edge</p>
            <p className="mt-1 text-2xl font-bold text-teal-100">{dashboardMetrics.weekEdge}</p>
            <p className="mt-0.5 text-[12px] leading-tight text-slate-500">Average projected advantage (PPR)</p>
          </div>
          <div
            className="flex h-[100px] w-full max-w-[180px] flex-col justify-center rounded-xl border border-blue-500/30 bg-blue-950/50 px-4 py-3"
            style={{ minWidth: 'min(100%, 180px)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200/80">Trade analyzer</p>
            <p className="mt-1 text-2xl font-bold text-blue-100">You&apos;re overpaying {dashboardMetrics.tradeOverpay}</p>
            <p className="mt-0.5 text-[12px] leading-tight text-slate-500">Transparency on every proposed trade</p>
          </div>
          <div
            className="flex h-[100px] w-full max-w-[180px] flex-col justify-center rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3"
            style={{ minWidth: 'min(100%, 180px)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-200/80">Roster health</p>
            <p className="mt-1 text-xl font-bold text-rose-100">
              {dashboardMetrics.rosterHealth.healthy} healthy · {dashboardMetrics.rosterHealth.out} out ·{' '}
              {dashboardMetrics.rosterHealth.suspended} suspended
            </p>
            <p className="mt-0.5 text-[12px] leading-tight text-slate-500">At-a-glance injury tracking</p>
          </div>
        </div>
      </section>

      {/* 3 My leagues carousel */}
      <section className="border-b border-slate-800 bg-slate-950 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 text-lg font-bold text-white md:text-xl">My Leagues ({myLeagues.length})</h2>
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {myLeagues.map((lg) => (
              <button
                key={lg.name}
                type="button"
                onClick={() => setLeagueModal(lg)}
                className="flex h-20 w-[140px] shrink-0 flex-col justify-center rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-left transition hover:border-slate-500 hover:bg-slate-800"
              >
                <p className="truncate text-sm font-semibold text-white">{lg.name}</p>
                <p className="truncate text-xs text-slate-500">{lg.standing}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Three-step flow */}
      <section className="border-b border-slate-800 bg-slate-900 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-lg font-bold text-white md:text-xl">
            From sync to dominance in 30 seconds
          </h2>
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-2">
            {flowSteps.map((s, i) => (
              <div key={s.n} className="flex w-full flex-col items-center md:w-auto md:flex-row md:items-center">
                <div
                  className={clsx(
                    'flex h-[100px] w-full max-w-[160px] flex-col justify-center rounded-xl border px-4 py-3 text-center md:text-left',
                    s.color
                  )}
                >
                  <span className="text-xs font-bold text-white/90">{s.n}</span>
                  <p className="mt-1 text-sm font-bold text-white">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-200/80">{s.body}</p>
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="my-2 flex items-center justify-center text-slate-500 md:my-0 md:mx-2 md:shrink-0">
                    <ArrowRight className="hidden h-6 w-6 md:block" aria-hidden />
                    <span className="md:hidden">↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Feature grid */}
      <section id="feature-grid" className="border-b border-slate-800 bg-slate-950 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-lg font-bold text-white md:text-xl">Everything you need to win</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureGrid.map((f) => (
              <div
                key={f.title}
                className={clsx(
                  'flex h-[100px] min-w-0 flex-col justify-center rounded-xl border px-4 text-center sm:min-w-[180px]',
                  f.color
                )}
              >
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="mt-1 text-xs text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Matchups */}
      <section className="border-b border-slate-800 bg-slate-900 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 text-lg font-bold text-white md:text-xl">Next week&apos;s matchups across all 6 leagues</h2>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40">
            {matchups.map((m) => (
              <button
                key={m.league}
                type="button"
                onClick={() => setMatchupModal(m)}
                className="flex w-full min-h-[60px] flex-col gap-1 border-b border-slate-700 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-slate-700/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="font-semibold text-teal-200/95">{m.league}</span>
                <span className="text-slate-300">
                  You ({m.you.rank === 1 ? '1st' : m.you.rank === 2 ? '2nd' : m.you.rank === 3 ? '3rd' : `${m.you.rank}th`}
                  , {m.you.pts.toFixed(1)} pts){' '}
                  <span className="text-slate-500">vs</span>{' '}
                  {m.opp.name} (
                  {m.opp.rank === 8 ? '8th' : m.opp.rank === 11 ? '11th' : `${m.opp.rank}th`}, {m.opp.pts.toFixed(1)} pts){' '}
                  <span className="font-medium text-teal-400">— +{m.edge.toFixed(1)} edge</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Draft class */}
      <section className="border-b border-slate-800 bg-slate-950 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 text-lg font-bold text-white md:text-xl">Upcoming draft class — top 10 prospects</h2>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80">
            {prospects.map((p) => (
              <button
                key={p.rank}
                type="button"
                onClick={() => setProspectModal(p)}
                className="flex w-full min-h-[50px] items-center justify-between gap-3 border-b border-slate-700 px-4 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-slate-800/70"
              >
                <span className="font-medium text-white">
                  {p.rank}. {p.name}{' '}
                  <span className="text-slate-500">({p.pos})</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  Score: <span className="text-teal-300">{p.score}</span> · ADP:{' '}
                  <span className="text-slate-300">{p.adp}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Portfolio analytics */}
      <section className="border-b border-slate-800 bg-slate-900 px-4 py-10 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:gap-12">
          <div className="min-w-0 max-w-none md:max-w-[320px] lg:max-w-none">
            <h3 className="mb-4 text-base font-bold text-white md:text-lg">Your cross-league exposures</h3>
            <ul className="space-y-3">
              {exposures.map((e) => (
                <li key={e.player}>
                  <button
                    type="button"
                    onClick={() => setExposureModal(e)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-left text-sm transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    <p className="font-semibold text-white">
                      {e.player}: {e.leagues} of {e.total} leagues ({e.pct}%) ⚠️ high exposure
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Tap for diversification playbook</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 max-w-none md:max-w-[320px] lg:max-w-none">
            <h3 className="mb-4 text-base font-bold text-white md:text-lg">Value mismatches: market vs. our model</h3>
            <ul className="space-y-3">
              {arbitrage.map((a) => (
                <li key={a.player}>
                  <button
                    type="button"
                    onClick={() => setArbModal(a)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-left text-sm transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    <p className="font-semibold text-white">{a.player}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      KTC ~ {a.ktc}, we say ~ {a.ours}{' '}
                      <span
                        className={clsx('ml-2 font-bold', a.signal === 'BUY' ? 'text-teal-400' : 'text-amber-400')}
                      >
                        — {a.signal} at {a.signal === 'BUY' ? 'discount' : 'premium'}
                      </span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 9 Comparison */}
      <section id="comparison" className="border-b border-slate-800 bg-slate-950 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-lg font-bold text-white md:text-xl">Most tools give rankings. We give decisions.</h2>
          <p className="mb-6 text-sm text-slate-500">Why choose The Front Office?</p>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90">
                  <th className="p-4 font-semibold text-slate-200">Feature</th>
                  <th className="p-4 text-slate-500">Other tools</th>
                  <th className="p-4 text-slate-500">KTC</th>
                  <th className="p-4 text-slate-500">Dynasty Nerds</th>
                  <th className="p-4 font-semibold text-teal-400">The Front Office</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={clsx('border-b border-slate-800/80', i % 2 === 1 ? 'bg-slate-900/40' : '')}>
                    <td className="p-4 font-medium text-slate-200">{row.feature}</td>
                    <td className="p-4 text-slate-500">{row.other}</td>
                    <td className="p-4 text-slate-500">{row.ktc}</td>
                    <td className="p-4 text-slate-500">{row.nerds}</td>
                    <td className="p-4 text-teal-300">{row.tfo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 10 Trust score */}
      <section className="border-b border-slate-800 bg-slate-900 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/60 to-slate-900 px-8 py-10 text-center">
          <p className="text-5xl font-bold tracking-tight text-amber-200 md:text-[3rem]">82.5%</p>
          <p className="mt-4 text-lg font-semibold text-amber-100/95">Trade prediction accuracy (2000–2026)</p>
          <p className="mt-2 text-sm text-slate-400">
            Our scouting model beats expert consensus by 28 percentage points in back-tested samples.
          </p>
        </div>
      </section>

      {/* 11 Testimonials */}
      <section className="border-b border-slate-800 bg-slate-950 px-4 py-10 md:py-14">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 md:justify-between">
          {testimonials.map((t) => (
            <blockquote
              key={t.author}
              className="flex h-auto min-h-[140px] w-full max-w-[190px] flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:-translate-y-1 hover:border-slate-600 sm:w-[calc(33.333%-11px)]"
            >
              <div className="mb-3 h-8 w-8 rounded-full bg-slate-700" aria-hidden />
              <p className="text-xs leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-auto pt-3 text-[12px] text-slate-500">
                <cite className="not-italic font-semibold text-slate-400">— {t.author}</cite>
                <p className="mt-1">{t.subtext}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* 12 Pricing */}
      <section id="pricing" className="border-b border-slate-800 bg-slate-900 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-center text-lg font-bold text-white md:text-xl">Start free. Upgrade when you&apos;re ready.</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.tier}
                className={clsx(
                  'relative flex min-h-[200px] w-full max-w-[200px] flex-col rounded-2xl border border-slate-700/80 p-5 pt-8',
                  tier.bg
                )}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{tier.tier}</p>
                <p className="mt-3 text-2xl font-bold text-white">{tier.priceLabel}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs text-slate-400">
                  {tier.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={gotoImportFlow}
                  className={clsx('mt-4 w-full rounded-xl py-2.5 text-sm font-bold', tier.buttonClass)}
                >
                  {tier.tier === 'Free' ? 'Start free' : `Choose ${tier.tier}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">The Front Office</p>
            <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-slate-500">Manage your dynasty like a front office.</p>
            <p className="mt-4 text-[12px] text-slate-600">© 2026 The Front Office. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] text-slate-500 md:justify-end">
            <Link href="/terms" className="transition hover:text-slate-300">
              Terms of Service
            </Link>
            <a href="#privacy" className="transition hover:text-slate-300">
              Privacy Policy
            </a>
            <a href="mailto:hello@thefrontoffice.app" className="transition hover:text-slate-300">
              Contact
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-300">
              Twitter
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-300">
              Discord
            </a>
          </div>
        </div>
      </footer>

      <LandingModal isOpen={!!leagueModal} onClose={() => setLeagueModal(null)} title={leagueModal ? `${leagueModal.name} Overview` : ''}>
        {leagueModal && (
          <div className="space-y-3">
            <p>
              <span className="font-semibold text-slate-900">Record:</span>{' '}
              <span className="text-slate-700">{leagueModal.record}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">Standing:</span>{' '}
              <span className="text-slate-700">{leagueModal.standing}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">Next matchup:</span>{' '}
              <span className="text-slate-700">{leagueModal.nextOpponent}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">Format:</span>{' '}
              <span className="text-slate-700">{leagueModal.format}</span>
            </p>
          </div>
        )}
      </LandingModal>

      <LandingModal
        isOpen={!!matchupModal}
        onClose={() => setMatchupModal(null)}
        title={matchupModal ? `${matchupModal.league} scouting` : ''}
      >
        {matchupModal && (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Opponent top starters (illustrative)</p>
            <p>{matchupModal.detail.starters}</p>
            <div>
              <p className="font-semibold text-slate-900">Injuries</p>
              <p>{matchupModal.detail.injuries}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Position strength</p>
              <p>{matchupModal.detail.positionStrength}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Your edge</p>
              <p>{matchupModal.detail.yourEdge}</p>
            </div>
          </div>
        )}
      </LandingModal>

      <LandingModal
        isOpen={!!prospectModal}
        onClose={() => setProspectModal(null)}
        title={prospectModal ? `${prospectModal.name} — breakdown` : ''}
      >
        {prospectModal && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">Why we like him</p>
              <p>{prospectModal.detail.why}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Recent data</p>
              <p>{prospectModal.detail.recent}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">ADP vs our rank</p>
              <p>{prospectModal.detail.adpVsRank}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Your playbook</p>
              <p>{prospectModal.detail.playbook}</p>
            </div>
          </div>
        )}
      </LandingModal>

      <LandingModal isOpen={!!exposureModal} onClose={() => setExposureModal(null)} title={exposureModal ? `${exposureModal.player} exposure` : ''}>
        {exposureModal && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">You own {exposureModal.player.split('·')[0]} in</p>
              <p>{exposureModal.detail.leaguesList}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Risk</p>
              <p>{exposureModal.detail.risk}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Mitigation</p>
              <p>{exposureModal.detail.mitigation}</p>
            </div>
          </div>
        )}
      </LandingModal>

      <LandingModal isOpen={!!arbModal} onClose={() => setArbModal(null)} title={arbModal ? `${arbModal.player} — market gap` : ''}>
        {arbModal && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">Why we differ</p>
              <p>{arbModal.detail.why}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Our thesis</p>
              <p>{arbModal.detail.thesis}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Trade opportunity</p>
              <p>{arbModal.detail.trade}</p>
            </div>
          </div>
        )}
      </LandingModal>
    </div>
  );
}
