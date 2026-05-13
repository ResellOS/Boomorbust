import type { ReactNode } from 'react';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const HEADER_MUTED = '#64748B';
const X_MUTED = '#374151';

const GLASS =
  'overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

type RowData = {
  feature: string;
  fantasyPros: boolean;
  ktc: boolean;
  espn: boolean;
  cbs: boolean;
};

const ROWS: RowData[] = [
  { feature: 'AI-Powered Verdicts', fantasyPros: false, ktc: false, espn: false, cbs: false },
  { feature: 'Smart Trade Counter', fantasyPros: false, ktc: false, espn: false, cbs: false },
  { feature: 'Dynasty Age Clock', fantasyPros: false, ktc: false, espn: false, cbs: false },
  { feature: 'Breakout Detection (BPS)', fantasyPros: false, ktc: true, espn: false, cbs: false },
  { feature: 'Multi-League Dashboard (15)', fantasyPros: false, ktc: false, espn: true, cbs: false },
  { feature: 'Real-Time Market Intelligence', fantasyPros: true, ktc: false, espn: false, cbs: true },
  { feature: 'Built for Dynasty Only', fantasyPros: false, ktc: true, espn: false, cbs: false },
];

const PLATFORM_HEADERS = ['FantasyPros', 'KTC', 'ESPN', 'CBS Fantasy'] as const;

function BobCheck() {
  return (
    <span
      className="inline-flex text-[17px] font-bold leading-none text-[#36E7A1]"
      style={{
        filter: 'drop-shadow(0 0 10px rgba(54, 231, 161, 0.75)) drop-shadow(0 0 18px rgba(54, 231, 161, 0.35))',
      }}
      aria-label="Yes"
    >
      ✓
    </span>
  );
}

function OtherCell({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="text-[17px] font-semibold leading-none text-white/50" aria-label="Yes">
        ✓
      </span>
    );
  }
  return (
    <span className="text-[17px] font-semibold leading-none" style={{ color: X_MUTED }} aria-label="No">
      ✗
    </span>
  );
}

const GRID_COLS =
  'grid grid-cols-[minmax(140px,1.35fr)_minmax(88px,0.95fr)_repeat(4,minmax(72px,0.85fr))]';

function featureLabel(feature: string): ReactNode {
  if (feature === 'Multi-League Dashboard (15)') {
    return (
      <>
        Multi-League Dashboard <span className="font-mono tabular-nums">(15)</span>
      </>
    );
  }
  return feature;
}

export default function LandingComparisonTable() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24" style={{ background: BG }}>
      <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start lg:gap-12 xl:gap-16">
        <div className="max-w-md lg:pt-2">
          <h2
            className="text-[clamp(1.45rem,6vw,2.5rem)] font-normal leading-[1.08] tracking-[0.02em] text-white sm:text-[clamp(1.75rem,3vw,2.5rem)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Why Players Choose BOOM or BUST
          </h2>
          <p
            className="mt-4 text-[15px] leading-relaxed sm:text-base"
            style={{ fontFamily: 'var(--font-body)', color: HEADER_MUTED }}
          >
            Built specifically for serious dynasty players.
          </p>
        </div>

        <div className="-mx-4 min-w-0 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className={`${GLASS} min-w-[640px] sm:min-w-[700px]`}>
            {/* Header row */}
            <div className={`${GRID_COLS} border-b border-white/[0.08]`}>
              <div
                className="border-b border-r border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:px-5"
                aria-hidden
              />
              <div
                className="relative border-b border-l border-r border-[#36E7A1]/90 px-2 py-3.5 text-center sm:px-3"
                style={{
                  background: BOOM,
                  color: '#0a0d14',
                  boxShadow:
                    'inset 0 0 0 1px rgba(54,231,161,0.5), 0 0 28px rgba(54, 231, 161, 0.35), 0 0 48px rgba(54, 231, 161, 0.12)',
                }}
              >
                <span
                  className="text-[11px] font-bold leading-tight sm:text-xs tracking-wide"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  BOOM or BUST
                </span>
              </div>
              {PLATFORM_HEADERS.map((h) => (
                <div
                  key={h}
                  className="border-b border-white/[0.06] bg-white/[0.02] px-2 py-3.5 text-center sm:px-3"
                >
                  <span
                    className="text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-[11px]"
                    style={{ fontFamily: 'var(--font-body)', color: HEADER_MUTED }}
                  >
                    {h === 'CBS Fantasy' ? (
                      <>
                        <span className="hidden sm:inline">CBS Fantasy</span>
                        <span className="sm:hidden">CBS</span>
                      </>
                    ) : (
                      h
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {ROWS.map((row, i) => {
              const stripe = i % 2 === 1;
              return (
                <div
                  key={row.feature}
                  className={`${GRID_COLS} border-b border-white/[0.06] last:border-b-0`}
                >
                  <div
                    className={`border-r border-white/[0.06] px-4 py-3.5 text-left text-[13px] font-medium text-white sm:px-5 sm:text-[14px] ${
                      stripe ? 'bg-white/[0.02]' : ''
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {featureLabel(row.feature)}
                  </div>
                  <div
                    className="flex items-center justify-center border-l border-r border-[#36E7A1]/55 bg-emerald-950/30 px-2 py-3.5 sm:px-3"
                    style={{
                      boxShadow: 'inset 0 0 24px rgba(16, 185, 129, 0.06), 0 0 18px rgba(54, 231, 161, 0.08)',
                    }}
                  >
                    <BobCheck />
                  </div>
                  <div
                    className={`flex items-center justify-center border-r border-white/[0.06] px-2 py-3.5 sm:px-3 ${
                      stripe ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <OtherCell ok={row.fantasyPros} />
                  </div>
                  <div
                    className={`flex items-center justify-center border-r border-white/[0.06] px-2 py-3.5 sm:px-3 ${
                      stripe ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <OtherCell ok={row.ktc} />
                  </div>
                  <div
                    className={`flex items-center justify-center border-r border-white/[0.06] px-2 py-3.5 sm:px-3 ${
                      stripe ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <OtherCell ok={row.espn} />
                  </div>
                  <div
                    className={`flex items-center justify-center px-2 py-3.5 sm:px-3 ${stripe ? 'bg-white/[0.02]' : ''}`}
                  >
                    <OtherCell ok={row.cbs} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
