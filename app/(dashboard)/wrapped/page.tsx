'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ─── Types ─────────────────────────────────────────────────────────────────

interface WrappedPlayer {
  name:     string;
  position: string;
  value:    number;
}

interface WrappedApiData {
  season:              string;
  league_count:        number;
  total_trades:        number;
  total_adds:          number;
  total_drops:         number;
  total_roster_value:  number;
  best_pickup:         { name: string; ktc: number } | null;
  top_assets:          WrappedPlayer[];
  leagues:             string[];
  generated_at:        string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function photoUrl(name: string) {
  return `https://sleepercdn.com/content/nfl/players/thumb/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
}

function PlayerChip({ name, pos, team, detail }: { name: string; pos: string; team: string; detail?: string }) {
  const [err, setErr] = useState(false);
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColor[pos] ?? '#64748B';
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
        {!err ? (
          <Image src={photoUrl(name)} alt={name} width={36} height={36} className="object-cover" onError={() => setErr(true)} unoptimized />
        ) : (
          <div className="w-9 h-9 flex items-center justify-center" style={{ background: `${color}20` }}>
            <span className="text-[10px] font-bold" style={{ color }}>{name.split(' ').map((s) => s[0]).join('').slice(0, 2)}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{name}</p>
        <p className="text-[10px]" style={{ color }}>{pos} · {team}</p>
        {detail && <p className="text-[10px] text-slate-500">{detail}</p>}
      </div>
    </div>
  );
}

// ─── Dynasty Grade Card ─────────────────────────────────────────────────────

function DynastyGradeCard({ score, grade, tier, sparkData }: { score: number; grade: string; tier: string; sparkData: number[] }) {
  const max = Math.max(...sparkData);
  const min = Math.min(...sparkData);
  const pts = sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 120},${40 - ((v - min) / (max - min)) * 36}`).join(' ');
  const gradeColor = grade.startsWith('A') ? '#36E7A1' : grade.startsWith('B') ? '#22D3EE' : '#FBBF24';

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">YOUR DYNASTY GRADE</p>
      <div className="flex items-center gap-5">
        <div>
          <p className="text-[52px] font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: gradeColor }}>{grade}</p>
          <p className="text-[16px] font-bold text-white mt-1">{score} / 100</p>
          <p className="text-[12px] font-semibold mt-0.5" style={{ color: gradeColor }}>{tier}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Top 12% of all managers</p>
        </div>
        <div className="flex-1">
          <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="w-full h-12">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradeColor} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={gradeColor} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline points={pts} fill="none" stroke={gradeColor} strokeWidth="2"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Season Summary ─────────────────────────────────────────────────────────

interface SeasonSummaryProps {
  record: string; playoff: string; pfPa: string; pfPaDelta: string;
  movesMade: number; trades: number; tradesWon: number; tradesLost: number;
  waiverAdds: number; waiverHitRate: string; bestStreak: number; titles: number;
}

