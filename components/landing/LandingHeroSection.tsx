import type { ReactNode } from 'react';
import Link from 'next/link';

const HERO_BG = '#0a0d14';
const BOOM = '#36E7A1';
const CYAN = '#22D3EE';
const PURPLE = '#A78BFA';
const AMBER = '#FBBF24';
const MUTED = '#64748B';

const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function Sparkline({ className }: { className?: string }) {
  const d = 'M0 18 L8 22 L16 10 L24 14 L32 6 L40 8 L48 2';
  return (
    <svg className={className} viewBox="0 0 48 24" width={56} height={28} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={BOOM}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.45))' }}
      />
    </svg>
  );
}

function pentagonPoints(cx: number, cy: number, r: number, vals: number[]): string {
  const n = 5;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const rr = r * vals[i];
    pts.push(`${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function MiniPentagon({ vals, stroke, verdictGlow }: { vals: number[]; stroke: string; verdictGlow: string }) {
  const cx = 50;
  const cy = 52;
  const r = 38;
  const outer = pentagonPoints(cx, cy, r, [1, 1, 1, 1, 1]);
  const inner = pentagonPoints(cx, cy, r, vals);
  return (
    <svg
      viewBox="0 0 100 104"
      className="mx-auto h-20 w-20 max-h-[80px] max-w-[80px] sm:h-[72px] sm:w-full sm:max-h-none sm:max-w-[100px]"
      aria-hidden
    >
      <polygon
        points={outer}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
      />
      <polygon
        points={inner}
        fill={`${stroke}22`}
        stroke={stroke}
        strokeWidth={1.35}
        style={{ filter: `drop-shadow(0 0 8px ${verdictGlow})` }}
      />
    </svg>
  );
}

const PLAYERS = [
  {
    name: 'Justin Jefferson',
    line: 'WR·MIN',
    posColor: CYAN,
    vals: [0.92, 0.88, 0.9, 0.94, 0.86],
    score: 92,
    verdict: 'BOOM' as const,
  },
  {
    name: 'Bijan Robinson',
    line: 'RB·ATL',
    posColor: BOOM,
    vals: [0.9, 0.92, 0.85, 0.88, 0.9],
    score: 88,
    verdict: 'BOOM' as const,
  },
  {
    name: 'Puka Nacua',
    line: 'WR·LAR',
    posColor: CYAN,
    vals: [0.88, 0.84, 0.86, 0.9, 0.82],
    score: 85,
    verdict: 'BOOM' as const,
  },
  {
    name: 'Brock Bowers',
    line: 'TE·LV',
    posColor: PURPLE,
    vals: [0.62, 0.58, 0.55, 0.6, 0.52],
    score: 62,
    verdict: 'HOLD' as const,
  },
  {
    name: 'R. Stevenson',
    line: 'RB·NE',
    posColor: BOOM,
    vals: [0.38, 0.42, 0.35, 0.4, 0.36],
    score: 38,
    verdict: 'BUST' as const,
  },
];

function verdictGlowRgba(v: 'BOOM' | 'HOLD' | 'BUST') {
  if (v === 'BOOM') return 'rgba(54,231,161,0.42)';
  if (v === 'HOLD') return 'rgba(251,191,36,0.38)';
  return 'rgba(167,139,250,0.42)';
}

function verdictStyles(v: 'BOOM' | 'HOLD' | 'BUST') {
  if (v === 'BOOM')
    return {
      bg: `${BOOM}22`,
      color: BOOM,
      badgeShadow: '0 0 12px rgba(54,231,161,0.4)',
      cardGlow: '0 0 20px rgba(54,231,161,0.12)',
    };
  if (v === 'HOLD')
    return {
      bg: `${AMBER}22`,
      color: AMBER,
      badgeShadow: '0 0 12px rgba(251,191,36,0.35)',
      cardGlow: '0 0 18px rgba(251,191,36,0.12)',
    };
  return {
    bg: `${PURPLE}22`,
    color: PURPLE,
    badgeShadow: '0 0 12px rgba(167,139,250,0.4)',
    cardGlow: '0 0 20px rgba(167,139,250,0.14)',
  };
}

function TrustIconSleeper() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 opacity-90">
      <path
        d="M12 3c-4.5 0-8 3.2-8 7.2 0 2.6 1.4 4.9 3.5 6.2L12 21l4.5-4.6c2.1-1.3 3.5-3.6 3.5-6.2C20 6.2 16.5 3 12 3z"
        stroke={MUTED}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M9 12h6M12 9v6" stroke={MUTED} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function TrustIconLeagues() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x="4" y="6" width="7" height="12" rx="1" stroke={MUTED} strokeWidth={1.4} />
      <rect x="13" y="4" width="7" height="14" rx="1" stroke={MUTED} strokeWidth={1.4} />
    </svg>
  );
}

function TrustIconChart() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M4 18V6M4 18h16M8 14l3-4 3 2 4-6" stroke={MUTED} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrustIconBrain() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5"
        stroke={MUTED}
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <path d="M12 8l1.2 3.2L16 12l-2.8 0.8L12 16l-1.2-3.2L8 12l2.8-0.8L12 8z" stroke={MUTED} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

function TrustIconShield() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 3l8 3v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-3z"
        stroke={MUTED}
        strokeWidth={1.35}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TRUST_ITEMS: { label: string; icon: ReactNode }[] = [
  { label: 'Built for Sleeper', icon: <TrustIconSleeper /> },
  { label: '15 Leagues Max', icon: <TrustIconLeagues /> },
  { label: 'Real-Time Data', icon: <TrustIconChart /> },
  { label: 'AI-Powered Insights', icon: <TrustIconBrain /> },
  { label: 'Secure & Private', icon: <TrustIconShield /> },
];

function ChromeDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
    </div>
  );
}

function SidebarGlyph({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 w-full items-center justify-center text-white/35 hover:text-white/55">{children}</div>
  );
}

function HeroDashboardMockup() {
  return (
    <div id="demo" className={`${GLASS} overflow-hidden scroll-mt-24`}>
      {/* Browser chrome */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-white/[0.08] bg-black/20 px-2.5 py-2 sm:grid-cols-[minmax(0,72px)_1fr_minmax(0,72px)] sm:px-4">
        <ChromeDots />
        <div className="min-w-0 text-center sm:col-span-1">
          <div className="truncate text-[11px] font-semibold text-white sm:text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
            Good Morning, Champ! 🏆
          </div>
          <div className="truncate text-[9px] text-white/45 sm:text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="font-mono tabular-nums">Week 8</span>
            <span> · </span>
            <span className="font-mono tabular-nums">6</span> of <span className="font-mono tabular-nums">9</span> matchups
          </div>
        </div>
        <div className="hidden items-center justify-end gap-2 text-white/35 sm:col-span-1 sm:flex" aria-hidden>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
          </svg>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="flex min-h-0">
        <aside
          className="hidden w-11 shrink-0 flex-col border-r border-white/[0.06] bg-black/15 py-2 sm:flex"
          aria-label="Decorative sidebar"
        >
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </SidebarGlyph>
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M4 19V5M8 19V9M12 19v-6M16 19V7M20 19v-9" strokeLinecap="round" />
            </svg>
          </SidebarGlyph>
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M12 3v18M3 12h18" strokeLinecap="round" />
            </svg>
          </SidebarGlyph>
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L4 9h7l3-7z" strokeLinejoin="round" />
            </svg>
          </SidebarGlyph>
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M8 7h12M8 12h12M8 17h8" strokeLinecap="round" />
              <circle cx="5" cy="7" r="1.2" fill="currentColor" />
              <circle cx="5" cy="12" r="1.2" fill="currentColor" />
              <circle cx="5" cy="17" r="1.2" fill="currentColor" />
            </svg>
          </SidebarGlyph>
          <SidebarGlyph>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M12 22s8-4.5 8-11V5l-8-3-8 3v6c0 6.5 8 11 8 11z" strokeLinejoin="round" />
            </svg>
          </SidebarGlyph>
        </aside>

        <div className="min-w-0 flex-1 space-y-3 p-3 sm:space-y-4 sm:p-4" style={{ background: HERO_BG }}>
          {/* Top stats */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <div className="flex min-w-0 flex-1 items-stretch justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
                  Empire Score
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[17px] font-semibold leading-none text-[#36E7A1] font-mono">+82.5</span>
                  <span className="text-[11px] font-semibold text-[#36E7A1]" style={{ fontFamily: 'var(--font-body)' }}>
                    Elite
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Your teams are trending up
                </p>
              </div>
              <Sparkline className="shrink-0 self-end opacity-90" />
            </div>
            <div className="flex min-w-0 flex-1 items-stretch justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
                  Trade Edge
                </div>
                <div className="mt-1 text-[17px] font-semibold leading-none text-[#36E7A1] font-mono">+23.7</div>
                <p className="mt-1 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Edge in 7 leagues
                </p>
              </div>
              <Sparkline className="shrink-0 self-end opacity-90" />
            </div>
            <div className="flex min-w-0 flex-1 items-stretch justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
                  Win Probability
                </div>
                <div className="mt-1 text-[17px] font-semibold leading-none text-[#36E7A1] font-mono">68%</div>
                <p className="mt-1 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Avg across leagues
                </p>
              </div>
              <Sparkline className="shrink-0 self-end opacity-90" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              YOUR TOP PLAYERS
            </span>
            <button
              type="button"
              className="min-h-[44px] shrink-0 px-1 text-left text-[11px] font-semibold leading-snug text-[#22D3EE] transition-opacity hover:opacity-90 sm:min-h-0 sm:px-0 sm:text-right"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              View Full Roster →
            </button>
          </div>

          {/* Player cards */}
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {PLAYERS.map((p) => {
              const vs = verdictStyles(p.verdict);
              return (
                <div
                  key={p.name}
                  className="flex w-[108px] shrink-0 flex-col rounded-lg border border-white/[0.08] bg-white/[0.03] px-1.5 pb-2 pt-2 lg:w-auto lg:min-w-0"
                  style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), ${vs.cardGlow}` }}
                >
                  <div className="mb-1.5 flex items-start gap-1.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-[9px] font-bold text-white/80 font-mono"
                      style={{ background: `${p.posColor}18` }}
                    >
                      {p.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[10px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                        {p.name}
                      </div>
                      <div className="truncate text-[9px] text-white/45 font-mono">{p.line}</div>
                    </div>
                  </div>
                  <MiniPentagon vals={p.vals} stroke={p.posColor} verdictGlow={verdictGlowRgba(p.verdict)} />
                  <div className="mt-1 flex flex-col items-center gap-1">
                    <span className="text-[18px] font-semibold leading-none text-white font-mono">{p.score}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide"
                      style={{
                        fontFamily: 'var(--font-body)',
                        background: vs.bg,
                        color: vs.color,
                        boxShadow: vs.badgeShadow,
                      }}
                    >
                      {p.verdict}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom status */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-[10px] sm:gap-x-4 sm:text-[11px]">
            <span style={{ fontFamily: 'var(--font-body)' }} className="text-white/45">
              Market Inefficiency{' '}
              <span className="font-mono font-semibold text-[#36E7A1]">+18.6</span>
            </span>
            <span style={{ fontFamily: 'var(--font-body)' }} className="text-white/45">
              Active Trades <span className="font-mono font-semibold text-[#A78BFA]">24</span>
            </span>
            <span style={{ fontFamily: 'var(--font-body)' }} className="text-white/45">
              Waiver Targets <span className="font-mono font-semibold text-[#36E7A1]">7</span>
            </span>
            <span style={{ fontFamily: 'var(--font-body)' }} className="text-white/45">
              League Alerts <span className="font-mono font-semibold text-[#A78BFA]">14</span>
            </span>
            <span className="ml-auto hidden text-white/35 sm:inline" aria-hidden>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingHeroSection() {
  return (
    <section className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden pt-6 sm:pt-10" style={{ background: HERO_BG, color: '#f8fafc' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            width: 520,
            height: 520,
            top: -120,
            left: -80,
            background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 68%)',
            animation: 'orbPulse 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 480,
            height: 480,
            bottom: -80,
            right: -60,
            background: 'radial-gradient(circle, rgba(54,231,161,0.06) 0%, transparent 70%)',
            animation: 'orbPulse 8s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <div className="absolute inset-0 opacity-[0.18]" style={{ background: 'rgba(34,211,238,0.03)' }} />
      </div>

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:px-10 lg:py-[88px]">
        <div className="min-w-0">
          <h1
            className="landing-hero-h1 text-[clamp(2rem,10vw,4.5rem)] leading-[0.95] tracking-[0.02em] sm:text-[clamp(2.5rem,6vw,4.5rem)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="block text-white">Manage All Your Fantasy Leagues</span>
            <span className="block text-[#36E7A1]">Like a Portfolio.</span>
          </h1>

          <p
            className="landing-hero-sub mt-4 max-w-[520px] text-[14px] leading-relaxed text-white/70 sm:mt-5 sm:text-[15px] md:text-base"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Stop guessing. Start winning. BOOM or BUST gives you the data, context, and AI-powered tools to make smarter
            decisions across all your leagues.
          </p>

          <div className="landing-hero-ctas mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/signup"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-6 py-3 text-[14px] font-bold shadow-[0_0_24px_rgba(54,231,161,0.35)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(54,231,161,0.3)] sm:w-auto sm:py-3.5 sm:text-[15px]"
              style={{ fontFamily: 'var(--font-body)', background: BOOM, color: '#0a0d14' }}
            >
              Start Free — <span className="font-mono tabular-nums">$0</span> Forever
            </Link>
            <Link
              href="#how-it-works"
              className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.18] bg-transparent px-6 py-3 text-[14px] font-semibold text-white transition-[filter,border-color,background-color] duration-200 hover:brightness-110 hover:border-white/[0.28] hover:bg-white/[0.04] sm:w-auto sm:py-3.5 sm:text-[15px]`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] sm:h-8 sm:w-8">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 text-white" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </span>
              See How It Works
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:mt-8 sm:gap-x-6 sm:gap-y-3">
            {TRUST_ITEMS.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 text-[11px] leading-none sm:text-[12px]" style={{ color: MUTED }}>
                {t.icon}
                <span style={{ fontFamily: 'var(--font-body)' }}>
                  {t.label === '15 Leagues Max' ? (
                    <>
                      <span className="font-mono tabular-nums">15</span> Leagues Max
                    </>
                  ) : (
                    t.label
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-mockup relative w-full min-w-0">
          <HeroDashboardMockup />
        </div>
      </div>
    </section>
  );
}
