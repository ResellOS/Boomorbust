'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

const SECTIONS = ['dash', 'portfolio', 'rankings'] as const;

export default function HeroMockup() {
  const [section, setSection] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setSection((s) => (s + 1) % SECTIONS.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="relative card-lg overflow-hidden animate-float"
      style={{
        boxShadow:
          '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1), 0 0 120px rgba(99,102,241,0.08)',
        background: 'var(--bg-card)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center flex-1 truncate px-2">
          Good morning, Champ 👑 <span className="text-[var(--text-muted)]">·</span> Week 8 · 6 leagues synced
        </p>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span className="text-xs hidden sm:inline">All Leagues (6) ▾</span>
          <span className="text-sm">⚙</span>
        </div>
      </div>

      <div
        className={clsx(
          'p-4 min-h-[340px] transition-opacity duration-300',
          fade ? 'opacity-100' : 'opacity-0'
        )}
      >
        {SECTIONS[section] === 'dash' && <MockDash />}
        {SECTIONS[section] === 'portfolio' && <MockPortfolio />}
        {SECTIONS[section] === 'rankings' && <MockRankings />}
      </div>

      <div className="flex justify-center gap-2 pb-4">
        {SECTIONS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`View section ${i + 1}`}
            onClick={() => {
              setFade(false);
              setTimeout(() => {
                setSection(i);
                setFade(true);
              }, 250);
            }}
            className={clsx(
              'h-2 rounded-full transition-all',
              section === i ? 'w-6 bg-[var(--indigo)]' : 'w-2 bg-[var(--text-muted)]'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MockDash() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm p-3 border border-green-500/20">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Week 8 Lineup Edge</p>
          <p className="display text-[36px] text-green-400 leading-none my-2">+18.4</p>
          <svg viewBox="0 0 80 28" className="w-full h-7">
            <path
              d="M0 20 L15 14 L30 18 L45 8 L60 12 L80 4"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
            />
          </svg>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">vs optimal lineups</p>
          <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/15 text-green-400">
            ↑ Projected edge
          </span>
        </div>
        <div className="card-sm p-3 border border-red-500/25">
          <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">⊗ TRADE ALERT</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">You&apos;re overpaying by</p>
          <p className="display text-[36px] text-red-400 leading-none">22%</p>
          <p className="text-xs text-white">For James Conner</p>
          <div className="flex gap-2 mt-2 text-[10px]">
            <span className="bg-white/5 rounded px-2 py-1">A. St.Brown WR</span>
            <span className="text-[var(--text-muted)]">vs</span>
            <span className="bg-white/5 rounded px-2 py-1">J. Conner RB</span>
          </div>
          <button type="button" className="mt-2 text-[11px] font-bold text-[var(--indigo)]">
            View Trade
          </button>
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-2">League overview · 8 of 8 synced</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {['North Star', 'Bloodbath', 'Dynasty Dogs', 'Win Now'].map((n, i) => (
            <div
              key={n}
              className="flex items-center gap-2 shrink-0 rounded-lg px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500/30" />
              <div>
                <p className="text-xs font-semibold text-white whitespace-nowrap">{n}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {(5 + i) % 3}-{10 - i} · #{((i % 4) + 1) as 1 | 2 | 3 | 4}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockPortfolio() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card-sm p-4 border border-[var(--border)]">
        <p className="text-xs font-bold text-[var(--text-secondary)] mb-3">Portfolio exposure</p>
        <div className="space-y-3 text-sm">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white">Bijan Robinson</span>
              <span className="text-red-400">4/6 leagues</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-surface)]">
              <div className="h-full rounded-full bg-red-500/60" style={{ width: '80%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white">CeeDee Lamb</span>
              <span className="text-amber-400">3/6 leagues</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-surface)]">
              <div className="h-full w-[55%] rounded-full bg-amber-500/50" />
            </div>
          </div>
          <p className="text-[11px] text-amber-400 border border-amber-500/30 rounded px-2 py-1 inline-block">
            ⚠ High concentration risk
          </p>
        </div>
      </div>
      <div className="card-sm p-4 border border-[var(--border)]">
        <p className="text-xs font-bold text-[var(--indigo)] mb-2 flex items-center gap-1">
          <span>✦</span> Dynasty Analyst
        </p>
        <div className="space-y-2 text-[11px]">
          <div className="bg-[var(--indigo)] rounded-lg px-3 py-2 text-white rounded-tr-sm max-w-[92%] ml-auto">
            Should I sell Bijan?
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-secondary)] rounded-tl-sm">
            Yes — you&apos;re rebuilding and he&apos;s concentrated across 4/6 leagues. Sell into win-now contenders.
          </div>
          <div className="flex gap-1 pl-2 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '120ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '240ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_IDS = ['4046', '6794', '7564'] as const;

function MockRankings() {
  return (
    <div className="text-[11px]">
      <div className="grid grid-cols-[1fr_32px_40px_52px_48px_56px] gap-2 text-[var(--text-muted)] uppercase tracking-wide text-[9px] mb-2 border-b border-[var(--border)] pb-2">
        <span>Player</span>
        <span>Age</span>
        <span>PPG</span>
        <span>BBV</span>
        <span>KTC</span>
        <span>Signal</span>
      </div>
      {[
        { id: DEMO_IDS[0], name: 'D. Adams', pos: 'WR', age: 32, ppg: 14.2, v: 4200 },
        { id: DEMO_IDS[1], name: 'J. Jefferson', pos: 'WR', age: 26, ppg: 17.8, v: 8900 },
        { id: DEMO_IDS[2], name: 'C. Lamb', pos: 'WR', age: 26, ppg: 16.4, v: 7200 },
      ].map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-[1fr_32px_40px_52px_48px_56px] gap-2 items-center py-2 border-b border-[var(--border)]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={`https://sleepercdn.com/content/nfl/players/${r.id}.jpg`}
              width={28}
              height={28}
              alt=""
              className="rounded-full object-cover border border-[var(--border)]"
              unoptimized
            />
            <span className="text-white truncate font-medium">{r.name}</span>
            <span className="text-[9px] px-1 rounded bg-blue-500/15 text-blue-300 shrink-0">{r.pos}</span>
          </div>
          <span>{r.age}</span>
          <span>{r.ppg}</span>
          <span className="text-cyan-300">{r.v}</span>
          <span className="text-[var(--text-muted)]">–</span>
          <span className="text-[10px] font-bold text-green-400 border border-green-500/30 rounded px-1.5 py-0.5 text-center">
            HOLD
          </span>
        </div>
      ))}
    </div>
  );
}
