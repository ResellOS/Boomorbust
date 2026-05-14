'use client';

import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import EmpireScore from '@/components/nav/EmpireScore';
import LeagueSidebar from '@/components/dashboard/LeagueSidebar';
import StatsBar from '@/components/dashboard/StatsBar';
import PlayerHubSection from '@/components/dashboard/PlayerHubSection';
import TradeTargetsPanel from '@/components/dashboard/TradeTargetsPanel';
import SignalsRow from '@/components/dashboard/SignalsRow';
import NewsTicker from '@/components/dashboard/NewsTicker';
import StatusBar from '@/components/dashboard/StatusBar';

export default function DashboardPage() {
  // activeLeagueId drives all panel refetches when the sidebar selection changes.
  // The Zustand store is initialised to 'all' by DashboardStoreInitializer in the layout.
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  void activeLeagueId; // consumed by child panels via the store directly

  return (
    /*
     * Full-height flex column so StatusBar can be pushed to the very bottom
     * without position:fixed (which would overlap scrollable content).
     */
    <div
      className="flex flex-col min-h-[calc(100dvh-3.5rem)]"
      style={{ background: '#0a0d14' }}
    >
      {/* ── Two-column shell: sidebar + main ───────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar — hidden on mobile, 200px on lg+ */}
        <LeagueSidebar />

        {/* ── Main content area ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 px-4 md:px-6 py-6 pb-20 md:pb-6 flex flex-col gap-5">

            {/* ── 1. Page header ──────────────────────────────────────── */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1
                  className="leading-none"
                  style={{
                    fontFamily: 'var(--font-display), "Bebas Neue", sans-serif',
                    fontSize:   32,
                    color:      '#ffffff',
                    letterSpacing: '0.02em',
                  }}
                >
                  Dashboard
                </h1>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                    fontSize:   14,
                    color:      '#64748B',
                  }}
                >
                  Your command center. All leagues. All signals. One edge.
                </p>
              </div>

              {/* Empire Score widget — top-right of header */}
              <div className="shrink-0 hidden sm:block">
                <EmpireScore />
              </div>
            </header>

            {/* ── 2. Stats bar ────────────────────────────────────────── */}
            <StatsBar />

            {/* ── Divider ─────────────────────────────────────────────── */}
            <hr
              className="border-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            />

            {/* ── 3. Player Hub ────────────────────────────────────────── */}
            <PlayerHubSection />

            {/* ── 4. Mid row: Trade Targets + Signals/Overvalued ──────── */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Left 60%: Trade Targets table */}
              <div className="lg:w-[60%] min-w-0">
                <TradeTargetsPanel className="h-full" />
              </div>

              {/* Right 40%: Signals donut stacked above Overvalued list */}
              <div className="lg:w-[40%] min-w-0">
                <SignalsRow vertical className="h-full" />
              </div>
            </div>

            {/* ── 5. News Ticker ──────────────────────────────────────── */}
            <NewsTicker />

          </div>

          {/* ── 6. Status bar — flush bottom of main content ─────────── */}
          <StatusBar />
        </div>
      </div>
    </div>
  );
}
