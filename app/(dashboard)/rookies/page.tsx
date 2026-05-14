'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RookieBoardData, RookieProspect, RookieTabId, RookiePosition, DraftClass } from '@/components/rookies/types';
import { verdictColor, ffigGradeStyle, posColor } from '@/components/rookies/types';

import RookieStatsBar      from '@/components/rookies/RookieStatsBar';
import RookieTabNav        from '@/components/rookies/RookieTabNav';
import RookieFilterBar     from '@/components/rookies/RookieFilterBar';
import RookieBigBoard      from '@/components/rookies/RookieBigBoard';
import DraftStealsPanel    from '@/components/rookies/DraftStealsPanel';
import LandingSpotAnalyzer from '@/components/rookies/LandingSpotAnalyzer';
import MeasurablesPanel    from '@/components/rookies/MeasurablesPanel';
import DraftOutlookPanel   from '@/components/rookies/DraftOutlookPanel';
import StatusBar           from '@/components/dashboard/StatusBar';

// ─── Simple sub-tabs for non-board views ─────────────────────────────────────

function FfigGradesTab({ prospects }: { prospects: RookieProspect[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">F-FIG GRADE BREAKDOWN</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">F-FIG Pentagon score → letter grade, all 2025 prospects</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PLAYER</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">POS</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">F-FIG GRADE</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">F-FIG SCORE</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">DOM SCORE</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RAS</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => {
              const { bg, color } = ffigGradeStyle(p.ffigGrade);
              return (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5"><span className="text-[12px] font-semibold text-white">{p.name}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[11px] font-bold" style={{ color: posColor(p.position) }}>{p.position}</span></td>
                  <td className="px-3 py-2.5">
                    <span className="text-[13px] font-bold px-2 py-0.5 rounded-md" style={{ background: bg, color, border: `1px solid ${color}40` }}>{p.ffigGrade}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[12px] font-mono text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.ffigScore.toFixed(1)}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[12px] font-mono text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.domScore}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[12px] font-mono text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.rasScore.toFixed(1)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SleepersTab({ prospects }: { prospects: RookieProspect[] }) {
  const sleepers = prospects.filter((p) => p.isSleeper);
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">DYNASTY SLEEPERS</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Round 3+ picks with RTS ≥ 70 — high value, low ADP cost</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PLAYER</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">DRAFT CAPITAL</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RTS SCORE</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">SLEEPER %</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">IDEAL RANGE</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">VERDICT</th>
            </tr>
          </thead>
          <tbody>
            {sleepers.map((p) => {
              const color = verdictColor(p.verdict);
              return (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] uppercase" style={{ color: posColor(p.position) }}>{p.position} · {p.team}</p>
                  </td>
                  <td className="px-3 py-2.5"><span className="text-[11px] text-slate-300 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.draftCapital}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[14px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{p.rtsScore}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[12px] font-mono text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.sleeperPct}%</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.idealRange}</span></td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{p.verdict}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DraftCapitalTab({ prospects }: { prospects: RookieProspect[] }) {
  const sorted = [...prospects].sort((a, b) => a.draftCapitalRaw - b.draftCapitalRaw);
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">DRAFT CAPITAL RANKINGS</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Sorted by overall draft position — earlier picks highlighted</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PLAYER</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">DRAFT SLOT</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RTS SCORE</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">VERDICT</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const color = verdictColor(p.verdict);
              const capColor = p.draftRound === 1 ? '#FBBF24' : p.draftRound === 2 ? '#36E7A1' : '#64748B';
              return (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] uppercase" style={{ color: posColor(p.position) }}>{p.position} · {p.college}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] font-mono font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: capColor }}>
                      {p.draftCapital}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right"><span className="text-[14px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{p.rtsScore}</span></td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{p.verdict}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MeasurablesTab({ prospects }: { prospects: RookieProspect[] }) {
  return (
    <div className="space-y-4">
      {prospects.slice(0, 10).map((p) => (
        <div key={p.id} className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded-full" style={{ background: posColor(p.position) }} />
            <div>
              <p className="text-[13px] font-bold text-white">{p.name}</p>
              <p className="text-[10px] uppercase text-slate-500">{p.position} · {p.team}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '40-Yard Dash', value: p.measurables.fortyYard.value, pct: p.measurables.fortyYard.percentile },
              { label: 'Vertical', value: p.measurables.vertical.value, pct: p.measurables.vertical.percentile },
              { label: 'Broad Jump', value: p.measurables.broadJump.value, pct: p.measurables.broadJump.percentile },
              { label: 'Arm Length', value: p.measurables.armLength.value, pct: p.measurables.armLength.percentile },
            ].map(({ label, value, pct }) => {
              const c = pct >= 80 ? '#36E7A1' : pct >= 60 ? '#22D3EE' : pct >= 40 ? '#FBBF24' : '#EF4444';
              return (
                <div key={label}>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-[16px] font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
                  <div className="h-1 rounded-full bg-white/[0.06] mt-1"><div className="h-1 rounded-full" style={{ width: `${pct}%`, background: c }} /></div>
                  <p className="text-[10px] mt-0.5" style={{ color: c }}>{pct}th pct</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilmNotesTab({ prospects: _prospects }: { prospects: RookieProspect[] }) {
  return (
    <div className="glass-card p-6 text-center">
      <p className="text-[24px] mb-2">🎬</p>
      <p className="text-[13px] font-semibold text-white mb-1">Film Notes Coming Soon</p>
      <p className="text-[12px] text-slate-500">AI-powered film analysis for all 2025 prospects will appear here.</p>
    </div>
  );
}

function RankingsTab({ prospects }: { prospects: RookieProspect[] }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-[13px] font-bold text-white tracking-wide">DYNASTY ROOKIE RANKINGS</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Overall dynasty value ranking weighted by RTS + TFO + F-FIG</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {prospects.map((p) => {
          const color = verdictColor(p.verdict);
          const { bg: gradeBg, color: gradeColor } = ffigGradeStyle(p.ffigGrade);
          return (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <span className="text-[13px] font-mono font-bold text-slate-400 w-6 text-right flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.rank}</span>
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: posColor(p.position) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500 uppercase">{p.position} · {p.college} · {p.team}</p>
              </div>
              <span className="text-[12px] font-bold px-1.5 py-0.5 rounded" style={{ background: gradeBg, color: gradeColor }}>{p.ffigGrade}</span>
              <span className="text-[14px] font-bold w-8 text-right" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{p.rtsScore}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap hidden sm:inline" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{p.verdict}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <span style={{ fontSize: 13, color: '#f87171' }}>{message}</span>
      <button onClick={onRetry} className="px-3 py-1.5 rounded-lg text-sm font-medium ml-4 hover:opacity-80" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
        Retry
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RookiesPage() {
  const [activeTab, setActiveTab]     = useState<RookieTabId>('board');
  const [position, setPosition]       = useState<RookiePosition>('ALL');
  const [college, setCollege]         = useState('All Colleges');
  const [draftClass, setDraftClass]   = useState<DraftClass>('2025');
  const [search, setSearch]           = useState('');
  const [viewMode, setViewMode]       = useState<'list' | 'grid'>('list');
  const [selectedProspect, setSelected] = useState<RookieProspect | null>(null);

  const [data, setData]       = useState<RookieBoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rookies/board', { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RookieBoardData = await res.json();
      setData(json);
      if (json.prospects.length) setSelected(json.prospects[0]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message ?? 'Failed to load rookie data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  // Client-side filtering
  const filtered = (data?.prospects ?? []).filter((p) => {
    if (position !== 'ALL' && p.position !== position) return false;
    if (college !== 'All Colleges' && p.college !== college) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-dvh pb-14" style={{ background: '#0a0d14', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6 space-y-4">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Rookies</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Draft smarter. Before your league catches up.</p>
        </div>

        {/* Stats bar */}
        <RookieStatsBar data={data} loading={loading} />

        {error && <ErrorBanner message={error} onRetry={fetchData} />}

        {/* Tab nav */}
        <RookieTabNav active={activeTab} onChange={setActiveTab} />

        {/* Filter bar */}
        <RookieFilterBar
          position={position} college={college} draftClass={draftClass}
          search={search} viewMode={viewMode}
          onPosition={setPosition} onCollege={setCollege} onDraftClass={setDraftClass}
          onSearch={setSearch} onViewMode={setViewMode}
        />

        {/* ── ROOKIE BOARD tab ──────────────────────────────────────────────── */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
            {/* Left: big board */}
            <div className="space-y-4">
              <RookieBigBoard
                prospects={filtered}
                loading={loading}
                onSelect={setSelected}
                selected={selectedProspect}
              />
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <DraftStealsPanel steals={data?.draftSteals ?? []} loading={loading} />
              <LandingSpotAnalyzer prospect={selectedProspect} loading={loading} />
              <MeasurablesPanel prospect={selectedProspect} loading={loading} />
              <DraftOutlookPanel outlook={data?.draftOutlook ?? null} loading={loading} />
            </div>
          </div>
        )}

        {/* ── Other tabs ───────────────────────────────────────────────────── */}
        {activeTab === 'ffig' && <FfigGradesTab prospects={filtered} />}
        {activeTab === 'landing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <LandingSpotAnalyzer key={p.id} prospect={p} loading={false} />
            ))}
          </div>
        )}
        {activeTab === 'sleepers' && <SleepersTab prospects={filtered} />}
        {activeTab === 'capital' && <DraftCapitalTab prospects={filtered} />}
        {activeTab === 'measurables' && <MeasurablesTab prospects={filtered} />}
        {activeTab === 'film' && <FilmNotesTab prospects={filtered} />}
        {activeTab === 'rankings' && <RankingsTab prospects={filtered} />}
      </div>

      <StatusBar />
    </div>
  );
}