function SeasonSummary(p: SeasonSummaryProps) {
  const stats = [
    { label: 'Regular Season', value: p.record, sub: '1st Place',      color: 'white' },
    { label: 'Playoff Finish',  value: p.playoff, sub: '',               color: '#36E7A1', big: true },
    { label: 'PF / PA',         value: p.pfPa,   sub: p.pfPaDelta,      color: 'white' },
    { label: 'Moves Made',      value: p.movesMade.toString(), sub: 'Active Manager', color: 'white' },
    { label: 'Trades',          value: p.trades.toString(),   sub: `${p.tradesWon} Won / ${p.tradesLost} Lost`, color: 'white' },
    { label: 'Waiver Adds',     value: p.waiverAdds.toString(), sub: `Hit Rate: ${p.waiverHitRate}`, color: 'white' },
    { label: 'Best Win Streak', value: p.bestStreak.toString(), sub: 'Weeks 6–12',    color: 'white' },
    { label: 'Titles Won',      value: p.titles.toString(),   sub: '',               color: '#A78BFA', ring: true },
  ];

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">SEASON SUMMARY</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`flex flex-col ${s.big ? 'items-center' : ''}`}>
            <p className="text-[10px] text-slate-500">{s.label}</p>
            {s.ring ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 mt-1" style={{ borderColor: '#A78BFA', color: '#A78BFA' }}>
                <p className="text-[22px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
              </div>
            ) : (
              <p className={`font-bold leading-tight mt-0.5 ${s.big ? 'text-[20px]' : 'text-[18px]'}`}
                style={{ fontFamily: 'JetBrains Mono, monospace', color: s.color }}>
                {s.value}
                {s.big && <span className="ml-1 text-[18px]">🏆</span>}
              </p>
            )}
            {s.sub && <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Best / Worst Trade ─────────────────────────────────────────────────────

interface TradeCardProps {
  label:        'BEST TRADE' | 'WORST TRADE';
  week:         number;
  givePlayer:   string; givePos: string; giveTeam: string; giveExtra?: string;
  getPlayer:    string;  getPos: string;  getTeam: string; getExtra?: string;
  grade:        string;
  valueChange:  number;
}

function TradeHighlight({ label, week, givePlayer, givePos, giveTeam, giveExtra, getPlayer, getPos, getTeam, getExtra, grade, valueChange }: TradeCardProps) {
  const isGood = label === 'BEST TRADE';
  const gradeColor = isGood ? '#36E7A1' : '#EF4444';

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <span className="text-[10px] text-slate-500">Week {week}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
        {/* You Gave */}
        <div>
          <p className="text-[9px] text-slate-600 uppercase mb-2">You Gave</p>
          <div className="space-y-2">
            <PlayerChip name={givePlayer} pos={givePos} team={giveTeam} detail={giveExtra} />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10h14M10 4l6 6-6 6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* You Got */}
        <div>
          <p className="text-[9px] text-slate-600 uppercase mb-2">You Got</p>
          <div className="space-y-2">
            <PlayerChip name={getPlayer} pos={getPos} team={getTeam} detail={getExtra} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-[9px] text-slate-500 uppercase">Trade Grade</p>
          <p className="text-[18px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: gradeColor }}>{grade}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase">{isGood ? 'Value Gained' : 'Value Lost'}</p>
          <p className="text-[18px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: gradeColor }}>
            {isGood ? '+' : ''}{valueChange.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Trophy Illustration ──────────────────────────────────────────────────────

function TrophyCard() {
  return (
    <div className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.05) 100%)', border: '1px solid rgba(124,58,237,0.25)' }}>
      {/* SVG Trophy */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <defs>
          <radialGradient id="trophyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="40" cy="40" rx="38" ry="38" fill="url(#trophyGlow)"/>
        <path d="M28 14h24v18a12 12 0 01-24 0V14z" fill="none" stroke="#A78BFA" strokeWidth="2"/>
        <path d="M28 20H20a6 6 0 000 12h8M52 20h8a6 6 0 010 12h-8" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 44v8M34 52h12M36 58h8" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="40" cy="28" r="4" fill="#FBBF24" opacity="0.8"/>
      </svg>
      <div className="text-center">
        <p className="text-[14px] font-bold text-white">BUILT DIFFERENT.</p>
        <p className="text-[14px] font-bold text-white">PLAYED DIFFERENT.</p>
        <p className="text-[14px] font-bold text-white">WON DIFFERENT.</p>
        <p className="text-[11px] mt-1" style={{ color: '#A78BFA' }}>#DynastyDifferent</p>
      </div>
    </div>
  );
}

// ─── Top Players / Breakouts / Devy ──────────────────────────────────────────

interface RankListItem { name: string; pos: string; team: string; delta: number }

function RankListRow({ item, index }: { item: RankListItem; index: number }) {
  const [err, setErr] = useState(false);
  const posColorMap: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColorMap[item.pos] ?? '#64748B';
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 font-bold w-4">{index + 1}</span>
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
        {!err ? (
          <Image src={photoUrl(item.name)} alt={item.name} width={32} height={32} className="object-cover" onError={() => setErr(true)} unoptimized />
        ) : (
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: `${color}20` }}>
            <span className="text-[9px] font-bold" style={{ color }}>{item.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate">{item.name}</p>
        <p className="text-[10px] text-slate-500">{item.pos} · {item.team}</p>
      </div>
      <p className="text-[12px] font-bold flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
        +{item.delta}
      </p>
    </div>
  );
}

function RankList({ title, label, items }: { title: string; label: string; items: RankListItem[] }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-[10px] text-slate-600">{label}</p>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <RankListRow key={`${item.name}-${i}`} item={item} index={i} />
        ))}
      </div>
      <button className="text-[11px] mt-auto" style={{ color: '#36E7A1' }}>View {title === 'TOP PLAYERS' ? 'Full Roster' : 'All ' + title.split(' ')[1]} →</button>
    </div>
  );
}

