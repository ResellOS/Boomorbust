'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { TradeTarget, TradeTargetsResponse, TradeVerdict } from '@/app/api/dashboard/trade-targets/route';

// ─── Verdict badge ────────────────────────────────────────────────────────────

const VERDICT_STYLES: Record<TradeVerdict, { bg: string; text: string; border: string }> = {
  SMASH: {
    bg:     'rgba(6,78,59,0.6)',
    text:   '#34d399',
    border: 'rgba(52,211,153,0.3)',
  },
  'STRONG BUY': {
    bg:     'rgba(6,78,59,0.6)',
    text:   '#34d399',
    border: 'rgba(52,211,153,0.3)',
  },
  BUY: {
    bg:     'rgba(8,51,68,0.6)',
    text:   '#22d3ee',
    border: 'rgba(34,211,238,0.3)',
  },
  MONITOR: {
    bg:     'rgba(30,27,75,0.6)',
    text:   '#a78bfa',
    border: 'rgba(167,139,250,0.3)',
  },
};

function VerdictBadge({ verdict }: { verdict: TradeVerdict }) {
  const s = VERDICT_STYLES[verdict];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full font-medium uppercase"
      style={{
        background:    s.bg,
        color:         s.text,
        border:        `1px solid ${s.border}`,
        fontSize:      11,
        letterSpacing: '0.04em',
        fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
        whiteSpace:    'nowrap',
      }}
    >
      {verdict}
    </span>
  );
}

// ─── Player avatar ────────────────────────────────────────────────────────────

function PlayerAvatar({ name, position, photoUrl }: { name: string; position: string; photoUrl: string }) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const POS_COLORS: Record<string, string> = {
    WR: '#22D3EE',
    RB: '#36E7A1',
    QB: '#FBBF24',
    TE: '#A78BFA',
  };
  const color = POS_COLORS[position.toUpperCase()] ?? '#94a3b8';

  if (imgError || !photoUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-full shrink-0 text-xs font-semibold"
        style={{
          width:      36,
          height:     36,
          background: `${color}22`,
          color,
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:   12,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: 36, height: 36 }}>
      <Image
        src={photoUrl}
        alt={name}
        width={36}
        height={36}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ even }: { even: boolean }) {
  return (
    <tr
      className="animate-pulse"
      style={{ background: even ? 'rgba(255,255,255,0.02)' : 'transparent' }}
      aria-hidden
    >
      {/* Player */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/[0.07] shrink-0" style={{ width: 36, height: 36 }} />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-28 rounded bg-white/[0.07]" />
            <div className="h-2.5 w-16 rounded bg-white/[0.05]" />
          </div>
        </div>
      </td>
      {/* League */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="h-3 w-20 rounded bg-white/[0.05]" />
      </td>
      {/* TRE Score */}
      <td className="px-4 py-3">
        <div className="h-3.5 w-10 rounded bg-white/[0.07]" />
      </td>
      {/* Acquire Cost */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="h-3 w-20 rounded bg-white/[0.05]" />
      </td>
      {/* Verdict */}
      <td className="px-4 py-3">
        <div className="h-5 w-20 rounded-full bg-white/[0.07]" />
      </td>
    </tr>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TargetRow({ target, even }: { target: TradeTarget; even: boolean }) {
  const [hovered, setHovered] = useState(false);

  const rowBg = hovered
    ? 'rgba(255,255,255,0.04)'
    : even
      ? 'rgba(255,255,255,0.02)'
      : 'transparent';

  return (
    <tr
      style={{
        background:   rowBg,
        transition:   'background 150ms ease',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor:       'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Player */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <PlayerAvatar
            name={target.name}
            position={target.position}
            photoUrl={target.photoUrl}
          />
          <div className="flex flex-col min-w-0">
            <span
              className="font-medium leading-tight truncate"
              style={{
                fontFamily: 'var(--font-body), Inter, sans-serif',
                fontSize:   13,
                color:      '#ffffff',
              }}
            >
              {target.name}
            </span>
            <span
              className="leading-tight truncate"
              style={{
                fontFamily: 'var(--font-body), Inter, sans-serif',
                fontSize:   11,
                color:      '#64748B',
              }}
            >
              {target.position} · {target.team}
            </span>
          </div>
        </div>
      </td>

      {/* League — hidden on mobile */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span
          className="truncate block"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   12,
            color:      '#94a3b8',
            maxWidth:   120,
          }}
          title={target.leagueName}
        >
          {target.leagueName}
        </span>
      </td>

      {/* TRE Score */}
      <td className="px-4 py-3">
        <span
          style={{
            fontFamily:   'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:     14,
            color:        '#36E7A1',
            fontVariant:  'tabular-nums',
            letterSpacing: '0.01em',
          }}
        >
          {target.treScore}
        </span>
      </td>

      {/* Acquire Cost — hidden on small screens */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   12,
            color:      '#ffffff',
          }}
        >
          {target.acquireCost}
        </span>
      </td>

      {/* Verdict */}
      <td className="px-4 py-3">
        <VerdictBadge verdict={target.verdict} />
      </td>
    </tr>
  );
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-2.5 text-left font-medium uppercase tracking-wider ${className ?? ''}`}
      style={{
        fontFamily:    'var(--font-body), Inter, sans-serif',
        fontSize:      10,
        color:         '#475569',
        letterSpacing: '0.06em',
        borderBottom:  '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </th>
  );
}

// ─── TradeTargetsPanel ────────────────────────────────────────────────────────

export interface TradeTargetsPanelProps {
  className?: string;
}

export default function TradeTargetsPanel({ className }: TradeTargetsPanelProps) {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);

  const [targets, setTargets] = useState<TradeTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const lgParam = activeLeagueId ?? 'all';
    const url = `/api/dashboard/trade-targets?leagueId=${encodeURIComponent(lgParam)}&limit=5`;

    (async () => {
      try {
        const res = await fetch(url, { credentials: 'include', signal: controller.signal });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as TradeTargetsResponse;
        setTargets(json.targets ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setTargets([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeLeagueId]);

  return (
    <section
      className={`rounded-xl overflow-hidden ${className ?? ''}`}
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* ── Panel header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="uppercase tracking-widest"
          style={{
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      12,
            color:         '#64748B',
            letterSpacing: '0.1em',
          }}
        >
          Recommended Trade Targets
        </span>
        <Link
          href="/trade-hub"
          className="transition-colors duration-150 hover:underline"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   12,
            color:      '#22D3EE',
          }}
        >
          View All Targets →
        </Link>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <ColHeader>Player</ColHeader>
              <ColHeader className="hidden sm:table-cell">League</ColHeader>
              <ColHeader>TRE Score</ColHeader>
              <ColHeader className="hidden md:table-cell">Acquire Cost</ColHeader>
              <ColHeader>Verdict</ColHeader>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} even={i % 2 === 1} />
              ))
            ) : targets.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center"
                  style={{
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                    fontSize:   13,
                    color:      '#64748B',
                  }}
                >
                  No trade targets found for this league.
                </td>
              </tr>
            ) : (
              targets.map((t, i) => (
                <TargetRow key={`${t.playerId}-${t.leagueId}`} target={t} even={i % 2 === 1} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── View all link ─────────────────────────────────────────── */}
      {!loading && targets.length > 0 && (
        <div
          className="flex items-center justify-center px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <Link
            href="/trade-hub"
            className="transition-colors duration-150 hover:underline"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize:   12,
              color:      '#22D3EE',
            }}
          >
            View All →
          </Link>
        </div>
      )}
    </section>
  );
}
