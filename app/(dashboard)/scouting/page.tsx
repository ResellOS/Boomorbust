'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type {
  HiddenGemRow,
  ProcessEdgeResponse,
  ScoutingTabId,
  WaiverRadarRow,
  WRMatrixResponse,
} from '@/components/scouting/types';
import ScoutingTabNav from '@/components/scouting/ScoutingTabNav';
import ScoutingEmpireWidget from '@/components/scouting/ScoutingEmpireWidget';
import WaiverRadarPanel from '@/components/scouting/WaiverRadarPanel';
import HiddenGemsPanel from '@/components/scouting/HiddenGemsPanel';
import ProcessResultsPanel from '@/components/scouting/ProcessResultsPanel';
import WREfficiencyMatrix from '@/components/scouting/WREfficiencyMatrix';
import BreakoutWatchPanel from '@/components/scouting/BreakoutWatchPanel';
import DeepDiveSection from '@/components/scouting/DeepDiveSection';

const SCROLL_ANCHORS: Record<ScoutingTabId, string> = {
  WAIVER_RADAR: 'scouting-waiver-radar',
  PROCESS_VS_RESULTS: 'scouting-process-engine',
  WR_EFFICIENCY_MATRIX: 'scouting-wr-matrix',
  HIDDEN_GEMS: 'scouting-hidden-gems',
  BREAKOUT_WATCH: 'scouting-breakout',
  DEEP_DIVE: 'scouting-deep-dive',
};

export default function ScoutingTerminalPage() {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  const leagueParam = activeLeagueId ?? 'all';

  const [tab, setTab] = useState<ScoutingTabId>('WAIVER_RADAR');

  const [waiverRows, setWaiverRows] = useState<WaiverRadarRow[]>([]);
  const [waiverLoading, setWaiverLoading] = useState(true);
  const [gemsRows, setGemsRows] = useState<HiddenGemRow[]>([]);
  const [gemsLoading, setGemsLoading] = useState(true);
  const [processData, setProcessData] = useState<ProcessEdgeResponse | null>(null);
  const [processLoading, setProcessLoading] = useState(true);
  const [wrMatrix, setWrMatrix] = useState<WRMatrixResponse | null>(null);
  const [wrLoading, setWrLoading] = useState(true);

  const onTabChange = useCallback((id: ScoutingTabId) => {
    setTab(id);
    const anchor = SCROLL_ANCHORS[id];
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    let c = false;
    setWaiverLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/scouting/waiver-radar?leagueId=${encodeURIComponent(leagueParam)}`, {
          credentials: 'include',
        });
        const j = (await res.json()) as { rows?: WaiverRadarRow[] };
        if (!c) setWaiverRows(j.rows ?? []);
      } catch {
        if (!c) setWaiverRows([]);
      } finally {
        if (!c) setWaiverLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [leagueParam]);

  useEffect(() => {
    let c = false;
    setGemsLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/scouting/hidden-gems', { credentials: 'include' });
        const j = (await res.json()) as { rows?: HiddenGemRow[] };
        if (!c) setGemsRows(j.rows ?? []);
      } catch {
        if (!c) setGemsRows([]);
      } finally {
        if (!c) setGemsLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    setProcessLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/scouting/process-edge', { credentials: 'include' });
        const j = (await res.json()) as ProcessEdgeResponse;
        if (!c && j?.expectedWins != null) setProcessData(j);
      } catch {
        if (!c) setProcessData(null);
      } finally {
        if (!c) setProcessLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    setWrLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/scouting/wr-matrix', { credentials: 'include' });
        const j = (await res.json()) as WRMatrixResponse;
        if (!c && j?.points) setWrMatrix(j);
      } catch {
        if (!c) setWrMatrix(null);
      } finally {
        if (!c) setWrLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: '#0a0d14' }}>
      <div className="mx-auto max-w-[1400px] px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              Scouting Terminal
            </h1>
            <p className="text-[14px] text-[#64748B] mt-1" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              Find edges. Before they&apos;re obvious.
            </p>
          </div>
          <ScoutingEmpireWidget />
        </div>

        <ScoutingTabNav active={tab} onChange={onTabChange} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)] lg:gap-4">
          <div className="min-w-0 flex flex-col">
            <div id="scouting-waiver-radar" className="scroll-mt-24">
              <WaiverRadarPanel rows={waiverRows} loading={waiverLoading} />
            </div>
            <div id="scouting-hidden-gems" className="scroll-mt-24">
              <HiddenGemsPanel rows={gemsRows} loading={gemsLoading} />
            </div>
            <BreakoutWatchPanel loading={false} />
          </div>

          <div className="min-w-0 flex flex-col">
            <div id="scouting-process-engine" className="scroll-mt-24">
              <ProcessResultsPanel data={processData} loading={processLoading} />
            </div>
            <div id="scouting-wr-matrix" className="scroll-mt-24">
              <WREfficiencyMatrix data={wrMatrix} loading={wrLoading} />
            </div>
          </div>
        </div>

        <div className="scroll-mt-24">
          <DeepDiveSection />
        </div>
      </div>
    </div>
  );
}
