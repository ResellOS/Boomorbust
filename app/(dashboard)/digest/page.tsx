'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { DigestData, DigestAlert, DevelopmentWatch, LeagueHeadline, MatchupCard } from '@/app/api/digest/week/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function photoUrl(name: string) {
  return `https://sleepercdn.com/content/nfl/players/thumb/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-400 bg-white/[0.08]"
        style={{ width: size, height: size }}>
        {name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
      </div>
    );
  }
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]" style={{ width: size, height: size }}>
      <Image src={photoUrl(name)} alt={name} width={size} height={size} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = ['OVERVIEW', 'ALERTS', 'DEVELOPMENT WATCH', 'LEAGUE BREAKDOWN', 'MATCHUP BREAKDOWN'] as const;
type Tab = typeof TABS[number];

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-0 border-b mb-5 overflow-x-auto scrollbar-hide" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="flex-shrink-0 px-4 py-3 min-h-[44px] text-[11px] font-bold uppercase tracking-wider transition-colors relative"
          style={{ color: active === t ? '#36E7A1' : '#64748B' }}
        >
          {t}
          {active === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#36E7A1' }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar({ data }: { data: DigestData | null }) {
  const [sparkPts] = useState(() => Array.from({ length: 12 }, (_, i) => 60 + i * 2.5 + Math.sin(i) * 8));
  const max = Math.max(...sparkPts);
  const min = Math.min(...sparkPts);
  const pts = sparkPts.map((v, i) => `${(i / (sparkPts.length - 1)) * 120},${40 - ((v - min) / (max - min)) * 38}`).join(' ');

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-24 rounded-xl animate-pulse${i === 4 ? ' col-span-2 md:col-span-1' : ''}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
        ))}
      </div>
    );
  }

  const s = data.stats;
  const cards = [
    { label: 'Top Alerts',       value: s.topAlerts.toString(),           sub: `Across ${data.matchups.length + 1} Leagues`, link: 'View All Alerts',    color: '#36E7A1' },
    { label: 'Players on Watch', value: s.playersOnWatch.toString(),       sub: 'Trending Up',                                link: 'View Watchlist',    color: '#22D3EE' },
    { label: 'League Headlines', value: s.leagueHeadlines.toString(),      sub: 'Big Stories',                                link: 'View Headlines',    color: '#A78BFA' },
    { label: 'Matchup Edges',    value: s.matchupEdges.toString(),         sub: 'You Have the Edge',                          link: 'View Matchups',     color: '#FBBF24' },
    { label: 'Empire Score',     value: s.empireScore.toString(),          sub: s.empireGrade,                                link: null,                color: '#36E7A1' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-xl px-4 py-3 flex flex-col justify-between min-h-[90px]${i === 4 ? ' col-span-2 md:col-span-1' : ''}`}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</p>
          <div>
            {i === 4 ? (
              <div className="flex items-end gap-2">
                <p className="text-[26px] font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: c.color }}>{c.value}</p>
                <svg width="60" height="24" viewBox="0 0 120 40" preserveAspectRatio="none">
                  <polyline points={pts} fill="none" stroke="#36E7A1" strokeWidth="2"/>
                </svg>
              </div>
            ) : (
              <p className="text-[26px] font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: c.color }}>{c.value}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">{c.sub}</p>
          </div>
          {c.link && <button className="text-[10px] mt-1 text-left" style={{ color: '#36E7A1' }}>{c.link}</button>}
        </div>
      ))}
    </div>
  );
}

// ─── Top Alerts Feed ─────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: DigestAlert }) {
  const iconBg: Record<string, string> = {
    injury:      'rgba(239,68,68,0.15)',
    news:        'rgba(34,211,238,0.15)',
    opportunity: 'rgba(54,231,161,0.15)',
    pick:        'rgba(167,139,250,0.15)',
  };
  const iconColor: Record<string, string> = {
    injury:      '#EF4444',
    news:        '#22D3EE',
    opportunity: '#36E7A1',
    pick:        '#A78BFA',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <Avatar name={alert.player} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-semibold text-white truncate">{alert.player}</p>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{alert.league}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{alert.message}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="text-[10px] text-slate-600">{alert.timeAgo}</p>
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: iconBg[alert.type] }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: iconColor[alert.type] }} />
        </div>
      </div>
    </div>
  );
}

function TopAlerts({ alerts }: { alerts: DigestAlert[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">TOP ALERTS</p>
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View All Alerts →</button>
      </div>
      <div className="px-4">
        {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
      </div>
    </div>
  );
}

// ─── Development Watch ───────────────────────────────────────────────────────

function DevWatchRow({ p }: { p: DevelopmentWatch }) {
  const isUp = p.trend.startsWith('up');
  const isStrong = p.trend === 'up-strong';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <Avatar name={p.player} size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate">{p.player}</p>
        <p className="text-[10px] text-slate-500">{p.position} · {p.team}</p>
      </div>
      {/* Trend arrows */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isStrong ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M2 6l4-4 4 4" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M2 6l4-4 4 4" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </>
        ) : isUp ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10V2M2 6l4-4 4 4" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6l4 4 4-4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
        )}
      </div>
      <p className="text-[13px] font-bold w-12 text-right flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: isUp ? '#36E7A1' : '#EF4444' }}>
        +{p.pct}%
      </p>
      <p className="text-[10px] text-slate-500 hidden md:block max-w-[140px] flex-shrink-0">{p.reason}</p>
    </div>
  );
}

