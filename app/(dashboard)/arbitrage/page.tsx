'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { ArbitragePlayer, ArbitrageResponse } from '@/app/api/players/arbitrage/route';

// ─── helpers ────────────────────────────────────────────────────────────────

function photoUrl(name: string) {
  return `https://sleepercdn.com/content/nfl/players/thumb/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
}

function posColor(pos: string) {
  const m: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  return m[pos] ?? '#64748B';
}

// ─── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar({ data }: { data: ArbitrageResponse | null }) {
  const cards = [
    {
      label: 'Total Players',
      value: data ? data.total.toString() : '—',
      sub:   data ? '100% of Player Pool' : '',
      color: 'white',
    },
    {
      label: 'Undervalued',
      value: data ? data.undervalued.toString() : '—',
      sub:   data ? `${data.undervaluedPct}%` : '',
      color: '#36E7A1',
    },
    {
      label: 'Overvalued',
      value: data ? data.overvalued.toString() : '—',
      sub:   data ? `${data.overvaluedPct}%` : '',
      color: '#EF4444',
    },
    {
      label: 'BVI > KTC Avg',
      value: data ? `+${data.bviKtcAvg}` : '—',
      sub:   'Market Inefficiency',
      color: '#22D3EE',
    },
    {
      label: 'Best Opportunity',
      value: data?.bestOpportunity?.name ?? '—',
      sub:   data?.bestOpportunity ? `+${data.bestOpportunity.valueDelta.toLocaleString()} value` : '',
      color: '#A78BFA',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`rounded-xl px-4 py-3${i === 4 ? ' col-span-2 md:col-span-1' : ''}`}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
          {data ? (
            <>
              <p
                className="text-[20px] font-bold leading-tight"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: c.color }}
              >
                {c.value}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{c.sub}</p>
            </>
          ) : (
            <div className="h-7 bg-white/[0.08] rounded animate-pulse mt-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

const TABS = ['ARBITRAGE BOARD', 'BUY LOW TARGETS', 'SELL HIGH TARGETS', 'POSITIONAL BREAKDOWN', 'VALUE TRENDS', 'LEAGUE IMPACT'] as const;
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
          {active === t && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#36E7A1' }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────

interface Filters { q: string; position: string; team: string; tier: string }

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="flex flex-wrap gap-3 mb-5 items-center">
      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[160px]"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="#64748B" strokeWidth="1.2"/>
          <path d="M10 10l2 2" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Search players..."
          className="bg-transparent text-[12px] text-white placeholder-slate-600 outline-none flex-1"
        />
      </div>

      {/* Dropdowns */}
      {[
        { key: 'position', label: 'All Positions', options: ['All Positions', 'QB', 'RB', 'WR', 'TE'] },
        { key: 'team',     label: 'All Teams',     options: ['All Teams', 'SF', 'DAL', 'BUF', 'KC', 'PHI', 'MIA', 'GB', 'ATL', 'MIN'] },
        { key: 'tier',     label: 'All Tiers',     options: ['All Tiers', 'Elite', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] },
      ].map(({ key, label, options }) => (
        <select
          key={key}
          value={(filters as unknown as Record<string, string>)[key] || label}
          onChange={(e) => {
            const v = e.target.value.startsWith('All') ? '' : e.target.value;
            onChange({ ...filters, [key]: v });
          }}
          className="rounded-lg px-3 py-2 text-[12px] text-slate-300 appearance-none cursor-pointer pr-7"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#0a0d14]">{o}</option>
          ))}
        </select>
      ))}

      {/* Filters button */}
      <button
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-medium"
        style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.25)', color: '#36E7A1' }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 3h11M3 6.5h7M5 10h3" stroke="#36E7A1" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Filters
      </button>

      {/* View toggle */}
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {['list', 'grid'].map((v) => (
          <button
            key={v}
            className="px-3 py-2 text-[11px] transition-colors"
            style={{ background: v === 'list' ? 'rgba(54,231,161,0.12)' : 'rgba(255,255,255,0.04)', color: v === 'list' ? '#36E7A1' : '#64748B' }}
          >
            {v === 'list' ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3h10M2 7h10M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="8.5" y="1.5" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="1.5" y="8.5" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="8.5" y="8.5" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Divergence Table ────────────────────────────────────────────────────────

function PlayerAvatar({ name, pos }: { name: string; pos: string }) {
  const [err, setErr] = useState(false);
  const color = posColor(pos);
  if (err) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <span className="text-[10px] font-bold" style={{ color }}>{name.split(' ').map((s) => s[0]).join('').slice(0, 2)}</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
      <Image src={photoUrl(name)} alt={name} width={32} height={32} className="object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  );
}

function DivergenceTable({ players, total, page, onPage }: {
  players: ArbitragePlayer[]; total: number; page: number; onPage: (p: number) => void
}) {
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">BVI vs KTC Divergence Board</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {['RANK', 'PLAYER', 'POS', 'TEAM', 'BVI', 'KTC', 'DIVERGENCE', 'DIV %', 'SIGNAL', 'OPP SCORE'].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] text-slate-600 font-semibold uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.playerId}
                className="border-b transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <td className="px-3 py-3 text-slate-400 font-mono">{p.rank}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar name={p.name} pos={p.position} />
                    <span className="text-white font-medium whitespace-nowrap">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: posColor(p.position), background: `${posColor(p.position)}18` }}>
                    {p.position}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-white/[0.08]">
                    {p.team.slice(0, 2)}
                  </div>
                </td>
                <td className="px-3 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
                  {p.bvi.toLocaleString()}
                </td>
                <td className="px-3 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#22D3EE' }}>
                  {p.ktc.toLocaleString()}
                </td>
                <td className="px-3 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: p.divergence > 0 ? '#36E7A1' : '#EF4444' }}>
                  {p.divergence > 0 ? '+' : ''}{p.divergence.toLocaleString()}
                </td>
                <td className="px-3 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: p.divergencePct > 0 ? '#36E7A1' : '#EF4444' }}>
                  {p.divergencePct > 0 ? '+' : ''}{p.divergencePct}%
                </td>
                <td className="px-3 py-3">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={
                      p.signal === 'UNDERVALUED'
                        ? { color: '#36E7A1', background: 'rgba(54,231,161,0.12)', border: '1px solid rgba(54,231,161,0.25)' }
                        : p.signal === 'OVERVALUED'
                        ? { color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }
                        : { color: '#64748B', background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }
                    }
                  >
                    {p.signal}
                  </span>
                </td>
                <td className="px-3 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#FBBF24' }}>
                  {p.opportunityScore}
                </td>
              </tr>
            ))}

            {players.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-600 text-[12px]">No players match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] text-slate-500">Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} players</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, '...', totalPages].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).map((pg, i) => (
            <button
              key={i}
              onClick={() => typeof pg === 'number' && onPage(pg)}
              className="w-7 h-7 rounded text-[11px] font-medium transition-colors"
              style={{
                background: pg === page ? '#36E7A1' : 'rgba(255,255,255,0.04)',
                color: pg === page ? '#0a0d14' : pg === '...' ? '#64748B' : '#94a3b8',
              }}
            >
              {pg}
            </button>
          ))}
          <button onClick={() => onPage(Math.min(totalPages, page + 1))} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1.5l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Market Efficiency Gauge ─────────────────────────────────────────────────

function MarketGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const angle = -180 + (pct / 100) * 180;
  const r = 70;
  const cx = 95;
  const cy = 90;

  function polarToXY(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const start = polarToXY(-180, r);
  const end   = polarToXY(0, r);
  const needle = polarToXY(angle - 90, r - 12);

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">MARKET EFFICIENCY</p>
      <svg width="190" height="110" viewBox="0 0 190 110">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${polarToXY(angle - 90, r).x} ${polarToXY(angle - 90, r).y}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7c3aed"/>
            <stop offset="50%"  stopColor="#22D3EE"/>
            <stop offset="100%" stopColor="#36E7A1"/>
          </linearGradient>
        </defs>
        {/* Needle dot */}
        <circle cx={needle.x} cy={needle.y} r="4" fill="#36E7A1" />
        {/* Labels */}
        <text x="10" y="108" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">0</text>
        <text x="172" y="108" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">100</text>
      </svg>
      <p
        className="text-[40px] font-bold -mt-4 leading-none"
        style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}
      >
        {score}
      </p>
      <p className="text-[12px] font-semibold text-slate-300 mt-1">Moderate Inefficiency</p>
      <p className="text-[10px] text-slate-600 mt-0.5">Higher inefficiency = more opportunities</p>
      <p className="text-[10px] mt-2" style={{ color: '#36E7A1' }}>This is +14 higher than last week</p>
    </div>
  );
}

// ─── Top Opportunities ───────────────────────────────────────────────────────

function TopOpportunities({ players }: { players: ArbitragePlayer[] }) {
  const top = players.filter((p) => p.signal === 'UNDERVALUED').slice(0, 3);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">TOP ARBITRAGE OPPORTUNITIES</p>
        <button className="text-[11px]" style={{ color: '#36E7A1' }}>View All Opportunities →</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {['', 'PLAYER', 'BVI', 'KTC', 'EDGE', 'BEST LEAGUE TYPE', 'ACTION'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] text-slate-600 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.playerId} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3 text-slate-500 font-mono font-bold">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar name={p.name} pos={p.position} />
                    <div>
                      <p className="text-white font-medium">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.position} · {p.team}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{p.bvi.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#22D3EE' }}>{p.ktc.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>+{p.divergence.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-400">{i === 0 ? 'All Leagues' : i === 1 ? 'Contending' : 'Rebuilding'}</td>
                <td className="px-4 py-3">
                  <button
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    style={{ background: 'rgba(54,231,161,0.15)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.3)' }}
                  >
                    BUY LOW
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Simple placeholder for non-board tabs ───────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.2)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="#36E7A1" strokeWidth="1.5"/><path d="M11 7v4l2 2" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <p className="text-[14px] font-semibold text-white">{label}</p>
      <p className="text-[12px] text-slate-500">Coming soon — data loading from BVI engine</p>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ArbitragePage() {
  const [data,      setData]      = useState<ArbitrageResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>('ARBITRAGE BOARD');
  const [page,      setPage]      = useState(1);
  const [filters,   setFilters]   = useState<Filters>({ q: '', position: '', team: '', tier: '' });

  const fetchData = useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.q)        params.set('q', f.q);
      if (f.position) params.set('position', f.position);
      if (f.team)     params.set('team', f.team);
      if (f.tier)     params.set('tier', f.tier);
      params.set('page', p.toString());
      const res = await fetch(`/api/players/arbitrage?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, filters);
  }, [fetchData, page, filters]);

  const handleFilters = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div className="min-h-dvh bg-[#0a0d14] px-4 md:px-6 py-6 pb-20 md:pb-6">
      {/* Page header */}
      <div className="mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-white">Arbitrage</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Find market inefficiencies. Buy low, sell high, win your league.</p>
          </div>

          {/* Data sources legend */}
          <div
            className="rounded-xl px-4 py-3 text-[11px] flex flex-col gap-1.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-slate-500 font-semibold">Data Sources</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: '#36E7A1' }} />
                <span className="text-slate-400">BVI (Boom Value Index)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: '#22D3EE' }} />
                <span className="text-slate-400">KTC (KeepTradeCut)</span>
              </div>
            </div>
            <p className="text-slate-600">Last Updated: {loading ? '...' : '10m ago'}</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar data={data} />

      {/* Tabs */}
      <TabNav active={tab} onChange={(t) => setTab(t)} />

      {tab === 'ARBITRAGE BOARD' ? (
        <>
          {/* Filter Bar */}
          <FilterBar filters={filters} onChange={handleFilters} />

          {/* Loading skeleton */}
          {loading && !data && (
            <div className="rounded-xl overflow-hidden mb-5 animate-pulse" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="w-6 h-3 bg-white/[0.06] rounded" />
                  <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                  <div className="h-3 bg-white/[0.06] rounded w-32" />
                  <div className="ml-auto h-3 bg-white/[0.06] rounded w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Divergence Table */}
          {data && (
            <DivergenceTable
              players={data.players}
              total={data.total}
              page={page}
              onPage={setPage}
            />
          )}

          {/* Bottom row: Top Opportunities + Market Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            {data && <TopOpportunities players={data.players} />}
            <MarketGauge score={72} />
          </div>

          {/* What is Arbitrage section */}
          <div className="mt-5 pt-5 border-t flex items-start justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-[12px] font-bold text-white mb-1">What is Arbitrage?</p>
              <p className="text-[11px] text-slate-500 max-w-xl">
                Arbitrage identifies players with a significant gap between our proprietary BVI score and public market values (KTC).
              </p>
            </div>
            <button className="text-[11px] flex-shrink-0" style={{ color: '#36E7A1' }}>Learn More</button>
          </div>
        </>
      ) : tab === 'BUY LOW TARGETS' ? (
        <PlaceholderTab label="Buy Low Targets" />
      ) : tab === 'SELL HIGH TARGETS' ? (
        <PlaceholderTab label="Sell High Targets" />
      ) : tab === 'POSITIONAL BREAKDOWN' ? (
        <PlaceholderTab label="Positional Breakdown" />
      ) : tab === 'VALUE TRENDS' ? (
        <PlaceholderTab label="Value Trends" />
      ) : (
        <PlaceholderTab label="League Impact" />
      )}
    </div>
  );
}
