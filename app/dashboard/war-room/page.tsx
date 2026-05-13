'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import {
  calculateLeagueHealthScore,
  classifyAsset,
  derivePrimarySignal,
  type PrimarySignal,
  type RankedPlayer,
} from '@/lib/health/leagueHealthScore';
import { getEmpirePulse } from '@/lib/berman/empirePulse';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';
import {
  calculateTFOScore,
  gradeFromScore,
  type TFOGrade,
  type TFOPosition,
  type TFOVerdict,
} from '@/lib/tfo/formula';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeagueRow {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

interface RostRow {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: Record<string, number> | null;
}

interface PlayerRow {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

interface LeagueAnalysis {
  id: string;
  name: string;
  rosterValue: number;
  rankedPlayers: RankedPlayer[];
  healthScore: number;
  signal: PrimarySignal;
  empirePulse: string;
}

type TickerKind = 'TRADE' | 'ALERT' | 'MOCK' | 'BOOM';

interface TickerEntry {
  league: string;
  kind: TickerKind;
  text: string;
}

const TICKER_KIND_STYLES: Record<
  TickerKind,
  { border: string; pillBg: string; pillText: string; pillBorder: string }
> = {
  TRADE: {
    border: '#A78BFA',
    pillBg: 'rgba(167,139,250,0.12)',
    pillText: '#A78BFA',
    pillBorder: 'rgba(167,139,250,0.35)',
  },
  ALERT: {
    border: '#EF4444',
    pillBg: 'rgba(239,68,68,0.12)',
    pillText: '#EF4444',
    pillBorder: 'rgba(239,68,68,0.35)',
  },
  MOCK: {
    border: '#22D3EE',
    pillBg: 'rgba(34,211,238,0.1)',
    pillText: '#22D3EE',
    pillBorder: 'rgba(34,211,238,0.35)',
  },
  BOOM: {
    border: '#36E7A1',
    pillBg: 'rgba(54,231,161,0.1)',
    pillText: '#36E7A1',
    pillBorder: 'rgba(54,231,161,0.35)',
  },
};

/** Per-player TFO snapshot for Tactical Map + DEFCON */
interface PlayerTfoSnapshot {
  tfoScore: number;
  grade: TFOGrade;
  verdict: TFOVerdict;
}

interface TacticalPlayerDot {
  id: string;
  leagueId: string;
  name: string;
  ktcValue: number;
  tfoScore: number;
  grade: TFOGrade;
  verdict: TFOVerdict;
}

interface ExploitRow {
  text: string;
  mascot: 'boomer' | 'buster';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTfoPosition(raw: string): TFOPosition | null {
  const u = raw.toUpperCase();
  if (u === 'QB' || u === 'RB' || u === 'WR' || u === 'TE') return u;
  return null;
}

function buildTfoByPlayerId(
  ids: string[],
  pmap: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
  dynastyRows: DynastyPlayer2026[],
): Record<string, PlayerTfoSnapshot> {
  const exact = new Map(dynastyRows.map((r) => [r.name.trim().toLowerCase(), r]));
  const fuse = new Fuse(dynastyRows, { keys: ['name'], threshold: 0.35, includeScore: true });
  const out: Record<string, PlayerTfoSnapshot> = {};

  for (const pid of ids) {
    const p = pmap[pid];
    if (!p) continue;
    const pos = toTfoPosition(p.position);
    if (!pos) continue;

    const ktcValue = ktcMap[p.full_name.toLowerCase()] ?? 0;

    let hit: DynastyPlayer2026 | undefined = exact.get(p.full_name.trim().toLowerCase());
    if (!hit) {
      const fs = fuse.search(p.full_name)[0];
      if (fs && typeof fs.score === 'number' && fs.score <= 0.38) hit = fs.item;
    }

    if (hit && hit.position === pos) {
      out[pid] = {
        tfoScore: hit.tfoScore,
        grade: hit.tfoGrade ?? gradeFromScore(hit.tfoScore),
        verdict: hit.tfoVerdict,
      };
      continue;
    }

    const age = typeof p.age === 'number' && p.age > 0 ? p.age : 24;
    const tfo = calculateTFOScore({
      playerId: pid,
      position: pos,
      age,
      team: (p.team ?? 'FA').toUpperCase(),
      ocScheme: schemeForTeam(p.team),
      opportunityScore: 70,
      olGrade: 70,
      wrCastGrade: 70,
      redZoneShare: 60,
      ktcValue: ktcValue > 0 ? ktcValue : 2200,
      ocYear: 2,
      rbUsageStyle: 'POWER',
      wrDeployment: 'SLOT',
      teamQbIsYoung: true,
    });
    out[pid] = { tfoScore: tfo.tfoScore, grade: tfo.grade, verdict: tfo.verdict };
  }

  return out;
}

function inferExploitMascot(text: string): 'boomer' | 'buster' {
  const u = text.toUpperCase();
  if (/\b(SELL|RISK|NUKE|DROP|DECLINING)\b/.test(u)) return 'buster';
  return 'boomer';
}

function tfoVerdictDotColors(verdict: TFOVerdict): { stroke: string; glow: string } {
  if (verdict === 'BOOM' || verdict === 'LEAN_BOOM') {
    return { stroke: '#36E7A1', glow: 'rgba(54,231,161,0.5)' };
  }
  if (verdict === 'BUST' || verdict === 'LEAN_BUST') {
    return { stroke: '#EF4444', glow: 'rgba(239,68,68,0.5)' };
  }
  return { stroke: '#94A3B8', glow: 'rgba(148,163,184,0.45)' };
}

function buildRankedPlayers(
  playerIds: string[],
  players: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
): RankedPlayer[] {
  // Build position pool across this roster to derive positionRank
  const byPos: Record<string, Array<{ id: string; ktcValue: number }>> = {};
  for (const pid of playerIds) {
    const p = players[pid];
    if (!p) continue;
    const pos = p.position.toUpperCase();
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    const ktcValue = ktcMap[p.full_name.toLowerCase()] ?? 0;
    if (!byPos[pos]) byPos[pos] = [];
    byPos[pos]!.push({ id: pid, ktcValue });
  }

  // Sort each position by ktcValue descending, assign positionRank
  const rankMap: Record<string, number> = {};
  for (const pos of Object.keys(byPos)) {
    const sorted = byPos[pos]!.sort((a, b) => b.ktcValue - a.ktcValue);
    sorted.forEach((item, i) => {
      rankMap[item.id] = i + 1;
    });
  }

  const result: RankedPlayer[] = [];
  for (const pid of playerIds) {
    const p = players[pid];
    if (!p) continue;
    const pos = p.position.toUpperCase();
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    const ktcValue = ktcMap[p.full_name.toLowerCase()] ?? 0;
    const positionRank = rankMap[pid] ?? 999;
    result.push({
      id: pid,
      name: p.full_name,
      position: pos,
      age: p.age,
      ktcValue,
      positionRank,
    });
  }
  return result;
}

function generateTicker(leagues: LeagueAnalysis[]): TickerEntry[] {
  return leagues.flatMap((lg, i) => {
    const entries: TickerEntry[] = [];
    const leagueLabel = `L${i + 1}`;
    const nuke = lg.rankedPlayers.find((p) => classifyAsset(p) === 'nuke');

    if (lg.signal === 'BUST') {
      if (nuke) {
        entries.push({
          league: leagueLabel,
          kind: 'ALERT',
          text: `Nuke risk — ${nuke.name} blocking roster spot`,
        });
      } else {
        entries.push({
          league: leagueLabel,
          kind: 'TRADE',
          text: `Rebuild lane — target pick swaps in ${lg.name}`,
        });
      }
    }
    if (lg.signal === 'BOOM') {
      entries.push({
        league: leagueLabel,
        kind: 'BOOM',
        text: `${lg.name} is BOOM territory — contend now`,
      });
    }
    const diamond = lg.rankedPlayers.find((p) => classifyAsset(p) === 'diamond');
    if (diamond) {
      entries.push({
        league: leagueLabel,
        kind: 'MOCK',
        text: `${diamond.name} elite-tier anchor — mock-friendly chip`,
      });
    }
    return entries;
  });
}

function generateExploits(leagueData: LeagueAnalysis): ExploitRow[] {
  const raw: string[] = [];
  const nukes = leagueData.rankedPlayers.filter((p) => classifyAsset(p) === 'nuke');
  const diamonds = leagueData.rankedPlayers.filter((p) => classifyAsset(p) === 'diamond');

  if (nukes.length > 0) {
    raw.push(`Package ${nukes[0]!.name} for a 2026 2nd or better — NUKE tier trim.`);
  }
  if (leagueData.healthScore < 50) {
    raw.push(`Target pick-heavy trades — roster needs youth infusion (DECLINING trajectory).`);
  }
  if (diamonds.length > 0) {
    raw.push(`${diamonds[0]!.name} is a high-leverage hold — KTC trending up.`);
  }
  raw.push(`CMC volatility window open — 3-week sell-high opportunity.`);

  return raw.slice(0, 3).map((text) => ({
    text,
    mascot: inferExploitMascot(text),
  }));
}

function getDefcon(
  leagues: LeagueAnalysis[],
  tfoAgg: { bustCount: number; leanBustCount: number },
): {
  level: 1 | 2 | 3 | 4 | 5;
  nukeCount: number;
  boomCount: number;
} {
  const nukeCount = leagues.reduce((sum, lg) => {
    return sum + lg.rankedPlayers.filter((p) => classifyAsset(p) === 'nuke').length;
  }, 0);
  const boomCount = leagues.filter((lg) => lg.signal === 'BOOM').length;
  const bustLeagueCount = leagues.filter((lg) => lg.signal === 'BUST').length;

  let level: 1 | 2 | 3 | 4 | 5 = 5;

  if (nukeCount >= 5 || boomCount > 0) {
    level = 1;
  } else if (nukeCount >= 2 || tfoAgg.bustCount >= 2) {
    level = 2;
  } else if (nukeCount >= 1 || tfoAgg.bustCount >= 1 || tfoAgg.leanBustCount > 2) {
    level = 3;
  } else if (bustLeagueCount > 0 || tfoAgg.leanBustCount > 0) {
    level = 4;
  } else {
    level = 5;
  }

  if (level !== 1 && tfoAgg.bustCount >= 1 && level > 2) {
    level = 2;
  }

  return { level, nukeCount, boomCount };
}

function normalize(value: number, min: number, max: number, outMin: number, outMax: number): number {
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

// ── SVG Scatter Plot ──────────────────────────────────────────────────────────

interface ScatterNode {
  league: LeagueAnalysis;
  x: number;
  y: number;
  index: number;
}

interface PopoverState {
  node: ScatterNode;
  px: number;
  py: number;
}

function TacticalMap({
  leagues,
  playerDots,
  onSelectLeague,
}: {
  leagues: LeagueAnalysis[];
  playerDots: TacticalPlayerDot[];
  onSelectLeague: (lg: LeagueAnalysis | null) => void;
}) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [playerTip, setPlayerTip] = useState<{ dot: TacticalPlayerDot; left: number; top: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const minVal = Math.min(...leagues.map((l) => l.rosterValue), 0);
  const maxVal = Math.max(...leagues.map((l) => l.rosterValue), 1);

  const nodes: ScatterNode[] = leagues.map((lg, i) => ({
    league: lg,
    x: normalize(lg.rosterValue, minVal, maxVal, 40, 360),
    y: 380 - (lg.healthScore / 100) * 360 + 20,
    index: i,
  }));

  const ktcs = playerDots.map((d) => d.ktcValue);
  const minK = ktcs.length ? Math.min(...ktcs, 0) : 0;
  const maxK = ktcs.length ? Math.max(...ktcs, 1) : 1;

  const placedPlayers =
    playerDots.length > 0
      ? playerDots.map((dot) => ({
          ...dot,
          px: normalize(dot.ktcValue, minK, maxK, 40, 360),
          py: 380 - (dot.tfoScore / 100) * 360 + 20,
        }))
      : [];

  function updatePlayerTip(dot: TacticalPlayerDot, e: React.MouseEvent) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setPlayerTip({
      dot,
      left: Math.min(rect.width - 140, e.clientX - rect.left + 10),
      top: Math.min(rect.height - 88, e.clientY - rect.top + 10),
    });
  }

  function handleNodeClick(node: ScatterNode, e: React.MouseEvent<SVGCircleElement>) {
    e.stopPropagation();
    setPlayerTip(null);
    if (popover?.node.league.id === node.league.id) {
      setPopover(null);
      onSelectLeague(null);
      return;
    }
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = rect.width / 400;
    const scaleY = rect.height / 400;
    const px = node.x * scaleX + rect.left - (rect.left > 0 ? 0 : 0);
    const py = node.y * scaleY;
    setPopover({ node, px, py });
    onSelectLeague(node.league);
  }

  function handleSvgClick() {
    setPopover(null);
    setPlayerTip(null);
    onSelectLeague(null);
  }

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Y-axis label */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateX(8px) translateY(-50%)' }}
      >
        ROSTER STRENGTH
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 400 420"
        className="w-full"
        style={{ height: '500px' }}
        onClick={handleSvgClick}
      >
        {/* Grid lines */}
        {gridLines.map((pct) => {
          const y = 20 + (pct / 100) * 360;
          const x = 20 + (pct / 100) * 360;
          return (
            <g key={pct}>
              <line x1="20" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1={x} y1="20" x2={x} y2="390" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </g>
          );
        })}

        {/* Axis labels */}
        <text x="200" y="415" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" letterSpacing="2">
          ASSET VALUE (BBV)
        </text>
        <text x="8" y="200" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" letterSpacing="2"
          transform="rotate(-90, 8, 200)">
          ROSTER STRENGTH
        </text>

        {/* League nodes */}
        {nodes.map((node) => {
          const { league, x, y, index } = node;
          const isBoom = league.signal === 'BOOM';
          const isBust = league.signal === 'BUST';
          const isNuke = league.healthScore < 40;
          const isElite = league.healthScore > 80;

          const fillColor = isBoom ? '#22d3ee' : isBust ? '#ef4444' : '#6366f1';
          const glowColor = isBoom
            ? 'rgba(34,211,238,0.5)'
            : isBust
              ? 'rgba(239,68,68,0.5)'
              : 'rgba(99,102,241,0.4)';
          const isSelected = popover?.node.league.id === league.id;

          return (
            <g key={league.id}>
              {/* Glow effect */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 34 : 30}
                fill={glowColor}
                style={{ filter: 'blur(8px)' }}
              />
              {/* Outer ring when selected */}
              {isSelected && (
                <circle cx={x} cy={y} r={28} fill="none" stroke={fillColor} strokeWidth="2" strokeDasharray="4 2" opacity="0.7" />
              )}
              {/* Main circle */}
              <circle
                cx={x}
                cy={y}
                r={24}
                fill={fillColor}
                stroke={isSelected ? 'white' : fillColor}
                strokeWidth={isSelected ? 2 : 1}
                style={{ cursor: 'pointer', opacity: 0.9 }}
                onClick={(e) => handleNodeClick(node, e)}
              />
              {/* League label */}
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontFamily="var(--font-display), 'Bebas Neue', Impact, sans-serif"
                fontWeight="700"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                L{index + 1}
              </text>

              {/* NUKE ALERT badge */}
              {isNuke && (
                <text
                  x={x}
                  y={y + 38}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  ☢ NUKE
                </text>
              )}

              {/* ELITE badge */}
              {isElite && (
                <text
                  x={x}
                  y={y - 30}
                  textAnchor="middle"
                  fill="#22d3ee"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  ★ ELITE
                </text>
              )}
            </g>
          );
        })}

        {/* Player dots (TFO-colored) */}
        {placedPlayers.map((pd) => {
          const dot: TacticalPlayerDot = {
            id: pd.id,
            leagueId: pd.leagueId,
            name: pd.name,
            ktcValue: pd.ktcValue,
            tfoScore: pd.tfoScore,
            grade: pd.grade,
            verdict: pd.verdict,
          };
          const { stroke, glow } = tfoVerdictDotColors(pd.verdict);
          return (
            <g key={`p-${pd.id}`}>
              <circle
                cx={pd.px}
                cy={pd.py}
                r={10}
                fill={glow}
                style={{ filter: 'blur(6px)', pointerEvents: 'none' }}
              />
              <circle
                cx={pd.px}
                cy={pd.py}
                r={6}
                fill="rgba(15,23,42,0.85)"
                stroke={stroke}
                strokeWidth={2}
                style={{ cursor: 'crosshair' }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={(e) => updatePlayerTip(dot, e)}
                onMouseMove={(e) => updatePlayerTip(dot, e)}
                onMouseLeave={() => setPlayerTip(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Player TFO tooltip */}
      {playerTip && (
        <div
          className="pointer-events-none absolute z-[60] w-[min(200px,45vw)] rounded-lg border border-white/10 bg-[var(--bg-card)]/95 px-3 py-2 text-[10px] shadow-xl backdrop-blur-sm font-mono"
          style={{ left: playerTip.left, top: playerTip.top }}
        >
          <p className="font-semibold text-white truncate">{playerTip.dot.name}</p>
          <p className="mt-1 text-[#94A3B8]">
            TFO <span className="text-white tabular-nums">{Math.round(playerTip.dot.tfoScore)}</span>
            {' · '}
            <span className="text-white">{playerTip.dot.grade}</span>
          </p>
          <p className="mt-0.5 font-semibold" style={{ color: tfoVerdictDotColors(playerTip.dot.verdict).stroke }}>
            {playerTip.dot.verdict.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <div
          className="absolute z-50 w-72 rounded-xl border border-amber-500/40 bg-[var(--bg-card)] shadow-2xl p-4"
          style={{
            top: Math.max(10, popover.py - 20),
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="display text-amber-400 text-lg leading-tight">
              WAR PLAN ({popover.node.league.name} Tilted) **
            </p>
            <button
              type="button"
              className="text-[var(--text-muted)] hover:text-white shrink-0 mt-0.5"
              onClick={() => { setPopover(null); onSelectLeague(null); }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white mb-2">
            <span className="text-amber-400 font-bold">**DIRECTIVE:</span>{' '}
            {popover.node.league.empirePulse}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            <span className="text-amber-400 font-bold">**RATIONALE:</span>{' '}
            {popover.node.league.healthScore >= 70
              ? 'Empire is BOOM — assets aligned. Push for the title this season.'
              : popover.node.league.healthScore < 40
                ? 'Roster in BUST territory. Rebuild mode — strip aging nukes for picks.'
                : 'Roster is STABLE but needs a catalyst. Target a difference-maker in trades.'}
          </p>
          <Link
            href="/dashboard/trade"
            className="text-xs text-[var(--cyan)] hover:text-white underline underline-offset-2"
          >
            **Click to Generate Offensive Offer.
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WarRoomPage() {
  const [loading, setLoading] = useState(true);
  const [leagueAnalyses, setLeagueAnalyses] = useState<LeagueAnalysis[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueAnalysis | null>(null);
  const [tickerEntries, setTickerEntries] = useState<TickerEntry[]>([]);
  const [tfoByPlayer, setTfoByPlayer] = useState<Record<string, PlayerTfoSnapshot>>({});

  const handleSelectLeague = useCallback((lg: LeagueAnalysis | null) => {
    setSelectedLeague(lg);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      setLoading(true);

      // Best-effort sync
      try {
        await fetch('/api/sync', { method: 'POST' });
      } catch {
        /* best-effort */
      }
      if (cancelled) return;

      // Load leagues + profile
      const [{ data: leagueData }, profileRes] = await Promise.all([
        supabase
          .from('leagues')
          .select('id, name, season, total_rosters, scoring_settings')
          .order('season', { ascending: false }),
        supabase.from('profiles').select('sleeper_user_id').single(),
      ]);
      if (cancelled) return;

      const leagueList = (leagueData ?? []) as LeagueRow[];
      const ownerSid = profileRes.data?.sleeper_user_id
        ? String(profileRes.data.sleeper_user_id)
        : null;

      // Load rosters per league
      const rosterMap: Record<string, RostRow> = {};
      await Promise.all(
        leagueList.map(async (lg) => {
          const { data: rows } = ownerSid
            ? await supabase.from('rosters').select('*').eq('league_id', lg.id).eq('owner_id', ownerSid)
            : await supabase.from('rosters').select('*').eq('league_id', lg.id).limit(1);
          if (rows?.length) {
            const yours = ownerSid
              ? (rows.find((row) => String((row as RostRow).owner_id) === ownerSid) ?? rows[0])
              : rows[0];
            rosterMap[lg.id] = yours as RostRow;
          }
        })
      );
      if (cancelled) return;

      // Load KTC values
      const valsRes = await fetch('/api/values');
      const ktcMap: Record<string, number> = {};
      if (valsRes.ok) {
        const arr: { player_name: string; ktc_value: number }[] = await valsRes.json();
        for (const row of arr) ktcMap[row.player_name.toLowerCase()] = row.ktc_value;
      }
      if (cancelled) return;

      // Load players
      const allIds = Array.from(
        new Set(Object.values(rosterMap).flatMap((r) => r.players ?? []))
      ).slice(0, 280);

      let pmap: Record<string, PlayerRow> = {};
      if (allIds.length) {
        const pRes = await fetch(`/api/players?ids=${encodeURIComponent(allIds.join(','))}`);
        pmap = pRes.ok ? await pRes.json() : {};
      }
      if (cancelled) return;

      let dynastyRows: DynastyPlayer2026[] = [];
      try {
        const dynRes = await fetch('/api/rankings/dynasty-enriched');
        if (dynRes.ok) {
          const j = await dynRes.json();
          if (Array.isArray(j)) dynastyRows = j as DynastyPlayer2026[];
        }
      } catch {
        /* best-effort */
      }
      if (cancelled) return;

      const tfoMap = allIds.length ? buildTfoByPlayerId(allIds, pmap, ktcMap, dynastyRows) : {};

      // Build per-league analysis
      const analyses: LeagueAnalysis[] = leagueList.map((lg) => {
        const roster = rosterMap[lg.id];
        const playerIds = roster?.players ?? [];

        const rankedPlayers = buildRankedPlayers(playerIds, pmap, ktcMap);
        const rosterValue = playerIds.reduce((sum, pid) => {
          const p = pmap[pid];
          if (!p) return sum;
          return sum + (ktcMap[p.full_name.toLowerCase()] ?? 0);
        }, 0);

        const healthScore = calculateLeagueHealthScore({ rankedPlayers, extra1stRoundPicks: 0 });
        const signal = derivePrimarySignal(healthScore);
        const empirePulse = getEmpirePulse(healthScore);

        return { id: lg.id, name: lg.name, rosterValue, rankedPlayers, healthScore, signal, empirePulse };
      });

      if (!cancelled) {
        setLeagueAnalyses(analyses);
        setTickerEntries(generateTicker(analyses));
        setTfoByPlayer(tfoMap);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const playerDots = useMemo((): TacticalPlayerDot[] => {
    const dots: TacticalPlayerDot[] = [];
    const seen = new Set<string>();
    for (const lg of leagueAnalyses) {
      for (const rp of lg.rankedPlayers) {
        if (seen.has(rp.id)) continue;
        seen.add(rp.id);
        const t = tfoByPlayer[rp.id];
        if (!t) continue;
        dots.push({
          id: rp.id,
          leagueId: lg.id,
          name: rp.name,
          ktcValue: rp.ktcValue,
          tfoScore: t.tfoScore,
          grade: t.grade,
          verdict: t.verdict,
        });
      }
    }
    return dots;
  }, [leagueAnalyses, tfoByPlayer]);

  const tfoAgg = useMemo(() => {
    let bustCount = 0;
    let leanBustCount = 0;
    for (const t of Object.values(tfoByPlayer)) {
      if (t.verdict === 'BUST') bustCount++;
      if (t.verdict === 'LEAN_BUST') leanBustCount++;
    }
    return { bustCount, leanBustCount };
  }, [tfoByPlayer]);

  const defcon = useMemo(() => {
    if (leagueAnalyses.length === 0) {
      return { level: 5 as const, nukeCount: 0, boomCount: 0 };
    }
    return getDefcon(leagueAnalyses, tfoAgg);
  }, [leagueAnalyses, tfoAgg]);

  const defconUi = useMemo(() => {
    const { level } = defcon;
    if (level === 1) {
      return {
        label: '⚠ DEFCON 1 — CRITICAL ALERT',
        textClass: 'text-[#EF4444]',
        textAnimate: true,
        wrapClass:
          'defcon-banner-critical rounded-xl border px-5 py-4 text-center border-red-500/70',
      };
    }
    if (level === 2) {
      return {
        label: '⚡ DEFCON 2 — MULTIPLE ALERTS',
        textClass: 'text-[#FBBF24]',
        textAnimate: false,
        wrapClass: 'rounded-xl border px-5 py-4 text-center border-amber-400/40 bg-amber-500/[0.07]',
      };
    }
    if (level === 3) {
      return {
        label: '● DEFCON 3 — ELEVATED',
        textClass: 'text-[#22D3EE]',
        textAnimate: false,
        wrapClass: 'rounded-xl border px-5 py-4 text-center border-cyan-400/35 bg-cyan-500/[0.06]',
      };
    }
    return {
      label: `✓ DEFCON ${level} — OPERATIONAL`,
      textClass: 'text-[#36E7A1]',
      textAnimate: false,
      wrapClass: 'rounded-xl border px-5 py-4 text-center border-emerald-500/35 bg-emerald-500/[0.06]',
    };
  }, [defcon]);

  // ── Exploits ─────────────────────────────────────────────────────────────
  const exploits = selectedLeague ? generateExploits(selectedLeague) : [];

  // ── Ticker timestamp ──────────────────────────────────────────────────────
  function tickerTime(idx: number): string {
    const minutesAgo = idx * 3;
    if (minutesAgo === 0) return 'NOW';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return `${Math.floor(minutesAgo / 60)}h ago`;
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppBackground intensity="subtle">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-4 animate-pulse">
          <div className="h-16 rounded-xl bg-white/[0.04] shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-[500px] rounded-2xl bg-white/[0.04] shimmer" />
            ))}
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-24 pt-6 space-y-6">
        {/* ── DEFCON BANNER ───────────────────────────────────────────── */}
        <div className={defconUi.wrapClass}>
          <p
            className={clsx(
              'display text-[24px] leading-tight tracking-wide font-semibold',
              defconUi.textClass,
              defconUi.textAnimate && 'defcon-text-pulse'
            )}
          >
            {defconUi.label}
          </p>
        </div>

        {/* ── TOP BAR ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 px-5 py-4 backdrop-blur-sm">
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-mono">
              DYNASTY COACH
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="display font-normal leading-none text-white"
              style={{ fontSize: 'clamp(22px, 3vw, 36px)' }}
            >
              THE WAR ROOM (MISSION CONTROL)
            </h1>
          </div>
        </div>

        {/* ── THREE-COLUMN LAYOUT ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT: Empire Ticker ───────────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0f1a] border-b border-[var(--border)]">
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
              <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
              <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-mono display">
                EMPIRE TICKER (LEAGUE FEED)
              </span>
            </div>

            {/* Feed */}
            <div className="overflow-y-auto max-h-[500px] p-3 space-y-2 scrollbar-ticker-cyan">
              {tickerEntries.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] p-4">No active signals. Empire is quiet.</p>
              ) : (
                tickerEntries.map((entry, idx) => {
                  const st = TICKER_KIND_STYLES[entry.kind];
                  return (
                    <div
                      key={`${entry.kind}-${entry.league}-${idx}-${entry.text.slice(0, 24)}`}
                      className="glass-panel overflow-hidden border border-white/[0.08] bg-black/20 pl-0 pr-3 py-2.5"
                      style={{ borderLeftWidth: 4, borderLeftColor: st.border }}
                    >
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 pl-3">
                        <span className="font-mono text-[9px] text-[#475569] shrink-0 tabular-nums w-[3.25rem]">
                          {tickerTime(idx)}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span
                            className="font-mono text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: st.pillBg,
                              color: st.pillText,
                              border: `1px solid ${st.pillBorder}`,
                            }}
                          >
                            {entry.kind}
                          </span>
                          <span
                            className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: st.pillBg,
                              color: st.pillText,
                              border: `1px solid ${st.pillBorder}`,
                            }}
                          >
                            {entry.league}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-[#94A3B8] flex-1 min-w-[min(100%,12rem)]">{entry.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Blinking cursor */}
              <div className="flex gap-2 items-center text-xs text-[#36E7A1] py-2 px-1 opacity-80">
                <span className="font-mono text-[9px] text-[#475569]">NOW</span>
                <span className="animate-pulse font-mono">█</span>
              </div>
            </div>
          </div>

          {/* ── CENTER: Tactical Map ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--border)] bg-targeting overflow-hidden relative shadow-[0_0_40px_rgba(34,211,238,0.06)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22D3EE]/45 to-transparent z-10" />
            <div className="px-5 py-4 border-b border-[var(--border)] bg-black/20">
              <h2 className="display text-white text-xl leading-none tracking-wide">
                TACTICAL MAP (ASSET DENSITY MATRIX)
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1 uppercase tracking-wider">
                Click a node to reveal war plan
              </p>
            </div>

            <div className="p-4 pl-10">
              {leagueAnalyses.length === 0 ? (
                <div className="flex items-center justify-center h-[500px] text-[var(--text-muted)] text-sm font-mono glass-panel border border-white/[0.06] rounded-xl">
                  No league data. Sync your leagues first.
                </div>
              ) : (
                <div className="glass-panel border border-white/[0.08] rounded-xl p-3 shadow-inner">
                  <TacticalMap leagues={leagueAnalyses} playerDots={playerDots} onSelectLeague={handleSelectLeague} />
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#22d3ee] shrink-0" />
                <span className="text-[var(--text-muted)]">League · BOOM</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#6366f1] shrink-0" />
                <span className="text-[var(--text-muted)]">League · STABLE</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0" />
                <span className="text-[var(--text-muted)]">League · BUST</span>
              </span>
              <span className="hidden sm:inline w-px h-4 bg-white/10 self-center" aria-hidden />
              <span className="text-[var(--text-muted)]">Player TFO · </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-[#36E7A1] bg-black/40" />
                <span className="text-[var(--text-muted)]">BOOM</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-[#94A3B8] bg-black/40" />
                <span className="text-[var(--text-muted)]">NEUTRAL</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-[#EF4444] bg-black/40" />
                <span className="text-[var(--text-muted)]">BUST</span>
              </span>
            </div>
          </div>

          {/* ── RIGHT: Intelligence Console ──────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="display text-white text-xl leading-none tracking-wide">
                INTELLIGENCE CONSOLE
              </h2>
            </div>
            <div className="flex justify-around items-center p-2 mb-2 border-b border-white/[0.06]">
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg leading-none text-[#38BDF8]" aria-hidden>
                  ⚡
                </span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: '#36E7A1' }}>
                  Boomer
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg leading-none" aria-hidden>
                  🔥
                </span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: '#EF4444' }}>
                  Buster
                </span>
              </div>
            </div>

            <div className="p-5">
              {selectedLeague ? (
                <>
                  <p className="display text-[var(--gold)] text-base mb-4 leading-tight uppercase tracking-wide">
                    TOP 3 EXPLOITS ({selectedLeague.name})
                  </p>

                  <div className="space-y-4">
                    {exploits.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]"
                      >
                        <span className="display text-2xl text-[var(--gold)] shrink-0 leading-none mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {row.text}{' '}
                          <span
                            className="font-bold font-mono text-[11px]"
                            style={{ color: row.mascot === 'boomer' ? '#36E7A1' : '#EF4444' }}
                          >
                            ({row.mascot === 'boomer' ? 'Boomer' : 'Buster'}).
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empire Pulse */}
                  <div className="mt-5 p-3 rounded-xl border border-[var(--indigo)]/30 bg-[var(--indigo)]/10">
                    <p className="text-[10px] uppercase tracking-widest text-[var(--indigo-light)] font-mono mb-1">
                      Empire Pulse
                    </p>
                    <p className="text-xs text-white leading-relaxed italic">
                      &ldquo;{selectedLeague.empirePulse}&rdquo;
                    </p>
                  </div>

                  {/* Health score bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                        Health Score
                      </span>
                      <span className="text-sm font-bold text-white display">
                        {selectedLeague.healthScore}/100
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedLeague.healthScore}%`,
                          background:
                            selectedLeague.signal === 'BOOM'
                              ? '#22d3ee'
                              : selectedLeague.signal === 'BUST'
                                ? '#ef4444'
                                : '#6366f1',
                        }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[9px] text-[var(--text-muted)] font-mono uppercase">
                      <span>BUST</span>
                      <span
                        className={
                          selectedLeague.signal === 'BOOM'
                            ? 'text-[var(--cyan)]'
                            : selectedLeague.signal === 'BUST'
                              ? 'text-red-400'
                              : 'text-[var(--indigo-light)]'
                        }
                      >
                        {selectedLeague.signal}
                      </span>
                      <span>BOOM</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[380px] text-center gap-4">
                  <span className="text-5xl">🎯</span>
                  <p className="text-[var(--text-muted)] text-sm font-mono uppercase tracking-wider">
                    Click a node to reveal intelligence
                  </p>
                  <p className="text-xs text-[var(--text-muted)]/60 max-w-[200px]">
                    Select a league on the Tactical Map to generate exploits.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── EMPIRE SUMMARY ROW ───────────────────────────────────────── */}
        {leagueAnalyses.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 px-5 py-4">
            <p className="display text-[var(--text-muted)] text-xs uppercase tracking-[0.2em] mb-3">
              Empire Quick Stats
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="display text-3xl text-[var(--gold)]">
                  {leagueAnalyses.length}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mt-1">
                  Leagues
                </p>
              </div>
              <div>
                <p className="display text-3xl text-[#22d3ee]">
                  {leagueAnalyses.filter((l) => l.signal === 'BOOM').length}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mt-1">
                  BOOM
                </p>
              </div>
              <div>
                <p className="display text-3xl text-red-400">
                  {leagueAnalyses.filter((l) => l.signal === 'BUST').length}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mt-1">
                  BUST
                </p>
              </div>
              <div>
                <p className="display text-3xl text-[var(--indigo-light)]">
                  {Math.round(leagueAnalyses.reduce((s, l) => s + l.healthScore, 0) / leagueAnalyses.length)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider mt-1">
                  Avg Health
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppBackground>
  );
}