function DevelopmentWatch({ players }: { players: DevelopmentWatch[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">DEVELOPMENT WATCH</p>
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View All</button>
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 pt-2 pb-1">
        <div className="w-8" />
        <div />
        <p className="text-[9px] text-slate-600 uppercase tracking-wider">TREND</p>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider w-12 text-right">TREN%</p>
        <p className="text-[9px] text-slate-600 uppercase tracking-wider hidden md:block max-w-[140px]">WHY IT MATTERS</p>
      </div>
      <div className="px-4">
        {players.map((p) => <DevWatchRow key={p.id} p={p} />)}
      </div>
      <div className="px-4 py-3">
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View Full Watchlist →</button>
      </div>
    </div>
  );
}

// ─── League Headlines ─────────────────────────────────────────────────────────

function LeagueHeadlines({ headlines }: { headlines: LeagueHeadline[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">LEAGUE HEADLINES</p>
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View All</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {headlines.map((h) => (
          <div key={h.leagueId} className="flex items-start gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {h.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-semibold text-white">{h.leagueName}</p>
              </div>
              <p className="text-[11px] text-slate-400">{h.headline}</p>
            </div>
            <p className="text-[10px] text-slate-600 flex-shrink-0">{h.timeAgo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Matchup Breakdown ────────────────────────────────────────────────────────

function MatchupCard({ m }: { m: MatchupCard }) {
  const userWidth = `${m.winPct}%`;
  const oppWidth  = `${100 - m.winPct}%`;
  return (
    <div className="flex items-center gap-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      {/* User side */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-300">
          ME
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white leading-tight">{m.leagueName}</p>
          <p className="text-[10px] text-slate-500">({m.record})</p>
        </div>
      </div>

      {/* Center win prob */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-28">
        <p className="text-[22px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{m.winPct}%</p>
        <p className="text-[9px] text-slate-600 uppercase tracking-wide">Win Probability</p>
        {/* Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden flex">
          <div className="h-full rounded-l-full transition-all" style={{ width: userWidth, background: '#36E7A1' }} />
          <div className="h-full rounded-r-full" style={{ width: oppWidth, background: '#7c3aed' }} />
        </div>
      </div>

      {/* Opponent side */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
        <div className="text-right">
          <p className="text-[13px] font-semibold text-white leading-tight">{m.opponent}</p>
          <p className="text-[10px] text-slate-500">({m.oppRecord})</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-300">
          {m.opponent.split(' ').map((s) => s[0]).join('').slice(0, 2)}
        </div>
      </div>
    </div>
  );
}

function MatchupBreakdown({ matchups }: { matchups: MatchupCard[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">MATCHUP BREAKDOWN</p>
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View All Matchups</button>
      </div>
      <div className="px-4">
        {matchups.map((m) => <MatchupCard key={m.leagueId} m={m} />)}
      </div>
      <div className="px-4 py-3">
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View Full Matchup Breakdown →</button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [data,    setData]    = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('OVERVIEW');
  const [week,    setWeek]    = useState<number | null>(null);

  const fetchData = useCallback(async (w: number | null) => {
    setLoading(true);
    try {
      const url = w ? `/api/digest/week?week=${w}` : '/api/digest/week';
      const res = await fetch(url);
      if (res.ok) {
        const json: DigestData = await res.json();
        setData(json);
        setWeek(json.week);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(null); }, [fetchData]);

  const currentWeek = week ?? data?.week ?? 7;

  return (
    <div className="min-h-dvh bg-[#0a0d14] px-4 md:px-6 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-[26px] font-bold text-white">Digest</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Your weekly edge. Everything that matters.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week selector */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => fetchData(Math.max(1, currentWeek - 1))}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <div className="text-center">
              <p className="text-[12px] font-bold text-white">WEEK {currentWeek} REPORT</p>
              {data && <p className="text-[10px] text-slate-500">{data.weekRange}</p>}
            </div>
            <button
              onClick={() => fetchData(currentWeek + 1)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Export */}
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium"
            style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.25)', color: '#36E7A1' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v7M3 5.5l3.5 3.5L10 5.5M1 10h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabNav active={tab} onChange={(t) => setTab(t)} />

      {/* Stats Bar */}
      <StatsBar data={data} />

      {tab === 'OVERVIEW' && !loading && data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TopAlerts alerts={data.alerts} />
          <DevelopmentWatch players={data.devWatch} />
          <LeagueHeadlines headlines={data.headlines} />
          <MatchupBreakdown matchups={data.matchups} />
        </div>
      ) : tab === 'ALERTS' && !loading && data ? (
        <TopAlerts alerts={[...data.alerts, ...data.alerts].slice(0, 8)} />
      ) : tab === 'DEVELOPMENT WATCH' && !loading && data ? (
        <DevelopmentWatch players={data.devWatch} />
      ) : tab === 'LEAGUE BREAKDOWN' && !loading && data ? (
        <LeagueHeadlines headlines={data.headlines} />
      ) : tab === 'MATCHUP BREAKDOWN' && !loading && data ? (
        <MatchupBreakdown matchups={data.matchups} />
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl h-64 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