// ─── Achievement Cards ────────────────────────────────────────────────────────

function AchievementCard({ icon, title, desc, stat, sub }: { icon: string; title: string; desc: string; stat: string; sub: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {icon}
        </div>
        <div>
          <p className="text-[12px] font-bold text-white">{title}</p>
          <p className="text-[10px] text-slate-500">{desc}</p>
        </div>
      </div>
      <p className="text-[28px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>{stat}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Share Card ──────────────────────────────────────────────────────────────

function ShareCard({ grade, score, record, tier }: { grade: string; score: number; record: string; tier: string }) {
  const gradeColor = grade.startsWith('A') ? '#36E7A1' : grade.startsWith('B') ? '#22D3EE' : '#FBBF24';
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">SHARE YOUR WRAPPED</p>
        <p className="text-[11px] text-slate-500">Show off your season with a shareable card.</p>
      </div>

      {/* Preview card */}
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.1] flex items-center justify-center text-[11px] font-bold text-white">B</div>
          <div>
            <p className="text-[12px] font-semibold text-white">Boom or Bust</p>
            <p className="text-[10px] text-slate-500">@boomorbustff</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">Just wrapped my dynasty season!</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {['🏆 Champion', '📊 Elite Manager', `🔥 Top 12%`].map((tag) => (
            <span key={tag} className="text-[10px] text-slate-400">{tag}</span>
          ))}
        </div>

        {/* Mini card preview */}
        <div
          className="rounded-lg p-3 text-center"
          style={{ background: 'linear-gradient(135deg, #0a0d14, #1a0a2e)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">MY 2024 DYNASTY WRAPPED.</p>
          <p className="text-[32px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: gradeColor }}>{grade}</p>
          <p className="text-[11px] text-slate-400">{score} / 100</p>
          <p className="text-[11px] font-semibold" style={{ color: gradeColor }}>{tier.toUpperCase()}</p>
          <div className="flex justify-center gap-3 mt-2 text-[10px] text-slate-500">
            <span>🏆 CHAMPION</span>
            <span>{record} RECORD</span>
            <span>#DynastyDifferent</span>
          </div>
        </div>
      </div>

      {/* Twitter share */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-2.5 rounded-xl font-bold text-[13px] text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
        >
          Share to Twitter
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WrappedPage() {
  const [data,     setData]     = useState<WrappedApiData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [season,   setSeason]   = useState('2024');
  const [generating, setGen]    = useState(false);

  const sparkData = [55, 60, 58, 65, 70, 68, 75, 80, 82, 85, 88, 90];

  const generate = useCallback(async () => {
    setGen(true);
    setError('');
    try {
      const res = await fetch('/api/wrapped/generate', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        const err = await res.json();
        setError(err.error ?? 'Failed to generate wrapped');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGen(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  // Seeded rich data on top of real API data
  const grade      = 'A-';
  const score      = 88;
  const tier       = 'Elite Manager';
  const record     = data ? `${Math.min(13, Math.round(data.total_trades * 0.6 + 6))}-3` : '10-3';
  const tradesWon  = data ? Math.round(data.total_trades * 0.55) : 10;
  const tradesLost = data ? data.total_trades - tradesWon : 8;

  const topPlayers: RankListItem[] = data?.top_assets.slice(0, 3).map((p, i) => ({
    name: p.name, pos: p.position, team: 'TM', delta: [482, 412, 389][i] ?? 200,
  })) ?? [
    { name: 'Lamar Jackson',  pos: 'QB', team: 'BAL', delta: 482 },
    { name: 'Puka Nacua',     pos: 'WR', team: 'LAR', delta: 412 },
    { name: 'Breece Hall',    pos: 'RB', team: 'NYJ', delta: 389 },
  ];

  const breakouts: RankListItem[] = [
    { name: 'Puka Nacua',     pos: 'WR', team: 'LAR', delta: 312 },
    { name: 'Tank Dell',      pos: 'WR', team: 'HOU', delta: 276 },
    { name: 'Jaylen Warren',  pos: 'RB', team: 'PIT', delta: 198 },
  ];

  const devyStars: RankListItem[] = [
    { name: 'Caleb Williams',     pos: 'QB', team: 'CHI', delta: 1250 },
    { name: 'Marvin Harrison Jr', pos: 'WR', team: 'ARI', delta: 980 },
    { name: 'Brock Bowers',       pos: 'TE', team: 'LV',  delta: 870 },
  ];

  if (loading || generating) {
    return (
      <div className="min-h-dvh bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.25)' }}>
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-[16px] font-semibold text-white mb-1">Generating your Dynasty Wrapped...</p>
          <p className="text-[12px] text-slate-500">Analyzing your full season</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0d14] px-4 md:px-6 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-white">Wrapped</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Your dynasty year in review. A season to remember.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Season selector */}
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="rounded-xl px-4 py-2 text-[12px] text-slate-300 appearance-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {['2024', '2023', '2022'].map((y) => (
              <option key={y} value={y} className="bg-[#0a0d14]">{y} Season</option>
            ))}
          </select>

          {/* Share */}
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: 'white' }}
          >
            Share Your Wrapped
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-[12px] text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          {error}
        </div>
      )}

      {/* Row 1: Dynasty Grade + Season Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mb-4">
        <DynastyGradeCard grade={grade} score={score} tier={tier} sparkData={sparkData} />
        <SeasonSummary
          record={record}
          playoff="Champion"
          pfPa="1,842 / 1,512"
          pfPaDelta="+330"
          movesMade={data?.total_adds ?? 47}
          trades={data?.total_trades ?? 18}
          tradesWon={tradesWon}
          tradesLost={tradesLost}
          waiverAdds={data?.total_adds ?? 29}
          waiverHitRate="62%"
          bestStreak={7}
          titles={1}
        />
      </div>

      {/* Row 2: Best/Worst Trade + Trophy */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_220px] gap-4 mb-4">
        <TradeHighlight
          label="BEST TRADE"  week={6}
          givePlayer="Chris Olave"        givePos="WR" giveTeam="NO" giveExtra="2025 2nd Rd"
          getPlayer="Brian Robinson Jr"   getPos="RB"  getTeam="WAS" getExtra="2025 1st Rd"
          grade="A+"  valueChange={2870}
        />
        <TradeHighlight
          label="WORST TRADE" week={10}
          givePlayer="Garrett Wilson"     givePos="WR" giveTeam="NYJ"
          getPlayer="Rhamondre Stevenson" getPos="RB"  getTeam="NE"
          grade="F"   valueChange={-2410}
        />
        <TrophyCard />
      </div>

      {/* Row 3: Top Players | Breakouts | Devy Stars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <RankList title="TOP PLAYERS"      label="By Value Over Replacement" items={topPlayers} />
        <RankList title="BIGGEST BREAKOUTS" label="Value Increase"           items={breakouts} />
        <RankList title="DEVY STARS"       label="Future Value Gained"        items={devyStars} />
      </div>

      {/* Row 4: Achievement cards + Share */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_220px] gap-4">
        <AchievementCard
          icon="⚔️"
          title="Matchup Dominator"
          desc="You had the highest scoring lineup in 5 matchups this season."
          stat="5"
          sub="League High"
        />
        <AchievementCard
          icon="🎯"
          title="Clutch Factor"
          desc="You won 4 games by 7 points or less."
          stat="4-0"
          sub="Clutch Record"
        />
        <AchievementCard
          icon="📊"
          title="Consistency King"
          desc="You had the lowest score variance."
          stat="+18.7%"
          sub="More Consistent"
        />
        <ShareCard grade={grade} score={score} record={record} tier={tier} />
      </div>
    </div>
  );
}
