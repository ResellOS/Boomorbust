'use client';

import { Suspense, useEffect, useMemo, useId, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  X,
  History,
  Sparkles,
  Loader2,
  ChevronRight,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { KTCPlayer } from '@/lib/values/ktc';
import type { TradeAnalysis } from '@/lib/values/engine';
import { usePreferences } from '@/store/preferences';

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG = '#0B0E14';
const BORDER = '#1F2937';
const CARD = '#080C11';
const CARD2 = '#0D1117';
const TEXT_SEC = '#94a3b8';
const TEXT_MUTED = '#64748b';
const INDIGO = '#6366f1';
const CYAN = '#22d3ee';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const GOLD = '#f59e0b';

const FONT_BEBAS = { fontFamily: 'var(--font-bebas-neue), "Bebas Neue", Impact, sans-serif' } as const;
const FONT_INTER = { fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' } as const;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface TradePlayer {
  id: string;
  player_id?: string | null;
  name: string;
  position: string;
  age: number | null;
  ktc_value: number;
}

interface DraftPick {
  uid: string;
  season: string;
  round: number;
  slot: 'early' | 'mid' | 'late';
  team?: string;
}

interface BreakdownRow {
  name: string;
  position: string;
  age: number | null;
  team: string | null;
  ktc_value: number;
  bbv_value: number | null;
  sleeper_id: string | null;
}

interface AnalyzePayload {
  analysis: TradeAnalysis;
  roundsLabel: string;
  dimensionScores: Record<'dynasty_value' | 'contention_fit' | 'positional_need' | 'age_curve', number>;
  dimensionNotes: Record<'dynasty_value' | 'contention_fit' | 'positional_need' | 'age_curve', string>;
  breakdownYour: BreakdownRow[];
  breakdownTheir: BreakdownRow[];
  totalGiving: number;
  totalReceiving: number;
}

interface HistoryEntry {
  id: string;
  at: string;
  verdict: string;
  summary: string;
}

// ─── Position colors ─────────────────────────────────────────────────────────
const POS_STYLE: Record<string, { bg: string; text: string }> = {
  QB: { bg: `${INDIGO}30`, text: '#a5b4fc' },
  RB: { bg: `${GREEN}25`, text: GREEN },
  WR: { bg: `${CYAN}20`, text: CYAN },
  TE: { bg: `${AMBER}20`, text: AMBER },
  PICK: { bg: `${INDIGO}20`, text: '#818cf8' },
};

function posStyle(pos: string) {
  return POS_STYLE[pos] ?? { bg: 'rgba(255,255,255,0.08)', text: TEXT_SEC };
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function isoWeekStamp() {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wk = Math.floor((Number(t) - Number(new Date(t.getFullYear(), 0, 1))) / 604800000);
  return `${t.getFullYear()}-WK${wk}`;
}
function weekKey(uid: string) {
  return `bb_trade_week_${isoWeekStamp()}_${uid.slice(0, 8)}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function TerminalCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-sm border overflow-hidden',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_0_rgba(0,0,0,0.45)]',
        className
      )}
      style={{ background: CARD, borderColor: BORDER }}
    >
      {title && (
        <div
          className="flex items-center gap-2.5 border-b px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: BORDER }}
        >
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
            {title}
          </span>
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const s = posStyle(pos);
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {pos}
    </span>
  );
}

function PlayerAvatar({ pid, name, size = 40 }: { pid?: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!pid || broken) {
    return (
      <div
        className="shrink-0 rounded flex items-center justify-center text-xs font-bold text-white"
        style={{ width: size, height: size, background: `${INDIGO}44` }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={`https://sleepercdn.com/content/nfl/players/${pid}.jpg`}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded object-cover"
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  );
}

const POS_BORDER: Record<string, string> = {
  QB: '#6366f180',
  RB: '#34d39980',
  WR: '#22d3ee66',
  TE: '#f59e0b66',
};

const POS_ACCENT: Record<string, string> = {
  QB: '#6366f1',
  RB: '#34d399',
  WR: '#22d3ee',
  TE: '#f59e0b',
};

function PlayerChip({
  p,
  onRemove,
  onClick,
  active,
}: {
  p: TradePlayer;
  onRemove: () => void;
  onClick?: () => void;
  active?: boolean;
}) {
  const posBorderColor = active ? undefined : (POS_BORDER[p.position] ?? BORDER);
  const posAccentColor = POS_ACCENT[p.position] ?? INDIGO;
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-sm border px-2.5 py-2 transition-colors cursor-pointer overflow-hidden relative',
        active ? 'border-[#22d3ee]/60 bg-[#22d3ee]/5' : 'hover:border-[#374151]'
      )}
      style={{ borderColor: posBorderColor, background: active ? undefined : CARD2 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${p.name} – click for analysis`}
    >
      {/* Position accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: posAccentColor, opacity: 0.6 }}
      />
      <div className="ml-1 shrink-0">
        <PlayerAvatar pid={p.player_id} name={p.name} size={34} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <PosBadge pos={p.position} />
          <span className="text-sm font-medium text-white truncate" style={FONT_INTER}>
            {p.name}
          </span>
        </div>
        <span className="text-[10px] tabular-nums" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
          {p.ktc_value.toLocaleString()} KTC
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1.5 rounded hover:bg-white/5 transition-colors shrink-0"
        style={{ color: TEXT_MUTED }}
        aria-label={`Remove ${p.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PickChip({ pick, onRemove }: { pick: DraftPick; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-sm border px-2.5 py-2"
      style={{ background: `${GOLD}10`, borderColor: `${GOLD}40` }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold"
        style={{ background: `${GOLD}25`, color: GOLD, ...FONT_BEBAS }}
      >
        R{pick.round}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white" style={FONT_INTER}>
          {pick.season} Round {pick.round} · {pick.slot}
          {pick.team ? ` · ${pick.team}` : ''}
        </p>
        <p className="text-[10px]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
          Draft capital
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded hover:bg-white/5 shrink-0"
        style={{ color: TEXT_MUTED }}
        aria-label="Remove pick"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── BoomBustDial ────────────────────────────────────────────────────────────
function BoomBustDial({ valueDelta, maxValue }: { valueDelta: number; maxValue: number }) {
  const gradId = useId().replace(/:/g, '');
  const pct = Math.max(-1, Math.min(1, valueDelta / Math.max(maxValue, 1)));

  // Arc geometry: 240° arc from 210° to 330° going CCW through the top
  // In SVG coords: cx=100, cy=100, r=75
  const cx = 100;
  const cy = 100;
  const r = 75;

  // Start: 210° math angle → SVG coords
  const startRad = (210 * Math.PI) / 180;
  const startX = cx + r * Math.cos(startRad); // ≈ 35.05
  const startY = cy - r * Math.sin(startRad); // ≈ 137.5 (SVG y-flipped)

  // End: 330° math angle → SVG coords
  const endRad = (330 * Math.PI) / 180;
  const endX = cx + r * Math.cos(endRad);   // ≈ 164.95
  const endY = cy - r * Math.sin(endRad);   // ≈ 137.5

  // Full 240° arc path (large-arc-flag=1, sweep=0 for CCW)
  const bgArc = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${r} ${r} 0 1 0 ${endX.toFixed(2)} ${endY.toFixed(2)}`;

  // Needle: θ = 90 - pct * 120 (math degrees), pct in [-1, 1]
  // When pct=-1 → θ=210°, pct=0 → θ=90°, pct=1 → θ=-30°=330°
  const thetaDeg = 90 - pct * 120;
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const tipX = cx + 60 * Math.cos(thetaRad);
  const tipY = cy - 60 * Math.sin(thetaRad);

  const needleColor = pct > 0.1 ? '#10b981' : pct < -0.1 ? '#ef4444' : '#f59e0b';
  const absPct = Math.abs(pct * 100);
  const label = pct > 0.1 ? `+${absPct.toFixed(0)}% BOOM` : pct < -0.1 ? `-${absPct.toFixed(0)}% BUST` : `${absPct.toFixed(0)}% FAIR`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 160" width="100%" className="max-w-[200px]" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path d={bgArc} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        {/* Colored overlay arc */}
        <path d={bgArc} fill="none" stroke={`url(#${gradId})`} strokeWidth="8" strokeLinecap="round" strokeOpacity="0.85" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={tipX.toFixed(2)} y2={tipY.toFixed(2)} stroke={needleColor} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#0B0E14" stroke={needleColor} strokeWidth="2" />
        {/* Labels */}
        <text x="35" y="155" fontSize="10" fill="#ef4444" textAnchor="middle" fontFamily="var(--font-bebas-neue), 'Bebas Neue', Impact, sans-serif">BUST</text>
        <text x="165" y="155" fontSize="10" fill="#10b981" textAnchor="middle" fontFamily="var(--font-bebas-neue), 'Bebas Neue', Impact, sans-serif">BOOM</text>
      </svg>
      <p className="text-base leading-none tabular-nums mt-1" style={{ ...FONT_BEBAS, color: GOLD }}>{label}</p>
    </div>
  );
}

// ─── ExploitCard ──────────────────────────────────────────────────────────────
function ExploitCard({ label, badge, tone }: { label: string; badge: string; tone: 'boom' | 'bust' | 'neutral' }) {
  const badgeStyles = {
    boom: { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
    bust: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
    neutral: { bg: 'rgba(245,158,11,0.2)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs min-w-0 truncate" style={{ ...FONT_INTER, color: TEXT_SEC }}>
        {label}
      </span>
      <span
        className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
        style={{ background: badgeStyles.bg, color: badgeStyles.text, borderColor: badgeStyles.border, ...FONT_BEBAS, fontSize: '10px' }}
      >
        {badge}
      </span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BoomBustMeter({ delta }: { delta: number }) {
  const gradId = useId().replace(/:/g, '');
  const cap = 3000;
  const clamped = Math.max(-cap, Math.min(cap, delta));
  const pct = (clamped + cap) / (cap * 2); // 0..1

  // Arc: half-circle from left (0) to right (π)
  const cx = 80;
  const cy = 78;
  const r = 58;
  const startAngle = Math.PI;
  const endAngle = 0;

  function arc(start: number, end: number) {
    const sx = cx + r * Math.cos(start);
    const sy = cy + r * Math.sin(start);
    const ex = cx + r * Math.cos(end);
    const ey = cy + r * Math.sin(end);
    return `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`;
  }

  // Fill arc up to pct
  const fillEnd = startAngle + (endAngle - startAngle) * pct; // goes from π to 0
  const needleAngle = startAngle + (endAngle - startAngle) * pct;
  const nx = cx + (r - 10) * Math.cos(needleAngle);
  const ny = cy + (r - 10) * Math.sin(needleAngle);

  const isPositive = delta >= 0;
  const meterColor = delta > 1000 ? GREEN : delta < -1000 ? RED : AMBER;
  const pctDisplay = Math.round((Math.abs(delta) / cap) * 100);
  const label = delta > 500 ? 'BOOM' : delta < -500 ? 'BUST' : 'FAIR';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 92" className="w-[160px]" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RED} stopOpacity="0.7" />
            <stop offset="50%" stopColor={AMBER} stopOpacity="0.7" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* track */}
        <path d={arc(startAngle, endAngle)} fill="none" stroke={BORDER} strokeWidth="7" strokeLinecap="round" />
        {/* fill */}
        <path d={arc(startAngle, fillEnd)} fill="none" stroke={`url(#${gradId})`} strokeWidth="7" strokeLinecap="round" />
        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={CARD} stroke="white" strokeWidth="1.5" />
        {/* labels */}
        <text x="12" y="82" fontSize="8" fill={RED} style={FONT_BEBAS} textAnchor="middle">
          BUST
        </text>
        <text x="148" y="82" fontSize="8" fill={GREEN} style={FONT_BEBAS} textAnchor="middle">
          BOOM
        </text>
      </svg>

      <div className="mt-1 text-center">
        <p
          className="text-2xl leading-none tabular-nums"
          style={{ ...FONT_BEBAS, color: meterColor }}
        >
          {isPositive ? '+' : '-'}{pctDisplay}%{' '}
          <span className="text-xl" style={{ color: meterColor }}>
            {label}
          </span>
        </p>
      </div>
    </div>
  );
}

// Angel/Devil verdict cards
function AngelDevilCards({
  analysisData,
  coachText,
  coachDone,
  analyzing,
}: {
  analysisData: AnalyzePayload;
  coachText: string;
  coachDone: boolean;
  analyzing: boolean;
}) {
  const v = analysisData.analysis.verdict;
  const isBoom = v === 'ACCEPT';
  const isBust = v === 'DECLINE';

  return (
    <div className="space-y-3">
      <div
        className="rounded-sm border p-3"
        style={{ background: `${GREEN}08`, borderColor: `${GREEN}30` }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm" style={{ background: `${GREEN}25`, ...FONT_BEBAS }}>
            😇
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ ...FONT_INTER, color: GREEN }}>
              The Angel
            </p>
            <p className="text-xs font-semibold text-white" style={FONT_BEBAS}>
              {isBoom ? 'BOOMER' : 'UPSIDE CASE'}
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ ...FONT_INTER, color: TEXT_SEC }}>
          {analysisData.dimensionNotes.dynasty_value}
        </p>
      </div>

      <div
        className="rounded-sm border p-3"
        style={{ background: `${RED}08`, borderColor: `${RED}30` }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm" style={{ background: `${RED}25`, ...FONT_BEBAS }}>
            😈
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ ...FONT_INTER, color: RED }}>
              The Devil
            </p>
            <p className="text-xs font-semibold text-white" style={FONT_BEBAS}>
              {isBust ? 'BUSTER' : 'DOWNSIDE RISK'}
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ ...FONT_INTER, color: TEXT_SEC }}>
          {analysisData.dimensionNotes.contention_fit}
        </p>
      </div>

      {/* Coach stream */}
      {(coachText || analyzing) && (
        <div
          className="rounded-sm border p-3"
          style={{ background: `${INDIGO}08`, borderColor: `${INDIGO}30` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <p className="text-xs font-semibold" style={{ ...FONT_BEBAS, color: TEXT_SEC }}>
              AI ANALYSIS
            </p>
            {!coachDone && (
              <span className="ml-auto inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: CYAN }} />
            )}
          </div>
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ ...FONT_INTER, color: TEXT_SEC }}>
            {coachText || analysisData.analysis.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// Exploit action buttons
function ExploitActions({
  yourSide,
}: {
  yourSide: TradePlayer[];
  theirSide: TradePlayer[];
  selectedLeague: string;
}) {
  const actions = [
    {
      id: 'optimize',
      label: yourSide[0] ? `OPTIMIZE THIS ASSET (${yourSide[0].name.split(' ')[1] ?? yourSide[0].name})` : 'OPTIMIZE YOUR ASSETS',
      icon: TrendingUp,
      color: CYAN,
    },
    {
      id: 'dossier',
      label: 'LEAGUEMATE VULNERABILITY DOSSIER',
      icon: AlertTriangle,
      color: AMBER,
    },
    {
      id: 'deal',
      label: 'FIND A BETTER DEAL',
      icon: Zap,
      color: GREEN,
    },
    {
      id: 'manager',
      label: 'MANAGER PROFILE',
      icon: ChevronRight,
      color: TEXT_MUTED,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          type="button"
          className="flex items-start gap-2 rounded-sm border p-2.5 text-left transition-colors hover:border-[#374151] hover:bg-white/[0.02]"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <Icon className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} />
          <span
            className="text-[9px] font-semibold leading-tight uppercase tracking-[0.09em]"
            style={{ ...FONT_INTER, color: TEXT_MUTED }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Pick modal
function PickModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (pick: Omit<DraftPick, 'uid'>) => void;
}) {
  const [season, setSeason] = useState('2027');
  const [round, setRound] = useState('1');
  const [slot, setSlot] = useState<'early' | 'mid' | 'late'>('mid');
  const [team, setTeam] = useState('');

  useEffect(() => {
    if (open) setSeason(String(new Date().getFullYear() + 1));
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm rounded-sm border p-5 shadow-2xl" style={{ background: CARD, borderColor: BORDER }}>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-2xl text-white" style={FONT_BEBAS}>
            ADD DRAFT CAPITAL
          </h4>
          <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-white/5" style={{ color: TEXT_MUTED }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
              Year
            </span>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: BORDER }}
            >
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                <option key={y} value={y} style={{ background: '#111' }}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
              Round
            </span>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: BORDER }}
            >
              {[1, 2, 3, 4].map((r) => (
                <option key={r} value={r} style={{ background: '#111' }}>
                  Round {r}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-1 block text-[10px] uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
              Slot
            </legend>
            <div className="flex gap-1.5">
              {(['early', 'mid', 'late'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={clsx(
                    'flex-1 rounded-sm border py-1.5 text-xs font-semibold capitalize transition',
                    slot === s ? 'text-white' : 'text-[#64748b] hover:border-[#374151]'
                  )}
                  style={{
                    borderColor: slot === s ? GOLD : BORDER,
                    background: slot === s ? `${GOLD}20` : 'transparent',
                    ...FONT_INTER,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
              Team tag (optional)
            </span>
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. PHI"
              className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#475569]"
              style={{ borderColor: BORDER, ...FONT_INTER }}
            />
          </label>
          <button
            type="button"
            onClick={() => onAdd({ season, round: Number(round), slot, team: team.trim() || undefined })}
            className="mt-2 w-full rounded-sm py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            style={{ background: INDIGO, ...FONT_BEBAS, fontSize: '1rem', letterSpacing: '0.08em' }}
          >
            ADD PICK
          </button>
        </div>
      </div>
    </div>
  );
}

// Player detail drawer
function PlayerDrawer({
  player,
  onClose,
}: {
  player: TradePlayer | null;
  onClose: () => void;
}) {
  const visible = player !== null;

  const isBoom = player ? player.ktc_value > 5000 : false;
  const isBust = player ? player.ktc_value < 2000 : false;
  return (
    <>
      {/* Overlay */}
      <div
        className={clsx('fixed inset-0 z-[50] bg-black/50 transition-opacity duration-300', visible ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <div
        className={clsx(
          'fixed bottom-0 right-0 top-[72px] z-[51] flex w-[min(340px,92vw)] flex-col border-l transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ background: '#07090E', borderColor: BORDER }}
        role="dialog"
        aria-label="Player detail"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b p-4" style={{ borderColor: BORDER }}>
          <div className="min-w-0 flex-1">
            {player && (
              <>
                <div className="flex items-center gap-2">
                  <PosBadge pos={player.position} />
                  <p className="text-lg leading-tight text-white truncate" style={FONT_BEBAS}>
                    {player.name}
                  </p>
                </div>
                <p className="mt-1 text-[11px] tabular-nums" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                  {player.ktc_value.toLocaleString()} KTC{player.age ? ` · Age ${player.age}` : ''}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 mt-0.5 shrink-0 rounded p-1.5 hover:bg-white/5"
            style={{ color: TEXT_MUTED }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {player && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {/* Avatar + KTC */}
            <div className="flex items-center gap-3">
              <PlayerAvatar pid={player.player_id} name={player.name} size={56} />
              <div>
                <p
                  className="text-3xl leading-none text-white tabular-nums"
                  style={FONT_BEBAS}
                >
                  {player.ktc_value.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                  KTC dynasty value
                </p>
              </div>
            </div>

            {/* Boom/Bust verdict */}
            <div
              className="rounded-sm border p-3"
              style={{
                background: isBoom ? `${GREEN}0D` : isBust ? `${RED}0D` : `${AMBER}0D`,
                borderColor: isBoom ? `${GREEN}35` : isBust ? `${RED}35` : `${AMBER}35`,
              }}
            >
              <div className="flex items-center gap-2">
                {isBoom ? (
                  <TrendingUp className="h-4 w-4 shrink-0" style={{ color: GREEN }} />
                ) : isBust ? (
                  <TrendingDown className="h-4 w-4 shrink-0" style={{ color: RED }} />
                ) : (
                  <Zap className="h-4 w-4 shrink-0" style={{ color: AMBER }} />
                )}
                <p
                  className="text-base text-white"
                  style={FONT_BEBAS}
                >
                  {isBoom ? 'BOOMER PROFILE' : isBust ? 'BUSTER RISK' : 'SWING ASSET'}
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ ...FONT_INTER, color: TEXT_SEC }}>
                {isBoom
                  ? `${player.name} holds elite dynasty value. High upside insulation — treat as cornerstone, not trade bait.`
                  : isBust
                  ? `${player.name} carries name-brand risk at current KTC. Ask for a compensating asset if moving on.`
                  : `${player.name} is a swing asset — value depends heavily on league context and contention window.`}
              </p>
            </div>

            {/* Dimension bars */}
            <div className="space-y-3">
              {[
                { label: 'Dynasty Ceiling', val: Math.min(99, Math.round(player.ktc_value / 100)) },
                { label: 'Age Safety', val: player.age ? Math.max(10, 100 - (player.age - 22) * 7) : 50 },
                { label: 'Pos. Scarcity', val: player.position === 'QB' ? 72 : player.position === 'RB' ? 88 : 65 },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-[10px]" style={FONT_INTER}>
                    <span style={{ color: TEXT_MUTED }}>{label}</span>
                    <span className="tabular-nums font-semibold text-white">{val}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: BORDER }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${val}%`,
                        background:
                          val > 66 ? GREEN : val > 40 ? AMBER : RED,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                Quick actions
              </p>
              <div className="space-y-1.5">
                {[
                  'Optimize trade value',
                  'Find comparable targets',
                  'View league exposure',
                ].map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors hover:border-[#374151] hover:bg-white/[0.02]"
                    style={{ borderColor: BORDER, background: CARD2 }}
                  >
                    <span className="text-[11px] font-medium" style={{ ...FONT_INTER, color: TEXT_SEC }}>
                      {a}
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0" style={{ color: TEXT_MUTED }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Dimension score bar
function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]" style={FONT_INTER}>
        <span style={{ color: TEXT_SEC }}>{label}</span>
        <span className="tabular-nums font-semibold text-white">
          {value}
          <span style={{ color: TEXT_MUTED }}>/100</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: BORDER }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: INDIGO }}
        />
      </div>
    </div>
  );
}

// Tier counter (free users only)
function TierCounter({ tier, used, limit }: { tier: 'free' | 'pro' | 'elite'; used: number; limit: number }) {
  if (tier !== 'free') return null;
  return (
    <p className="text-[10px]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
      <span style={{ color: GOLD }}>{used}/{limit}</span> analyses this week
    </p>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────
function TradePageInner() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { riskTolerance } = usePreferences();

  const [ktcPlayers, setKtcPlayers] = useState<KTCPlayer[]>([]);
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string; scoring_settings: Record<string, number> | null }>>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [yourSide, setYourSide] = useState<TradePlayer[]>([]);
  const [theirSide, setTheirSide] = useState<TradePlayer[]>([]);
  const [yourPicks, setYourPicks] = useState<DraftPick[]>([]);
  const [theirPicks, setTheirPicks] = useState<DraftPick[]>([]);

  const [searchYours, setSearchYours] = useState('');
  const [searchTheirs, setSearchTheirs] = useState('');
  const [pickModal, setPickModal] = useState<'yours' | 'theirs' | null>(null);

  const [analysisData, setAnalysisData] = useState<AnalyzePayload | null>(null);
  const [coachStreaming, setCoachStreaming] = useState('');
  const [coachDone, setCoachDone] = useState(false);
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [userId, setUserId] = useState('');
  const [tier, setTier] = useState<'free' | 'pro' | 'elite'>('free');
  const [weeklyUses, setWeeklyUses] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [drawerPlayer, setDrawerPlayer] = useState<TradePlayer | null>(null);
  const [showExploits, setShowExploits] = useState(false);

  const WEEKLY_FREE_CAP = 3;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user?.id && setUserId(data.user.id));
    supabase
      .from('profiles')
      .select('preference_data,is_paid')
      .single()
      .then(({ data }) => {
        if (!data) return;
        let t: typeof tier = 'free';
        const pref =
          data.preference_data && typeof data.preference_data === 'object' && data.preference_data !== null
            ? (data.preference_data as Record<string, unknown>)
            : {};
        if (pref.subscription_tier === 'elite') t = 'elite';
        else if (data.is_paid) t = 'pro';
        setTier(t);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = globalThis.localStorage?.getItem(weekKey(userId));
      setWeeklyUses(raw ? Number(raw) || 0 : 0);
    } catch { setWeeklyUses(0); }
    try {
      const h = globalThis.localStorage?.getItem('bb_trade_history');
      setHistory(h ? JSON.parse(h) : []);
    } catch { setHistory([]); }
  }, [userId]);

  useEffect(() => {
    Promise.all([
      fetch('/api/values').then((r) => r.json()),
      supabase.from('leagues').select('id, name, scoring_settings'),
    ]).then(([values, { data }]) => {
      setKtcPlayers(values);
      const list = data ?? [];
      setLeagues(list);
      if (list.length && !selectedLeague) setSelectedLeague(list[0].id);

      const gn = searchParams.get('giving');
      const rn = searchParams.get('receiving');
      if (gn && values.length) {
        const match = (values as KTCPlayer[]).find((p) => p.player_name.toLowerCase().includes(gn.toLowerCase()));
        if (match) {
          const tp = ktcToChip(match);
          resolvePhoto(tp).then((id) => setYourSide([id ? { ...tp, player_id: id } : tp]));
        }
      }
      if (rn && values.length) {
        const match = (values as KTCPlayer[]).find((p) => p.player_name.toLowerCase().includes(rn.toLowerCase()));
        if (match) {
          const tp = ktcToChip(match);
          resolvePhoto(tp).then((id) => setTheirSide([id ? { ...tp, player_id: id } : tp]));
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ktcToChip(p: KTCPlayer): TradePlayer {
    return { id: p.slug || p.player_name, name: p.player_name, position: p.position, age: p.age, ktc_value: p.ktc_value };
  }

  async function resolvePhoto(tp: TradePlayer): Promise<string | null> {
    try {
      const r = await fetch(`/api/players/resolve?q=${encodeURIComponent(tp.name)}`);
      const j = (await r.json()) as { id: string | null };
      return j.id;
    } catch { return null; }
  }

  const canAnalyze = useMemo(
    () => (yourSide.length + yourPicks.length > 0) && (theirSide.length + theirPicks.length > 0),
    [yourSide.length, theirSide.length, yourPicks.length, theirPicks.length]
  );
  const freeBlocked = tier === 'free' && weeklyUses >= WEEKLY_FREE_CAP;

  function bumpWeekly() {
    if (tier !== 'free' || !userId) return;
    setWeeklyUses((p) => {
      const n = p + 1;
      try { globalThis.localStorage?.setItem(weekKey(userId), String(n)); } catch {}
      return n;
    });
  }

  function appendHistory(entry: HistoryEntry) {
    setHistory((h) => {
      const nh = [entry, ...h].slice(0, 12);
      try { globalThis.localStorage?.setItem('bb_trade_history', JSON.stringify(nh)); } catch {}
      return nh;
    });
  }

  async function addPlayer(side: 'yours' | 'theirs', p: KTCPlayer) {
    const tp = ktcToChip(p);
    const pid = await resolvePhoto(tp);
    const enriched = pid ? { ...tp, player_id: pid } : tp;
    if (side === 'yours') { setYourSide((prev) => [...prev, enriched]); setSearchYours(''); }
    else { setTheirSide((prev) => [...prev, enriched]); setSearchTheirs(''); }
  }

  async function runAnalyze() {
    if (!canAnalyze || analyzeBusy || freeBlocked) return;
    setAnalyzeBusy(true);
    setAnalysisData(null);
    setCoachStreaming('');
    setCoachDone(false);

    try {
      const res = await fetch('/api/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: selectedLeague,
          giving: {
            players: yourSide.map((p) => ({ name: p.name, position: p.position, age: p.age, ktc_value: p.ktc_value })),
            picks: yourPicks.map((pk) => ({ season: pk.season, round: pk.round, slot: pk.slot, team: pk.team })),
          },
          receiving: {
            players: theirSide.map((p) => ({ name: p.name, position: p.position, age: p.age, ktc_value: p.ktc_value })),
            picks: theirPicks.map((pk) => ({ season: pk.season, round: pk.round, slot: pk.slot, team: pk.team })),
          },
          risk_tolerance: riskTolerance,
        }),
      });

      if (!res.ok) throw new Error('Analyze failed');
      const data = (await res.json()) as AnalyzePayload;
      bumpWeekly();
      setAnalysisData(data);

      const ga = [...yourSide.map((x) => x.name), ...yourPicks.map((p) => `${p.season} R${p.round}`)].join('; ');
      const ra = [...theirSide.map((x) => x.name), ...theirPicks.map((p) => `${p.season} R${p.round}`)].join('; ');

      appendHistory({ id: crypto.randomUUID(), at: new Date().toISOString(), verdict: data.analysis.verdict, summary: `${ga.slice(0, 40)}… ⇄ ${ra.slice(0, 40)}` });

      const coachRes = await fetch('/api/trade/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict: data.analysis.verdict,
          value_delta: data.analysis.value_delta,
          rounds_label: data.roundsLabel,
          giving_assets: ga,
          receiving_assets: ra,
          dimension_notes: data.dimensionNotes,
        }),
      });

      if (!coachRes.ok || !coachRes.body) { setCoachStreaming(data.analysis.explanation); setCoachDone(true); return; }

      const reader = coachRes.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setCoachStreaming(acc);
      }
      setCoachDone(true);
    } catch {
      setAnalysisData(null);
    } finally {
      setAnalyzeBusy(false);
    }
  }

  const verdictLook = useMemo(() => {
    const v = analysisData?.analysis.verdict;
    if (v === 'ACCEPT') return { color: 'text-emerald-400', border: 'border-emerald-500/30 bg-emerald-500/[0.04]' };
    if (v === 'DECLINE') return { color: 'text-red-400', border: 'border-red-500/30 bg-red-500/[0.04]' };
    return { color: 'text-[var(--cyan)]', border: 'border-[var(--cyan)]/25 bg-[var(--cyan)]/[0.04]' };
  }, [analysisData?.analysis.verdict]);

  // Inline search box
  function SearchBox({ side }: { side: 'yours' | 'theirs' }) {
    const val = side === 'yours' ? searchYours : searchTheirs;
    const setVal = side === 'yours' ? setSearchYours : setSearchTheirs;
    const results = val.length >= 2
      ? ktcPlayers.filter((p) => p.player_name.toLowerCase().includes(val.toLowerCase())).slice(0, 8)
      : [];

    return (
      <div className="relative">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Search players…"
          className="w-full rounded-sm border bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#475569] focus:outline-none"
          style={{ borderColor: BORDER, ...FONT_INTER }}
        />
        {results.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-sm border shadow-2xl"
            style={{ background: '#0A0D14', borderColor: BORDER }}
          >
            {results.map((p) => {
              const s = posStyle(p.position);
              return (
                <li key={p.player_name}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                    onClick={() => void addPlayer(side, p)}
                  >
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {p.position}
                    </span>
                    <span className="flex-1 truncate text-sm text-white" style={FONT_INTER}>
                      {p.player_name}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                      {p.ktc_value.toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const leagueName = leagues.find((l) => l.id === selectedLeague)?.name ?? 'League';

  return (
    <div className="min-h-screen pb-20 lg:pb-6" style={{ background: BG }}>
      {/* Page header */}
      <div className="border-b px-4 py-3 sm:px-6 lg:ml-16" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl leading-none text-white sm:text-5xl" style={FONT_BEBAS}>
              TRADE LAB{' '}
              <span style={{ color: TEXT_MUTED }}>—</span>{' '}
              <span className="text-3xl sm:text-4xl" style={{ color: TEXT_SEC }}>
                THE COMMAND CENTER
              </span>
            </h1>
            <p className="mt-1 text-xs" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
              Know who wins. Every single trade. Every single exploit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TierCounter tier={tier} used={weeklyUses} limit={WEEKLY_FREE_CAP} />
            <div className="flex items-center gap-2 rounded-sm border px-2.5 py-1.5" style={{ borderColor: BORDER, background: CARD }}>
              <span className="text-[9px] uppercase tracking-[0.12em]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                League Context
              </span>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-transparent text-xs font-medium text-white focus:outline-none"
                style={FONT_INTER}
              >
                {leagues.map((l) => (
                  <option key={l.id} value={l.id} style={{ background: '#111' }}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-col gap-0 lg:ml-16 lg:flex-row lg:min-h-[calc(100vh-130px)]">
        {/* LEFT — Player selection */}
        <div
          className="flex flex-col gap-3 border-r p-4 lg:w-[min(400px,42%)] lg:p-5"
          style={{ borderColor: BORDER }}
        >
          {/* Your side */}
          <TerminalCard title={`your_side — ${leagueName}`}>
            <div className="space-y-2">
              <SearchBox side="yours" />
              {yourSide.map((p) => (
                <PlayerChip
                  key={p.id}
                  p={p}
                  onRemove={() => setYourSide((x) => x.filter((z) => z.id !== p.id))}
                  onClick={() => setDrawerPlayer(p)}
                  active={drawerPlayer?.id === p.id}
                />
              ))}
              {yourPicks.map((pk) => (
                <PickChip key={pk.uid} pick={pk} onRemove={() => setYourPicks((l) => l.filter((q) => q.uid !== pk.uid))} />
              ))}
              {yourSide.length === 0 && yourPicks.length === 0 && (
                <p className="py-4 text-center text-[11px]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                  No assets added yet
                </p>
              )}
              <button
                type="button"
                onClick={() => setPickModal('yours')}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed py-2 text-xs transition-colors hover:border-[#374151] hover:bg-white/[0.02]"
                style={{ borderColor: `${INDIGO}50`, color: '#818cf8', ...FONT_INTER }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add draft pick
              </button>
              <div className="flex justify-end text-[10px] tabular-nums" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                Subtotal {yourSide.reduce((s, x) => s + x.ktc_value, 0).toLocaleString()} KTC
              </div>
            </div>
          </TerminalCard>

          {/* Swap bar */}
          <div className="flex items-center justify-center py-1">
            <button
              type="button"
              onClick={() => { setYourSide(theirSide); setTheirSide(yourSide); setYourPicks(theirPicks); setTheirPicks(yourPicks); }}
              className="flex items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors hover:border-[#374151] hover:bg-white/[0.03]"
              style={{ borderColor: BORDER, background: CARD, color: TEXT_MUTED, ...FONT_INTER }}
              title="Swap sides"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap
            </button>
          </div>

          {/* Their side */}
          <TerminalCard title={`their_side — ${leagueName}`}>
            <div className="space-y-2">
              <SearchBox side="theirs" />
              {theirSide.map((p) => (
                <PlayerChip
                  key={p.id + '-t'}
                  p={p}
                  onRemove={() => setTheirSide((x) => x.filter((z) => z.id !== p.id))}
                  onClick={() => setDrawerPlayer(p)}
                  active={drawerPlayer?.id === p.id}
                />
              ))}
              {theirPicks.map((pk) => (
                <PickChip key={pk.uid} pick={pk} onRemove={() => setTheirPicks((l) => l.filter((q) => q.uid !== pk.uid))} />
              ))}
              {theirSide.length === 0 && theirPicks.length === 0 && (
                <p className="py-4 text-center text-[11px]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                  No assets added yet
                </p>
              )}
              <button
                type="button"
                onClick={() => setPickModal('theirs')}
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed py-2 text-xs transition-colors hover:border-[#374151] hover:bg-white/[0.02]"
                style={{ borderColor: `${GOLD}40`, color: GOLD, ...FONT_INTER }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add draft pick
              </button>
              <div className="flex justify-end text-[10px] tabular-nums" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                Subtotal {theirSide.reduce((s, x) => s + x.ktc_value, 0).toLocaleString()} KTC
              </div>
            </div>
          </TerminalCard>

          {/* CTA */}
          <button
            type="button"
            disabled={!canAnalyze || analyzeBusy || freeBlocked}
            onClick={() => void runAnalyze()}
            className="relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-sm py-3.5 text-base font-bold text-white transition disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: freeBlocked
                ? '#374151'
                : `linear-gradient(135deg, ${INDIGO} 0%, #4f46e5 55%, ${CYAN}55 100%)`,
              boxShadow: !freeBlocked && !analyzeBusy ? `0 0 32px ${INDIGO}40` : undefined,
              ...FONT_BEBAS,
              letterSpacing: '0.1em',
              fontSize: '1.1rem',
            }}
          >
            {analyzeBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                ANALYZING EXPLOIT…
              </>
            ) : freeBlocked ? (
              'WEEKLY LIMIT — UPGRADE'
            ) : (
              <>
                <Zap className="h-4 w-4 fill-white/80" />
                FIND TRADE EXPLOIT
              </>
            )}
          </button>

          {/* Find Trade Exploit toggle button */}
          <button
            type="button"
            disabled={!analysisData}
            onClick={() => setShowExploits((e) => !e)}
            className="mt-3 w-full rounded-xl border border-[var(--cyan)]/40 bg-[var(--cyan)]/[0.06] text-[var(--cyan)] font-bold py-3 text-sm disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_24px_rgba(34,211,238,0.15)] tracking-[0.08em] hover:shadow-[0_0_32px_rgba(34,211,238,0.25)] transition-all"
            style={{ ...FONT_BEBAS, fontSize: '0.9rem' }}
          >
            FIND TRADE EXPLOIT
          </button>
        </div>

        {/* RIGHT — Workspace / Verdict */}
        <div className="flex flex-1 flex-col gap-4 p-4 lg:overflow-y-auto lg:p-5">
          {/* Empty state */}
          {!analysisData && !analyzeBusy && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-sm border"
                style={{ background: `${INDIGO}15`, borderColor: `${INDIGO}40` }}
              >
                <ArrowLeftRight className="h-7 w-7" style={{ color: INDIGO }} />
              </div>
              <div>
                <p className="text-2xl text-white" style={FONT_BEBAS}>
                  TRADE WORKSPACE
                </p>
                <p className="mt-1 text-xs" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                  Add players to both sides, then hit{' '}
                  <span style={{ color: CYAN }}>Find Trade Exploit</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                {['Boom/Bust meter', 'Angel vs Devil cards', 'AI coach stream', 'Exploit actions'].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: INDIGO }} />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {analyzeBusy && !analysisData && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: INDIGO }} />
              <p className="text-sm" style={{ ...FONT_INTER, color: TEXT_MUTED }}>
                Running exploit engine…
              </p>
            </div>
          )}

          {/* Results */}
          {analysisData && (
            <div className="mt-4 space-y-8">
              {/* Top row: Dial + Dimension bars */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-10 space-y-8 lg:space-y-0">
                {/* Left column */}
                <div className="space-y-6">
                  {/* Verdict & Exploits */}
                  <div className={`rounded-2xl border p-6 ${verdictLook.border}`}>
                    <p className="text-[11px] tracking-[0.25em] mb-4 uppercase" style={{ ...FONT_BEBAS, color: TEXT_MUTED }}>VERDICT & EXPLOITS</p>
                    <div className="flex flex-col items-center">
                      <BoomBustDial
                        valueDelta={analysisData.analysis.value_delta}
                        maxValue={Math.max(analysisData.totalGiving, analysisData.totalReceiving, 1000)}
                      />
                      <p className={clsx('text-[clamp(3rem,8vw,5rem)] leading-none uppercase tracking-[0.04em] mt-2', verdictLook.color)} style={FONT_BEBAS}>
                        {analysisData.analysis.verdict}
                      </p>
                      <p className="mt-2 text-lg font-semibold" style={{ ...FONT_BEBAS, color: GOLD }}>{analysisData.roundsLabel}</p>
                    </div>
                    {/* Exploit rows */}
                    <div className="mt-5 space-y-1 border-t pt-4" style={{ borderColor: BORDER }}>
                      {analysisData.analysis.value_delta > 0 && (
                        <ExploitCard label={`+${analysisData.analysis.value_delta.toLocaleString()} KTC class premium`} badge="VALUE GAP ★" tone="boom" />
                      )}
                      {analysisData.dimensionScores.age_curve > 60 && (
                        <ExploitCard label="Age curve favors your side" badge="AGE EDGE ★" tone="boom" />
                      )}
                      {analysisData.dimensionScores.contention_fit > 60 && (
                        <ExploitCard label="Rising talent in the pipeline" badge="UPSIDE ★" tone="boom" />
                      )}
                      {analysisData.dimensionScores.dynasty_value < 40 && (
                        <ExploitCard label="Declining dynasty value risk" badge="CAUTION" tone="bust" />
                      )}
                    </div>
                  </div>

                  {/* Angel (Boomer) section */}
                  <div className="rounded-2xl border p-5" style={{ background: `${CYAN}0A`, borderColor: `${CYAN}40` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🦅</span>
                      <p className="text-base tracking-wide" style={{ ...FONT_BEBAS, color: CYAN }}>THE ANGEL (BOOMER)</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ ...FONT_INTER, color: TEXT_SEC }}>
                      {analysisData.dimensionNotes.dynasty_value}
                    </p>
                  </div>

                  {/* Devil (Buster) section */}
                  <div className="rounded-2xl border p-5" style={{ background: `${RED}0A`, borderColor: `${RED}40` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">😈</span>
                      <p className="text-base tracking-wide" style={{ ...FONT_BEBAS, color: RED }}>THE DEVIL (BUSTER)</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ ...FONT_INTER, color: TEXT_SEC }}>
                      {analysisData.dimensionNotes.age_curve}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`/dashboard/trade/finder?player=${encodeURIComponent(yourSide[0]?.name ?? '')}`}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold tracking-wide text-center transition hover:border-[#374151] hover:text-white"
                      style={{ ...FONT_BEBAS, borderColor: BORDER, color: TEXT_SEC, fontSize: '0.75rem' }}
                    >
                      OPTIMIZE THIS ASSET
                    </a>
                    <a
                      href="/dashboard/trade/finder"
                      className="rounded-xl border px-3 py-2 text-xs font-semibold tracking-wide text-center transition"
                      style={{ ...FONT_BEBAS, borderColor: `${CYAN}55`, color: CYAN, fontSize: '0.75rem', boxShadow: `0 0 12px ${CYAN}1A` }}
                    >
                      FIND A BETTER DEAL
                    </a>
                  </div>
                </div>

                {/* Right column: dimension bars + coach analysis */}
                <div className="space-y-6">
                  {/* Dimension scores */}
                  <TerminalCard title="dimension_scores — four_axes">
                    <div className="space-y-3">
                      <DimBar label="Dynasty Value" value={analysisData.dimensionScores.dynasty_value} />
                      <DimBar label="Contention Fit" value={analysisData.dimensionScores.contention_fit} />
                      <DimBar label="Age Curve" value={analysisData.dimensionScores.age_curve} />
                      <DimBar label="Positional Need" value={analysisData.dimensionScores.positional_need} />
                    </div>
                  </TerminalCard>

                  {/* Angel & Devil + Coach */}
                  <TerminalCard title="angel_vs_devil — buster_boomer_profiles">
                    <AngelDevilCards
                      analysisData={analysisData}
                      coachText={coachStreaming}
                      coachDone={coachDone}
                      analyzing={analyzeBusy}
                    />
                  </TerminalCard>
                </div>
              </div>

              {/* Exploit action buttons */}
              {showExploits && (
                <TerminalCard title="exploit_actions">
                  <ExploitActions yourSide={yourSide} theirSide={theirSide} selectedLeague={selectedLeague} />
                </TerminalCard>
              )}

              {/* Breakdown table */}
              <TerminalCard title="asset_breakdown — ktc_vs_bbv">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full border-collapse text-[11px]" style={FONT_INTER}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {['Side', 'Player', 'KTC', 'BBV', 'Age', 'Team'].map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1.5 text-left font-semibold uppercase tracking-[0.1em]"
                            style={{ color: TEXT_MUTED }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...analysisData.breakdownYour.map((r) => ({ ...r, side: 'Yours' })),
                        ...analysisData.breakdownTheir.map((r) => ({ ...r, side: 'Theirs' })),
                      ].map((row, i) => (
                        <tr
                          key={`${row.name}-${i}`}
                          className="transition-colors hover:bg-white/[0.02]"
                          style={{ borderBottom: `1px solid ${BORDER}30` }}
                        >
                          <td className="px-2 py-2" style={{ color: TEXT_MUTED }}>
                            {row.side}
                          </td>
                          <td className="px-2 py-2 font-medium text-white">{row.name}</td>
                          <td className="px-2 py-2 tabular-nums" style={{ color: TEXT_SEC }}>
                            {row.ktc_value.toLocaleString()}
                          </td>
                          <td className="px-2 py-2 tabular-nums" style={{ color: CYAN }}>
                            {typeof row.bbv_value === 'number' ? row.bbv_value.toFixed(1) : '—'}
                          </td>
                          <td className="px-2 py-2" style={{ color: TEXT_MUTED }}>
                            {row.age ?? '—'}
                          </td>
                          <td className="px-2 py-2" style={{ color: TEXT_MUTED }}>
                            {row.team ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td colSpan={2} className="px-2 py-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: TEXT_MUTED }}>
                          You give
                        </td>
                        <td className="px-2 py-2 font-semibold text-white tabular-nums">{analysisData.totalGiving.toLocaleString()}</td>
                        <td colSpan={3} />
                      </tr>
                      <tr>
                        <td colSpan={2} className="px-2 py-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: TEXT_MUTED }}>
                          You receive
                        </td>
                        <td className="px-2 py-2 font-semibold text-white tabular-nums">{analysisData.totalReceiving.toLocaleString()}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </TerminalCard>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <TerminalCard title="trade_history — last_12">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-3.5 w-3.5 shrink-0" style={{ color: INDIGO }} />
                <span className="text-xs font-semibold text-white" style={FONT_BEBAS}>
                  RECENT VERDICTS
                </span>
              </div>
              <ul className="space-y-1">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center gap-2 rounded-sm border px-2.5 py-2 text-[10px]"
                    style={{ borderColor: BORDER, background: CARD2 }}
                  >
                    <span
                      className="shrink-0 rounded-sm border px-1.5 py-0.5 font-bold"
                      style={{ borderColor: `${INDIGO}50`, background: `${INDIGO}15`, color: '#818cf8', ...FONT_BEBAS }}
                    >
                      {h.verdict}
                    </span>
                    <span className="min-w-0 flex-1 truncate" style={{ color: TEXT_SEC }}>
                      {h.summary}
                    </span>
                    <span className="shrink-0" style={{ color: TEXT_MUTED }}>
                      {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </TerminalCard>
          )}
        </div>
      </div>

      {/* Pick modal */}
      <PickModal
        open={pickModal !== null}
        onClose={() => setPickModal(null)}
        onAdd={(raw) => {
          const next: DraftPick = { uid: crypto.randomUUID(), ...raw };
          if (pickModal === 'yours') setYourPicks((p) => [...p, next]);
          else setTheirPicks((p) => [...p, next]);
          setPickModal(null);
        }}
      />

      {/* Player detail drawer */}
      <PlayerDrawer player={drawerPlayer} onClose={() => setDrawerPlayer(null)} />
    </div>
  );
}

export default function TradePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" style={{ background: BG }} />}>
      <TradePageInner />
    </Suspense>
  );
}
