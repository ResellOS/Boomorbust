'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BillingInterval, DisplayTierId, PaidTierId } from '@/lib/stripe/pricing';
import { ENGINE_TAGS, FAQ_ITEMS, FEATURE_TABLE } from '@/lib/pricing/content';

interface PriceConfig {
  league_analyst: { month: string | null; year: string | null };
  general_manager: { month: string | null; year: string | null };
  all_pro: { month: string | null; year: string | null };
}

interface PricingPageClientProps {
  currentTier: DisplayTierId;
  isLoggedIn: boolean;
  hasStripeCustomer: boolean;
  foundingSpotsRemaining: number;
  earlyAccessTier: 'founding' | 'early' | 'launch';
  priceIds: PriceConfig;
}

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) return <span className="text-boom">✓</span>;
  if (v === false) return <span className="text-[#ef4444]">✗</span>;
  if (v === 'Unlimited') return <span className="text-boom">Unlimited</span>;
  if (v === 'Yes') return <span className="text-hold">Yes</span>;
  if (v === 'No') return <span className="text-boom">No</span>;
  if (v === '1 free/yr') return <span className="text-boom">1 free/yr</span>;
  return <span className="text-muted">{v}</span>;
}

export default function PricingPageClient({
  currentTier,
  isLoggedIn,
  hasStripeCustomer,
  foundingSpotsRemaining,
  earlyAccessTier,
  priceIds,
}: PricingPageClientProps) {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingInterval>('month');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthlyPrices = { free: 0, league_analyst: 5, general_manager: 15, all_pro: 35 };
  const annualPrices = { free: 0, league_analyst: 50, general_manager: 150, all_pro: 350 };

  async function checkout(tier: PaidTierId) {
    const priceId = priceIds[tier][billing === 'year' ? 'year' : 'month'];
    if (!priceId) {
      setError('This billing option is not configured yet. Try monthly billing.');
      return;
    }
    if (!isLoggedIn) {
      router.push('/auth/login?redirect=/pricing');
      return;
    }
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: '/dashboard?upgraded=true',
          cancelUrl: '/pricing',
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? 'Checkout failed');
    } catch {
      setError('Checkout failed');
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/pricing' }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? 'Could not open billing portal');
    } catch {
      setError('Could not open billing portal');
    } finally {
      setLoading(null);
    }
  }

  function priceDisplay(tier: DisplayTierId) {
    const p = billing === 'year' ? annualPrices[tier] : monthlyPrices[tier];
    return p;
  }

  function isCurrent(tier: DisplayTierId) {
    return isLoggedIn && currentTier === tier;
  }

  return (
    <div className="min-h-screen bg-bg font-figtree text-text">
      <nav className="sticky top-0 z-50 flex h-[52px] items-center justify-between border-b border-border bg-surface px-9">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Boom or Bust"
            width={140}
            height={34}
            unoptimized
            className="h-[34px] w-auto object-contain"
            style={{ mixBlendMode: 'screen', filter: 'brightness(1.2) saturate(1.3) contrast(1.1)' }}
          />
        </Link>
        <div className="hidden items-center gap-[26px] md:flex">
          {[
            { label: 'Features', href: '/#features' },
            { label: 'Pricing', href: '/pricing', active: true },
            { label: 'Proof', href: '/#proof' },
            { label: 'About', href: '/#about' },
            { label: 'Blog', href: '/#blog' },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`text-xs no-underline ${l.active ? 'text-boom' : 'text-muted hover:text-text'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="flex h-[30px] items-center rounded border border-border px-3.5 text-[12px] text-text no-underline"
          >
            Log In
          </Link>
          <Link
            href="/onboarding"
            className="flex h-[30px] items-center rounded bg-boom px-3.5 text-[12px] font-bold text-bg no-underline"
          >
            Import My Leagues
          </Link>
        </div>
      </nav>

      {error ? (
        <div className="border-b border-[#ef4444]/30 bg-[#ef4444]/10 px-9 py-2 text-center text-xs text-[#ef4444]">
          {error}
        </div>
      ) : null}

      <section className="grid items-center gap-8 px-9 py-11 lg:grid-cols-[1fr_420px]">
        <div>
          <h1 className="mb-3 text-[56px] font-extrabold leading-none tracking-[-1.5px]">
            <div className="text-text">START FREE.</div>
            <div className="text-boom">
              DOMINATE <span className="text-bust">LATER.</span>
            </div>
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Most fantasy managers buy rankings.
            <br />
            BoB gives you <span className="font-medium text-boom">data-backed recommendations.</span>
          </p>
        </div>
        <div className="rounded-lg border border-boom/30 bg-card p-5">
          <div className="mb-1 flex items-center gap-1.5">
            <span>🏆</span>
            <span className="text-[10px] uppercase tracking-[2px] text-boom">Early Access Opens</span>
          </div>
          <div className="mb-4 font-mono text-[28px] font-bold tracking-tight text-boom">JULY 1ST, 2026</div>
          <div className="mb-3.5 grid grid-cols-3 gap-1.5">
            {[
              { range: 'First 100 Signups', discount: '50% OFF', sub: 'First 3 Months', btn: 'Founding', active: earlyAccessTier === 'founding' },
              { range: 'Signups 101–500', discount: '25% OFF', sub: 'First 3 Months', btn: 'Early', active: earlyAccessTier === 'early' },
              { range: '500+ Signups', discount: 'Full Price', sub: '\u00a0', btn: 'Launch', active: earlyAccessTier === 'launch' },
            ].map((t) => (
              <div key={t.btn} className="rounded-[5px] border border-border bg-surface2 p-2.5 text-center">
                <div className="mb-1 text-[9px] uppercase tracking-wide text-muted">{t.range}</div>
                <div className={`font-mono text-[17px] font-bold leading-none ${t.active ? 'text-hold' : 'text-muted'}`}>
                  {t.discount}
                </div>
                <div className="my-0.5 text-[9px] text-muted">{t.sub}</div>
                <div
                  className={`w-full rounded-[3px] py-1 text-[9px] font-bold uppercase tracking-wide ${
                    t.active
                      ? 'border border-hold/30 bg-hold/15 text-hold'
                      : 'border border-border bg-transparent text-muted'
                  }`}
                >
                  {t.btn}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-[12px] text-muted">
            👥 <span className="font-medium text-boom">{foundingSpotsRemaining} Founding Spots Remaining</span>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-center gap-9 border-y border-border bg-surface px-9 py-3.5">
        {[
          ['💳', 'No credit card required'],
          ['🛡', '7-day money back guarantee'],
          ['🏈', 'Used across 68+ leagues'],
          ['✓', '42-18-2 verified record'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-1.5 text-[12px] text-muted">
            <span>{icon}</span>
            {text}
          </div>
        ))}
      </div>

      <div className="px-9 pt-8">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setBilling('month')}
            className={`h-[30px] rounded border px-[18px] text-[12px] font-medium ${
              billing === 'month' ? 'border-boom bg-boom/[0.08] text-boom' : 'border-border text-muted'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling('year')}
            className={`h-[30px] rounded border px-[18px] text-[12px] font-medium ${
              billing === 'year' ? 'border-boom bg-boom/[0.08] text-boom' : 'border-border text-muted'
            }`}
          >
            Annual
          </button>
          <span className="text-[12px] text-muted">
            ← <span className="text-hold">Save up to 2 months</span>
          </span>
        </div>

        <div className="mb-9 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* FREE */}
          <div className={`relative flex flex-col rounded-lg border bg-surface p-[22px_18px] ${isCurrent('free') ? 'border-boom' : 'border-border'}`}>
            {isCurrent('free') ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-boom px-3 py-0.5 text-[9px] font-bold text-bg">
                Current Plan
              </span>
            ) : null}
            <div className="mb-2 text-[9px] uppercase tracking-[2px] text-muted">Rookie Scout</div>
            <div className="font-mono text-[38px] font-bold leading-none text-text">
              <sup className="text-lg">$</sup>0<span className="font-figtree text-xs font-normal text-muted">/mo</span>
            </div>
            <div className="mb-2.5 mt-0.5 text-[9px] uppercase tracking-wide text-muted">Forever</div>
            <p className="mb-2.5 text-[12px] leading-snug text-muted">
              Track one league. Learn the system. Decide if BOB is for you.
            </p>
            <div className="my-2.5 h-px bg-border" />
            {[
              '1 league synced',
              'Weekly buy/sell verdicts',
              'Sit/start recommendations',
              'Team health score',
              'Trade grader (1/day)',
              'Smart counter (1/day)',
            ].map((f) => (
              <div key={f} className="mb-1 flex gap-1.5 text-[12px] text-text">
                <span className="text-boom">✓</span>
                {f}
              </div>
            ))}
            {['Buy/sell ticker', 'Ads shown'].map((f) => (
              <div key={f} className="mb-1 flex gap-1.5 text-[12px] text-muted">
                <span className="text-[#ef4444]">✗</span>
                {f}
              </div>
            ))}
            <div className="mt-auto pt-3.5">
              <Link
                href="/onboarding"
                className="block w-full rounded-[5px] border border-border py-2.5 text-center text-xs font-bold text-text no-underline"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* LEAGUE ANALYST */}
          <div className={`relative flex flex-col rounded-lg border bg-surface p-[22px_18px] ${isCurrent('league_analyst') ? 'border-boom' : 'border-border'}`}>
            {isCurrent('league_analyst') ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-boom px-3 py-0.5 text-[9px] font-bold text-bg">
                Current Plan
              </span>
            ) : null}
            <div className="mb-2 text-[9px] uppercase tracking-[2px] text-boom">League Analyst</div>
            <div className="font-mono text-[38px] font-bold leading-none text-text">
              <sup className="text-lg">$</sup>
              {priceDisplay('league_analyst')}
              <span className="font-figtree text-xs font-normal text-muted">
                /{billing === 'year' ? 'yr' : 'mo'}
              </span>
            </div>
            <div className="mb-2.5 mt-0.5 text-[9px] uppercase tracking-wide text-muted">
              Billed {billing === 'year' ? 'Annually' : 'Monthly'}
            </div>
            <p className="mb-2.5 text-[12px] leading-snug text-muted">Stop guessing. Start exploiting market mistakes.</p>
            <div className="my-2.5 h-px bg-border" />
            <div className="mb-2 text-[9px] uppercase tracking-[1.5px] text-boom">Unlocks</div>
            {['Edge Score (BVI)', 'Momentum Score (DMS)', 'Sell Window (DAC)', 'Full Player Breakdown', 'Unlimited Trade Grading', 'Trade History Graded'].map((f) => (
              <div key={f} className="mb-1 flex gap-1.5 text-[12px] text-text">
                <span className="text-boom">✓</span>
                {f}
              </div>
            ))}
            <div className="mt-auto pt-3.5">
              {isCurrent('league_analyst') && hasStripeCustomer ? (
                <button type="button" onClick={openPortal} className="w-full rounded-[5px] border border-hold py-2.5 text-xs font-bold text-hold">
                  Manage Subscription
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading === 'league_analyst'}
                    onClick={() => checkout('league_analyst')}
                    className="w-full rounded-[5px] border border-hold py-2.5 text-xs font-bold text-hold disabled:opacity-50"
                  >
                    {loading === 'league_analyst' ? 'Loading…' : 'Start Free Trial'}
                  </button>
                  <div className="mt-1 text-center text-[10px] text-muted">7 Days Free</div>
                </>
              )}
            </div>
          </div>

          {/* GENERAL MANAGER */}
          <div className={`relative flex flex-col rounded-lg border bg-surface p-[22px_18px] ${isCurrent('general_manager') ? 'border-boom' : 'border-border'}`}>
            {isCurrent('general_manager') ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-boom px-3 py-0.5 text-[9px] font-bold text-bg">
                Current Plan
              </span>
            ) : null}
            <div className="mb-2 text-[9px] uppercase tracking-[2px] text-hold">General Manager</div>
            <div className="font-mono text-[38px] font-bold leading-none text-text">
              <sup className="text-lg">$</sup>
              {priceDisplay('general_manager')}
              <span className="font-figtree text-xs font-normal text-muted">
                /{billing === 'year' ? 'yr' : 'mo'}
              </span>
            </div>
            <div className="mb-2.5 mt-0.5 text-[9px] uppercase tracking-wide text-muted">
              Billed {billing === 'year' ? 'Annually' : 'Monthly'}
            </div>
            <p className="mb-2.5 text-[12px] leading-snug text-muted">See your league the way professionals do.</p>
            <div className="my-2.5 h-px bg-border" />
            <div className="mb-2 text-[9px] uppercase tracking-[1.5px] text-boom">Unlocks</div>
            {['Trade Finder', 'League Intelligence (LI)', 'Scout Their Team', 'Dynasty 3-Year Outlook', 'Breakout Meter Alerts (BPS)', 'Playoff Outlook (SOSPP)', 'Luck Factor / Regression (RI)', 'Rookie Grade (RTS)', 'Rejection Predictor'].map((f) => (
              <div key={f} className="mb-1 flex gap-1.5 text-[12px] text-text">
                <span className="text-boom">✓</span>
                {f}
              </div>
            ))}
            <div className="mt-auto pt-3.5">
              {isCurrent('general_manager') && hasStripeCustomer ? (
                <button type="button" onClick={openPortal} className="w-full rounded-[5px] border border-hold py-2.5 text-xs font-bold text-hold">
                  Manage Subscription
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading === 'general_manager'}
                    onClick={() => checkout('general_manager')}
                    className="w-full rounded-[5px] border border-hold py-2.5 text-xs font-bold text-hold disabled:opacity-50"
                  >
                    {loading === 'general_manager' ? 'Loading…' : 'Start Free Trial'}
                  </button>
                  <div className="mt-1 text-center text-[10px] text-muted">7 Days Free</div>
                </>
              )}
            </div>
          </div>

          {/* ALL-PRO */}
          <div className={`relative flex flex-col rounded-lg border-2 bg-card p-[22px_18px] ${isCurrent('all_pro') ? 'border-boom' : 'border-bust'}`}>
            <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-bust px-3 py-0.5 text-[9px] font-extrabold tracking-wide text-bg">
              ★ Most Popular
            </span>
            {isCurrent('all_pro') ? (
              <span className="absolute -top-2.5 right-3 rounded-full bg-boom px-2 py-0.5 text-[8px] font-bold text-bg">
                Current Plan
              </span>
            ) : null}
            <div className="mb-2 text-[9px] uppercase tracking-[2px] text-bust">All-Pro Terminal</div>
            <div className="font-mono text-[38px] font-bold leading-none text-boom">
              <sup className="text-lg">$</sup>
              {priceDisplay('all_pro')}
              <span className="font-figtree text-xs font-normal text-muted">
                /{billing === 'year' ? 'yr' : 'mo'}
              </span>
            </div>
            <div className="mb-2.5 mt-0.5 text-[9px] uppercase tracking-wide text-muted">
              Billed {billing === 'year' ? 'Annually' : 'Monthly'}
            </div>
            <p className="mb-2.5 text-[12px] leading-snug text-text">
              Every engine.
              <br />
              Every edge.
              <br />
              Every signal.
            </p>
            <div className="mb-2.5 rounded-[5px] border border-boom/15 bg-boom/[0.05] p-2.5">
              <div className="mb-1.5 text-[9px] uppercase tracking-[1.5px] text-boom">17 Engine Network</div>
              <div className="grid grid-cols-5 gap-0.5">
                {ENGINE_TAGS.map((e) => (
                  <div key={e} className="rounded-[3px] border border-boom/12 bg-boom/[0.08] py-0.5 text-center font-mono text-[8px] text-boom">
                    {e}
                  </div>
                ))}
              </div>
              <div className="mt-1 text-center text-[9px] text-muted">+2 More</div>
            </div>
            {['Startup Draft Tracking (1 free/yr)', 'All 17 Engines Unlocked', 'Market Verdict (vs Consensus)', 'Dynasty Power Rating (Empire)', 'Portfolio Manager', 'Priority Support', 'Content Export'].map((f) => (
              <div key={f} className="mb-1 flex gap-1.5 text-[12px] text-text">
                <span className="text-boom">✓</span>
                {f}
              </div>
            ))}
            <div className="mt-auto pt-3.5">
              {isCurrent('all_pro') && hasStripeCustomer ? (
                <button type="button" onClick={openPortal} className="w-full rounded-[5px] bg-boom py-2.5 text-xs font-bold text-bg">
                  Manage Subscription
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading === 'all_pro'}
                    onClick={() => checkout('all_pro')}
                    className="w-full rounded-[5px] bg-boom py-2.5 text-xs font-bold text-bg shadow-[0_0_12px_rgba(54,231,161,0.3)] disabled:opacity-50"
                  >
                    {loading === 'all_pro' ? 'Loading…' : 'Get All-Pro'}
                  </button>
                  <div className="mt-1 text-center text-[10px] text-muted">3 Days Free</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature table */}
      <div className="px-9 pb-9">
        <div className="mb-3.5 text-[11px] uppercase tracking-[1.5px] text-muted">Feature Comparison</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="w-[200px] border-b-2 border-border bg-surface px-3.5 py-2 text-left text-[10px] uppercase tracking-wide text-muted" />
                {[
                  ['Free', '$0/mo'],
                  ['Analyst', '$5/mo'],
                  ['GM', '$15/mo'],
                  ['All-Pro', '$35/mo'],
                ].map(([name, price]) => (
                  <th key={name} className="border-b-2 border-border bg-surface px-3.5 py-2 text-center text-[10px] uppercase tracking-wide text-muted">
                    {name}
                    <br />
                    <span className="font-mono text-[11px] font-normal text-text">{price}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_TABLE.flatMap((cat) => [
                <tr key={`${cat.category}-hdr`} className="bg-surface2">
                  <td colSpan={5} className="px-3.5 py-1.5 text-[9px] uppercase tracking-wide text-muted">
                    <span className="mr-2">{cat.icon}</span>
                    <span className={cat.color}>{cat.category}</span>
                  </td>
                </tr>,
                ...cat.rows.map((row) => {
                  const cells =
                    'checks' in row && row.checks
                      ? row.checks
                      : 'values' in row && row.values
                        ? row.values
                        : [];
                  return (
                    <tr key={`${cat.category}-${row.label}`} className="hover:bg-white/[0.012]">
                      <td className="border-b border-border/50 px-3.5 py-1 text-[11px] text-muted">{row.label}</td>
                      {cells.map((cell, i) => (
                        <td key={i} className="border-b border-border/50 px-3.5 py-1 text-center">
                          <CellValue v={cell as string | boolean} />
                        </td>
                      ))}
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      </div>

      {/* VS + stats */}
      <div className="grid items-start gap-6 px-9 pb-9 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-[22px] font-bold leading-tight">
            <div className="text-muted">Most tools give you rankings.</div>
            <div className="text-text">BoB gives you</div>
            <div className="text-boom">the edge.</div>
          </h2>
          <div className="overflow-hidden rounded-[7px] border border-border bg-surface">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-surface2">
                  <th className="border-b border-border px-3.5 py-2 text-left text-[10px] uppercase tracking-wide text-muted" />
                  <th className="border-b border-border px-3.5 py-2 text-center text-[10px] uppercase text-muted">KTC</th>
                  <th className="border-b border-border px-3.5 py-2 text-center text-[10px] uppercase text-muted">Dynasty Nerds</th>
                  <th className="border-b border-border px-3.5 py-2 text-center text-[10px] uppercase text-boom">BoB</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Trade grades', false, false, true],
                  ['Smart counter', false, false, true],
                  ['League Intel', false, false, true],
                  ['Sell-now alerts', false, false, true],
                  ['3-yr outlook', false, false, true],
                  ['Dynasty only', false, false, true],
                  ['Price', 'Free', 'Free', '$0–$35/mo'],
                ].map(([label, ktc, dn, bob]) => (
                  <tr key={String(label)}>
                    <td className="border-b border-border/40 px-3.5 py-1.5 text-text">{label}</td>
                    <td className="border-b border-border/40 px-3.5 py-1.5 text-center text-muted">
                      {typeof ktc === 'boolean' ? (ktc ? '✓' : '✗') : ktc}
                    </td>
                    <td className="border-b border-border/40 px-3.5 py-1.5 text-center text-muted">
                      {typeof dn === 'boolean' ? (dn ? '✓' : '✗') : dn}
                    </td>
                    <td className={`border-b border-border/40 px-3.5 py-1.5 text-center ${label === 'Price' ? 'text-boom' : 'text-boom'}`}>
                      {typeof bob === 'boolean' ? (bob ? '✓' : '✗') : bob}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['68+', 'Active Leagues'],
            ['42-18-2*', 'Verified Record', true],
            ['99.2%', 'Data Accuracy'],
            ['4,211', 'Players Tracked'],
            ['17', 'Proprietary Engines'],
            ['24/7', 'Data Monitoring'],
          ].map(([val, lbl, white]) => (
            <div key={String(lbl)} className="rounded-md border border-border bg-surface px-3 py-4 text-center">
              <div className={`font-mono text-[22px] font-bold ${white ? 'text-text' : 'text-boom'}`}>{val}</div>
              <div className="mt-1 text-[9px] uppercase tracking-wide text-muted">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="px-9 pb-9">
        <div className="mb-4 text-center text-[11px] uppercase tracking-[1.5px] text-muted">
          Frequently Asked Questions
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-md border border-border bg-surface px-3.5 py-3">
              <div className="mb-1 flex gap-1 text-xs font-medium text-text">
                <span className="text-boom">Q</span>
                {item.q}
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="grid items-center gap-8 border-t border-border bg-surface px-9 py-10 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-bust/20 bg-bust/[0.08] text-[32px]">
          🏈
        </div>
        <div>
          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight">
            <div className="text-muted">STOP MANAGING PLAYERS.</div>
            <div className="text-boom">START MANAGING</div>
            <div className="text-bust">A PORTFOLIO.</div>
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Join the next generation of dynasty managers using
            <br />
            data to create unfair advantages.
          </p>
        </div>
        <div className="flex min-w-[190px] flex-col gap-2">
          <Link href="/onboarding" className="rounded-[5px] bg-boom py-3 text-center text-[14px] font-bold text-bg no-underline">
            Get Started Free
          </Link>
          <Link href="/onboarding" className="rounded-[5px] border border-border py-3 text-center text-[14px] font-medium text-text no-underline">
            Import My Leagues
          </Link>
          <div className="text-center text-[10px] text-muted">No credit card required.</div>
        </div>
      </div>

      <footer className="border-t border-border bg-card px-9 py-4">
        <p className="mx-auto max-w-[800px] text-center text-[10px] leading-relaxed text-muted">
          *42-18-2 record based on tracked lineup recommendations across connected leagues. Past performance
          does not guarantee future results. BoB provides data-backed recommendations for informational and
          entertainment purposes only. All lineup and trade decisions are made solely by the user. Boom or Bust
          and SaaSylum LLC are not responsible for fantasy team outcomes resulting from the use of this
          platform.
        </p>
      </footer>
    </div>
  );
}
