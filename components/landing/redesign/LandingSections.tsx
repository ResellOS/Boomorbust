'use client';

import Link from 'next/link';
import type { PublicSignalCard } from '@/lib/public/liveSignal';
import type { LandingStats } from '@/lib/landing/fetchLandingStats';
import { FEATURES, FEED_CSS, LANDING, MANAGERS, TICKER_ITEMS } from './constants';

function SectionDivider() {
  return <div className="mx-auto h-px max-w-[1280px] bg-gradient-to-r from-transparent via-[#1e2640] to-transparent" />;
}

export function LandingTrustStrip({ stats }: { stats: LandingStats }) {
  const items = [
    { icon: '🏈', label: `${stats.leaguesSynced.toLocaleString()} LEAGUES SYNCED` },
    { icon: '📊', label: `${stats.playersScored.toLocaleString()} PLAYERS SCORED` },
    { icon: '📋', label: 'EVERY CALL PUBLICLY TRACKED' },
    { icon: '✋', label: 'NO RETROACTIVE EDITS' },
    { icon: '✓', label: 'DATA + HUMAN VALIDATED' },
  ];

  return (
    <section style={{ background: LANDING.surface }}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-[#e8ecf4]/70">
            <span>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingProblem() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-center font-figtree text-[clamp(1.5rem,4vw,2.25rem)] italic tracking-[-0.01em] text-[#e8ecf4]">
          THE OLD WAY IS HOLDING YOU BACK
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border p-5" style={{ background: LANDING.surface, borderColor: LANDING.border }}>
            <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8ecf4]/45">Rankings</div>
            <div className="mt-3 space-y-1 font-mono text-[11px] text-[#e8ecf4]/70">
              <div>Player #14</div>
              <div>Player #15</div>
              <div>Player #16</div>
            </div>
            <p className="mt-4 font-figtree text-[13px] text-[#e8ecf4]/55">What do I do with this?</p>
          </div>

          <div className="rounded-lg border p-5" style={{ background: LANDING.surface, borderColor: LANDING.border }}>
            <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8ecf4]/45">Trade Calculators</div>
            <div className="mt-3 font-mono text-[12px] text-[#e8ecf4]/75">
              <div>You win: 54</div>
              <div>They win: 52</div>
            </div>
            <p className="mt-4 font-figtree text-[13px] text-[#e8ecf4]/55">Will they actually accept?</p>
          </div>

          <div
            className="rounded-lg border p-5"
            style={{
              background: LANDING.surface,
              borderColor: 'rgba(54,231,161,0.45)',
              boxShadow: '0 0 24px rgba(54,231,161,0.08)',
            }}
          >
            <div className="font-mono text-[9px] uppercase tracking-wide text-[#36E7A1]">Boom or Bust</div>
            <div className="mt-3 space-y-1 font-figtree text-[12px] text-[#e8ecf4]/80">
              <div>Offer: 2027 2nd Round Pick</div>
              <div>Target: Trey McBride</div>
              <div className="font-mono text-[#36E7A1]">Acceptance: 62%</div>
              <div className="text-[#e8ecf4]/55">Reason: Manager needs RB help</div>
            </div>
            <p className="mt-4 font-figtree text-[13px] text-[#36E7A1]">That&apos;s actionable insight.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-center font-figtree text-[clamp(1.4rem,3.5vw,2rem)] tracking-wide text-[#e8ecf4]">
          EVERY EDGE. ONE PLATFORM.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group rounded-lg border p-4 transition hover:border-[#36E7A1]/30"
              style={{ background: LANDING.surface, borderColor: LANDING.border }}
            >
              <div
                className="mb-3 h-24 rounded border"
                style={{
                  borderColor: LANDING.border,
                  background: `linear-gradient(135deg, ${f.accent}12, transparent 60%)`,
                }}
              />
              <div className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: f.accent }}>
                {f.title}
              </div>
              <p className="mt-2 font-figtree text-[13px] leading-snug text-[#e8ecf4]/65">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingTrackRecord() {
  const chartPoints = [52, 54, 56, 58, 60, 62, 63, 63.4];
  const consensusPoints = [50, 51, 52, 53, 54, 54.5, 54.7, 54.8];
  const w = 280;
  const h = 120;
  const toLine = (pts: number[]) =>
    pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / 80) * h}`).join(' ');

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-center font-figtree text-[clamp(1.35rem,3vw,1.85rem)] text-[#e8ecf4]">
          THE PROOF IS IN THE{' '}
          <span style={{ color: LANDING.boom }}>TRACK RECORD.</span>
        </h2>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border p-4" style={{ background: LANDING.surface, borderColor: LANDING.border }}>
            <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8ecf4]/45">
              BOB vs Consensus Accuracy
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full">
              <polyline fill="none" stroke="#A78BFA" strokeWidth="2" opacity="0.6" points={toLine(consensusPoints)} />
              <polyline fill="none" stroke="#36E7A1" strokeWidth="2.5" points={toLine(chartPoints)} />
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[8px] text-[#e8ecf4]/40">
              <span>Week 1</span>
              <span>Week 17</span>
            </div>
            <p className="mt-3 font-figtree text-[10px] text-[#e8ecf4]/45">
              2026 season tracking begins Week 1 — chart updates live
            </p>
          </div>

          <div className="rounded-lg border p-4" style={{ background: LANDING.surface, borderColor: LANDING.border }}>
            {[
              ['63.4%', 'BOB ACCURACY', LANDING.boom],
              ['54.8%', 'CONSENSUS ACCURACY', LANDING.bust],
              ['2,483', 'CALLS TRACKED', '#e8ecf4'],
              ['71%', 'PROFITABLE CALLS', LANDING.boom],
              ['0', 'RETROACTIVE EDITS', '#e8ecf4'],
            ].map(([val, lbl, color]) => (
              <div key={lbl} className="mb-4 last:mb-0">
                <div className="font-mono text-[28px] tabular-nums" style={{ color }}>
                  {val}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8ecf4]/45">{lbl}</div>
              </div>
            ))}
            <p className="mt-4 font-figtree text-[10px] leading-relaxed text-[#e8ecf4]/45">
              Numbers update live as the 2026 season progresses. Placeholders shown — real data begins Week 1.
            </p>
          </div>

          <div className="rounded-lg border p-4" style={{ background: LANDING.surface, borderColor: LANDING.border }}>
            <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8ecf4]/45">
              Confidence Calibration
            </div>
            <div className="mt-3 space-y-2">
              {[
                ['90-100%', '82%'],
                ['80-89%', '71%'],
                ['70-79%', '63%'],
                ['60-69%', '56%'],
                ['<60%', '41%'],
              ].map(([range, acc]) => (
                <div key={range} className="flex justify-between font-mono text-[11px]">
                  <span className="text-[#e8ecf4]/55">{range}</span>
                  <span className="text-[#36E7A1]">{acc}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-figtree text-[10px] text-[#e8ecf4]/45">Placeholder — builds Week 1</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingLeagueIntel() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="font-figtree text-[clamp(1.5rem,3.5vw,2rem)] text-[#e8ecf4]">
            WIN YOUR LEAGUES.
            <br />
            <span style={{ color: LANDING.boom }}>KNOW YOUR LEAGUES.</span>
          </h2>
          <p className="mt-4 max-w-md font-figtree text-[14px] leading-relaxed text-[#e8ecf4]/60">
            BOB analyzes every manager in your leagues so you know exactly how to win deals and championships.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-block rounded-md border px-5 py-2.5 font-figtree text-[13px] text-[#36E7A1] transition hover:bg-[#36E7A1]/10"
            style={{ borderColor: 'rgba(54,231,161,0.35)' }}
          >
            View Your Leagues
          </Link>
          <p className="mt-4 font-figtree text-[10px] text-[#e8ecf4]/40">
            Manager profiles are generated from Sleeper transaction history.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible">
          {MANAGERS.map((m) => (
            <div
              key={m.name}
              className="min-w-[220px] shrink-0 rounded-lg border p-4 lg:min-w-0"
              style={{ background: LANDING.surface, borderColor: LANDING.border }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-figtree text-[15px] text-[#e8ecf4]">{m.name}</div>
                  <div className="font-figtree text-[12px] text-[#e8ecf4]/55">&quot;{m.title}&quot;</div>
                </div>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums"
                  style={{ borderColor: m.color, color: m.color }}
                >
                  {m.fit}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded px-1.5 py-0.5 font-mono text-[8px] text-[#e8ecf4]/55"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-2 font-mono text-[9px] text-[#e8ecf4]/40">Fit Score</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingOrphanChallenge() {
  return (
    <section id="orphan" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" style={{ background: LANDING.dark }}>
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2
            className="font-figtree text-[clamp(1.75rem,4vw,2.5rem)] leading-tight text-[#e8ecf4]"
            style={{ textShadow: '0 0 40px rgba(54,231,161,0.15)' }}
          >
            THE ORPHAN CHALLENGE 2026
          </h2>
          <p className="mt-4 font-figtree text-[14px] leading-relaxed text-[#e8ecf4]/60">
            Watch BOB rebuild real orphan teams. Every move. Every decision. Every result.
          </p>
          <ul className="mt-6 space-y-2">
            {['2 orphan teams', 'Starting August 1', 'Everything tracked'].map((t) => (
              <li key={t} className="flex items-center gap-2 font-figtree text-[13px] text-[#e8ecf4]/70">
                <span style={{ color: LANDING.boom }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/resources"
            className="mt-8 inline-block rounded-md px-5 py-2.5 font-figtree text-[13px] text-[#0a0d14]"
            style={{ background: LANDING.boom }}
          >
            Follow the Rebuild →
          </Link>
          <p className="mt-4 font-figtree text-[10px] text-[#e8ecf4]/40">
            Real orphan teams selected at launch August 1, 2026.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: 'Team Chaos', value: '$42,000', picks: '09-21', grade: 'F → D+' },
            { name: 'Project Rebirth', value: '$438,000', picks: '09-21', grade: 'D+ → D+' },
          ].map((team) => (
            <div
              key={team.name}
              className="rounded-lg border p-4"
              style={{ background: LANDING.surface, borderColor: LANDING.border }}
            >
              <div className="font-mono text-[10px] uppercase tracking-wide text-[#36E7A1]">{team.name}</div>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-[#e8ecf4]/70">
                <div>Roster Value: {team.value}</div>
                <div>Picks: {team.picks}</div>
              </div>
              <div className="mt-3 font-mono text-[12px] text-[#e8ecf4]">
                Rebuild Grade: <span className="text-[#36E7A1]">{team.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SIGNAL_COLORS: Record<string, string> = {
  buy: '#36E7A1',
  sell: '#f59e0b',
  start: '#A78BFA',
  add: '#22D3EE',
};

export function LandingLiveSignals({ cards, updatedAt }: { cards: PublicSignalCard[]; updatedAt: string }) {
  const ago = updatedAt
    ? `${Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000))} min ago`
    : '2 min ago';

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-figtree text-[clamp(1.35rem,3vw,1.75rem)] text-[#e8ecf4]">LIVE SIGNALS FROM BOB</h2>
          <div className="font-mono text-[10px] text-[#e8ecf4]/50">
            Updated {ago} · <span className="live-pulse text-[#36E7A1]">● Live</span>
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="mt-8 text-center font-figtree text-[13px] text-[#e8ecf4]/50">
            Live signals activate at season launch.
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div
                key={`${c.signalType}-${c.playerName}`}
                className="rounded-lg border p-4"
                style={{ background: LANDING.surface, borderColor: LANDING.border }}
              >
                <div
                  className="font-mono text-[9px] uppercase tracking-wide"
                  style={{ color: SIGNAL_COLORS[c.category] ?? LANDING.boom }}
                >
                  [{c.signalType}]
                </div>
                <div className="mt-2 font-figtree text-[15px] text-[#e8ecf4]">{c.playerName}</div>
                <div className="font-mono text-[10px] text-[#e8ecf4]/50">
                  {c.position} · {c.team}
                </div>
                <div className="mt-3 font-mono text-[11px] text-[#e8ecf4]/70">
                  {c.confidence} Confidence · {c.detail}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function LandingFooterFeed() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-t py-3" style={{ borderColor: LANDING.border, background: LANDING.surface }}>
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      <div className="mb-2 text-center font-mono text-[9px] uppercase tracking-[1.5px] text-[#e8ecf4]/45">
        The Front Office Feed · Live updates from BOB
      </div>
      <div className="landing-ticker-track flex w-max gap-8 whitespace-nowrap px-4">
        {items.map((t, i) => (
          <span key={`${t}-${i}`} className="font-mono text-[11px] text-[#36E7A1]/70">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export { SectionDivider };
