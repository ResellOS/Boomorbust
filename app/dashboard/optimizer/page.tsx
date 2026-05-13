'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  Loader2,
  Play,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import {
  classifyAsset,
  calculateLeagueHealthScore,
  getAssetDistribution,
  type AssetTier,
  type RankedPlayer,
} from '@/lib/health/leagueHealthScore';
import { calculatePlayerDynastyScore } from '@/lib/values/engine';
import type { OptimizerScanPlayerRow, OptimizerScanResponse } from '@/app/api/optimizer/scan/route';

// ─── Font helpers ──────────────────────────────────────────────────────────
const F_BEBAS = { fontFamily: 'var(--font-display), "Bebas Neue", Impact, sans-serif' } as const;
const F_INTER = { fontFamily: 'var(--font-body), Inter, system-ui, sans-serif' } as const;

// ─── Positions ─────────────────────────────────────────────────────────────
const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
type Pos = (typeof KEY_POSITIONS)[number];

// ─── Tier display config ───────────────────────────────────────────────────
const TIER_DISPLAY: Record<AssetTier, { label: string; icon: string; bg: string; text: string; border: string }> = {
  diamond: { label: 'Diamond', icon: '◆',   bg: 'bg-amber-500/15',   text: 'text-amber-300',    border: 'border-amber-500/40' },
  gem:     { label: 'Gem',     icon: '✦',   bg: 'bg-indigo-500/15',  text: 'text-[var(--indigo-light)]', border: 'border-indigo-500/40' },
  starter: { label: 'Starter', icon: '—',   bg: 'bg-emerald-500/15', text: 'text-emerald-300',   border: 'border-emerald-500/40' },
  nuke:    { label: 'Nuke',    icon: '☠',   bg: 'bg-red-500/15',     text: 'text-red-400',       border: 'border-red-500/40' },
};

// ─── Types ─────────────────────────────────────────────────────────────────
interface LeagueRow {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

interface RosterRow {
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

interface Directive {
  id: string;
  type: 'CONSOLIDATE' | 'RISK_CHECK' | 'AGE_CLIFF';
  pos: string;
  title: string;
  body: string;
  boomLabel: string;
  bustLabel: string;
}

interface EnrichedPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number | null;
  ktcValue: number;
  tier: AssetTier;
  trend: 'rising' | 'stable' | 'declining';
  positionRank: number;
  isStarter: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function normPos(p: string): string {
  const u = (p ?? '').toUpperCase();
  if (u === 'DST') return 'DEF';
  return u;
}


/** Build position-ranked players for a set of player IDs across ALL leagues (for cross-league ranking). */
function buildRankedPlayers(
  ids: string[],
  players: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
): RankedPlayer[] {
  // Group by position then rank
  const byPos: Record<string, Array<{ id: string; ktc: number; age: number | null }>> = {};
  for (const id of ids) {
    const p = players[id];
    if (!p) continue;
    const pos = normPos(p.position);
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    if (!byPos[pos]) byPos[pos] = [];
    byPos[pos]!.push({ id, ktc: ktcMap[p.full_name.toLowerCase()] ?? 0, age: p.age ?? null });
  }

  const result: RankedPlayer[] = [];
  for (const [pos, group] of Object.entries(byPos)) {
    const sorted = [...group].sort((a, b) => b.ktc - a.ktc);
    sorted.forEach((item, idx) => {
      const p = players[item.id]!;
      result.push({
        id: item.id,
        name: p.full_name,
        position: pos,
        age: item.age,
        ktcValue: item.ktc,
        positionRank: idx + 1,
      });
    });
  }
  return result;
}

function buildEnrichedRoster(
  ids: string[],
  starters: string[],
  players: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
  globalRanked: RankedPlayer[],
): EnrichedPlayer[] {
  const starterSet = new Set(starters);
  const rankedById = new Map(globalRanked.map((r) => [r.id, r]));

  return ids
    .map((id): EnrichedPlayer | null => {
      const p = players[id];
      if (!p) return null;
      const pos = normPos(p.position);
      if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) return null;
      const ktcValue = ktcMap[p.full_name.toLowerCase()] ?? 0;
      const ranked = rankedById.get(id);
      const positionRank = ranked?.positionRank ?? 99;
      const tier = ranked ? classifyAsset(ranked) : 'nuke';
      const dynScore = calculatePlayerDynastyScore(p, ktcValue);
      return {
        id,
        name: p.full_name,
        position: pos,
        team: p.team ?? '—',
        age: p.age ?? null,
        ktcValue,
        tier,
        trend: dynScore.trend,
        positionRank,
        isStarter: starterSet.has(id),
      };
    })
    .filter((x): x is EnrichedPlayer => x !== null)
    .sort((a, b) => b.ktcValue - a.ktcValue);
}

function generateDirectives(
  enriched: EnrichedPlayer[],
): Directive[] {
  const directives: Directive[] = [];

  const byPos = (pos: string) => enriched.filter((p) => p.position === pos);
  const rbs = byPos('RB');
  const wrs = byPos('WR');

  // CONSOLIDATE: if WRs have more gems than diamonds AND total RBs > 6
  const wrGems = wrs.filter((p) => p.tier === 'gem').length;
  const wrDiamonds = wrs.filter((p) => p.tier === 'diamond').length;
  if (wrGems > wrDiamonds && rbs.length > 6) {
    const top2WrGems = wrs.filter((p) => p.tier === 'gem').slice(0, 2);
    directives.push({
      id: 'consolidate',
      type: 'CONSOLIDATE',
      pos: 'WR',
      title: top2WrGems.length >= 2
        ? `Offer ${top2WrGems[1]!.name} for an elite RB upgrade`
        : 'Convert WR gem depth into RB scarcity',
      body: `You carry ${wrGems} WR gems vs ${wrDiamonds} diamonds. WR depth exceeds starting requirements — consolidate into RB value where elite assets are scarce.`,
      boomLabel: "Insulation Play",
      bustLabel: "Nuke Risk",
    });
  } else {
    // Default consolidate directive
    const tradeChip = wrs.find((p) => p.tier === 'gem' || p.tier === 'starter');
    directives.push({
      id: 'consolidate',
      type: 'CONSOLIDATE',
      pos: 'WR',
      title: tradeChip ? `${tradeChip.name} is a premium trade chip` : 'Assess WR depth for consolidation',
      body: tradeChip
        ? `${tradeChip.name} has strong trade value. Target RB or QB upgrades to shore up championship windows.`
        : 'Survey your WR depth — gems outside your starting lineup can unlock upgrades at scarce positions.',
      boomLabel: "Sell High",
      bustLabel: "Hold Trap",
    });
  }

  // RISK CHECK: any RB > 27 or WR > 30 who is a starter
  const riskyStarters = enriched.filter(
    (p) =>
      p.isStarter &&
      ((p.position === 'RB' && (p.age ?? 0) > 27) || (p.position === 'WR' && (p.age ?? 0) > 30)),
  );
  if (riskyStarters.length > 0) {
    const riskPlayer = riskyStarters[0]!;
    directives.push({
      id: 'risk',
      type: 'RISK_CHECK',
      pos: riskPlayer.position,
      title: `${riskPlayer.name} is an age-risk starter`,
      body: `${riskPlayer.name} (${riskPlayer.position}, age ${riskPlayer.age ?? '?'}) is starting despite dynasty cliff risk. Move before market corrects or injury erodes value.`,
      boomLabel: "Sell Window Open",
      bustLabel: "Cliff Exposure",
    });
  } else {
    const oldest = enriched
      .filter((p) => p.position === 'RB' || p.position === 'WR')
      .sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0];
    directives.push({
      id: 'risk',
      type: 'RISK_CHECK',
      pos: oldest?.position ?? 'RB',
      title: oldest ? `Monitor ${oldest.name} training camp variance` : 'No critical age-risk starters detected',
      body: oldest
        ? `${oldest.name} (age ${oldest.age ?? '?'}) sits near dynasty cliff territory. Have a contingency plan entering the season.`
        : 'Your roster is clear of dangerous age-risk starters. Stay vigilant on waiver wire trends.',
      boomLabel: "Rebound Watch",
      bustLabel: "Bust Exposure",
    });
  }

  // AGE CLIFF: average RB age > 26
  const rbsWithAge = rbs.filter((p) => p.age !== null);
  const avgRbAge = rbsWithAge.length
    ? rbsWithAge.reduce((s, p) => s + (p.age ?? 0), 0) / rbsWithAge.length
    : 0;

  if (avgRbAge > 26) {
    const nukeRbs = rbs.filter((p) => p.tier === 'nuke').slice(0, 2);
    directives.push({
      id: 'age_cliff',
      type: 'AGE_CLIFF',
      pos: 'RB',
      title: nukeRbs[0] ? `Sell ${nukeRbs[0].name} before training camp` : `RB corps avg age is ${avgRbAge.toFixed(1)} — rebuild window`,
      body: nukeRbs[0]
        ? `Average RB age of ${avgRbAge.toFixed(1)} signals a cliff incoming. ${nukeRbs[0].name} has the lowest runway — move now for a mid-round pick.`
        : `Your RB room averages ${avgRbAge.toFixed(1)} years old. Target young RBs in trade or draft to reset the age curve.`,
      boomLabel: "Sell High",
      bustLabel: "Hold Trap",
    });
  } else {
    directives.push({
      id: 'age_cliff',
      type: 'AGE_CLIFF',
      pos: 'RB',
      title: `RB age curve looks healthy (avg ${avgRbAge > 0 ? avgRbAge.toFixed(1) : '—'})`,
      body: avgRbAge > 0
        ? `Your RB corps averages ${avgRbAge.toFixed(1)} years old — within dynasty prime range. Hold current assets and monitor draft capital for future replenishment.`
        : 'No RB age data available yet. Ensure your roster is synced for full analysis.',
      boomLabel: "Hold & Reload",
      bustLabel: "Depth Risk",
    });
  }

  return directives;
}

function dedupeScanByBestTfo(rows: OptimizerScanPlayerRow[]): OptimizerScanPlayerRow[] {
  const map = new Map<string, OptimizerScanPlayerRow>();
  for (const r of rows) {
    const prev = map.get(r.playerId);
    if (!prev || r.tfoScore > prev.tfoScore) map.set(r.playerId, r);
  }
  return Array.from(map.values());
}

function distFromScanPlayers(rows: OptimizerScanPlayerRow[]) {
  return {
    diamonds: rows.filter((p) => p.tier === 'diamond').length,
    gems: rows.filter((p) => p.tier === 'gem').length,
    starters: rows.filter((p) => p.tier === 'starter').length,
    nukes: rows.filter((p) => p.tier === 'nuke').length,
  };
}

function scanRowsToEnriched(
  rows: OptimizerScanPlayerRow[],
  ktcMap: Record<string, number>,
  starterSetsByLeague: Record<string, Set<string>>,
): EnrichedPlayer[] {
  return rows
    .map((r): EnrichedPlayer => {
      const starters = starterSetsByLeague[r.leagueId];
      const trend: EnrichedPlayer['trend'] =
        r.tier === 'diamond' || r.tier === 'gem' ? 'rising' : r.tier === 'nuke' ? 'declining' : 'stable';
      return {
        id: r.playerId,
        name: r.playerName,
        position: r.position,
        team: r.team,
        age: r.age,
        ktcValue: ktcMap[r.playerName.toLowerCase()] ?? 0,
        tier: r.tier,
        trend,
        positionRank: 99,
        isStarter: starters?.has(r.playerId) ?? false,
      };
    })
    .sort((a, b) => b.ktcValue - a.ktcValue);
}

function scanDirectivesToPanel(rows: OptimizerScanResponse['directives']): Directive[] {
  return rows.map((r, i) => ({
    id: `${r.type.toLowerCase()}_${i}`,
    type: r.type,
    pos: r.type === 'AGE_CLIFF' ? 'WR' : r.type === 'CONSOLIDATE' ? 'ALL' : 'RB',
    title: r.type.replace('_', ' '),
    body: r.message,
    boomLabel: 'Execute',
    bustLabel: 'Defer',
  }));
}

function buildGapAlerts(
  enriched: EnrichedPlayer[],
  players: Record<string, PlayerRow>,
  ktcMap: Record<string, number>,
): string[] {
  const alerts: string[] = [];

  // Find weakest starting positions
  const starters = enriched.filter((p) => p.isStarter);
  const byPos = (pos: string) => starters.filter((p) => p.position === pos);

  const posChecks: Array<{ pos: string; label: string; pick: string }> = [
    { pos: 'RB', label: 'RB2', pick: '1.03' },
    { pos: 'WR', label: 'WR3', pick: '2.01' },
    { pos: 'QB', label: 'QB1', pick: '1.06' },
  ];

  for (const { pos, label, pick } of posChecks) {
    const posPlayers = byPos(pos).sort((a, b) => b.ktcValue - a.ktcValue);
    const weakLink = posPlayers[1] ?? posPlayers[0];
    if (!weakLink || weakLink.tier === 'nuke' || weakLink.ktcValue < 1500) {
      // Find a rising target in ktcMap for recommendation
      const risingTargets = Object.entries(players)
        .map(([, p]) => {
          if (normPos(p.position) !== pos) return null;
          const ktc = ktcMap[p.full_name.toLowerCase()] ?? 0;
          const dynScore = calculatePlayerDynastyScore(p, ktc);
          return { name: p.full_name, ktc, trend: dynScore.trend };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null && x.ktc > 2000 && x.trend === 'rising')
        .sort((a, b) => b.ktc - a.ktc);

      const target = risingTargets[0];
      if (target) {
        alerts.push(`GAP: ${label} → Use Pick ${pick} (Target: ${target.name})`);
      } else if (weakLink) {
        alerts.push(`GAP: ${label} → Upgrade from ${weakLink.name} via trade`);
      }
      if (alerts.length >= 3) break;
    }
  }

  if (alerts.length === 0) {
    alerts.push('No critical roster gaps detected — consider selling high to build draft capital');
  }

  return alerts.slice(0, 3);
}

// ─── Heatmap data ──────────────────────────────────────────────────────────
type HeatCell = { count: number; tier: AssetTier; dominant: boolean };
type HeatmapData = Record<Pos, Record<AssetTier, HeatCell>>;

function buildHeatmap(enriched: EnrichedPlayer[]): HeatmapData {
  const tiers: AssetTier[] = ['diamond', 'gem', 'starter', 'nuke'];
  const heatmap = {} as HeatmapData;

  for (const pos of KEY_POSITIONS) {
    heatmap[pos] = {} as Record<AssetTier, HeatCell>;
    const posPlayers = enriched.filter((p) => p.position === pos);
    let maxCount = 0;
    for (const tier of tiers) {
      const count = posPlayers.filter((p) => p.tier === tier).length;
      if (count > maxCount) maxCount = count;
      heatmap[pos]![tier] = { count, tier, dominant: false };
    }
    // Mark dominant tier
    for (const tier of tiers) {
      const cell = heatmap[pos]![tier]!;
      if (cell.count > 0 && cell.count === maxCount) {
        cell.dominant = true;
        break;
      }
    }
  }
  return heatmap;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: string }) {
  const styles: Record<string, string> = {
    QB: 'bg-[var(--indigo)]/25 text-[var(--indigo-light)] border-[var(--indigo)]/35',
    RB: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
    WR: 'bg-[var(--cyan)]/15 text-[var(--cyan)] border-[var(--cyan)]/30',
    TE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    K: 'bg-white/5 text-[var(--text-muted)] border-[var(--border)]',
    DEF: 'bg-red-500/15 text-red-300 border-red-500/25',
  };
  const s = styles[pos] ?? 'bg-white/5 text-[var(--text-muted)] border-[var(--border)]';
  return (
    <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border', s)} style={F_INTER}>
      {pos}
    </span>
  );
}

function TierIcon({ tier }: { tier: AssetTier }) {
  const d = TIER_DISPLAY[tier];
  return (
    <span className={clsx('text-sm font-bold', d.text)} title={d.label} aria-label={d.label}>
      {d.icon}
    </span>
  );
}

function ValueBar({ ktcValue, trend }: { ktcValue: number; trend: 'rising' | 'stable' | 'declining' }) {
  const pct = Math.min(100, Math.round((ktcValue / 10000) * 100));
  const colorClass = trend === 'rising' ? 'bg-emerald-400' : trend === 'declining' ? 'bg-red-400' : 'bg-amber-400';
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--border)]">
      <div className={clsx('h-full rounded-full transition-all duration-700', colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PlayerAvatar({ pid, name, size = 32 }: { pid: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className="shrink-0 rounded flex items-center justify-center text-[10px] font-bold bg-[var(--indigo)]/30 text-[var(--indigo-light)]"
        style={{ width: size, height: size, ...F_INTER }}
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

function BoomBustTags({ boomLabel, bustLabel }: { boomLabel: string; bustLabel: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className="flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border-[var(--cyan)]/40 bg-[var(--cyan)]/10 text-[var(--cyan)]"
        style={F_INTER}
      >
        <TrendingUp className="h-2.5 w-2.5" />
        {boomLabel}
      </span>
      <span
        className="flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border-red-500/40 bg-red-500/10 text-red-400"
        style={F_INTER}
      >
        <TrendingDown className="h-2.5 w-2.5" />
        {bustLabel}
      </span>
    </div>
  );
}

// ─── Heatmap section ────────────────────────────────────────────────────────
function ValueHeatmap({ enriched }: { enriched: EnrichedPlayer[] }) {
  const heatmap = useMemo(() => buildHeatmap(enriched), [enriched]);
  const tiers: AssetTier[] = ['diamond', 'gem', 'starter', 'nuke'];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <p className="display text-sm text-[var(--text-muted)] uppercase tracking-[0.14em] mb-3">Value Heatmap</p>
      {/* Header row */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        <div />
        {tiers.map((tier) => {
          const d = TIER_DISPLAY[tier];
          return (
            <div key={tier} className="text-center">
              <span className={clsx('text-base', d.text)}>{d.icon}</span>
              <p className={clsx('text-[9px] font-bold uppercase tracking-wide mt-0.5', d.text)} style={F_INTER}>
                {d.label}
              </p>
            </div>
          );
        })}
      </div>
      {/* Position rows */}
      {KEY_POSITIONS.map((pos) => (
        <div key={pos} className="grid grid-cols-5 gap-1 mt-1">
          <div className="flex items-center">
            <PosBadge pos={pos} />
          </div>
          {tiers.map((tier) => {
            const cell = heatmap[pos]![tier]!;
            const d = TIER_DISPLAY[tier];
            return (
              <div
                key={tier}
                className={clsx(
                  'flex flex-col items-center justify-center rounded py-1.5 min-h-[44px] border',
                  cell.count === 0
                    ? 'border-[var(--border)] bg-[var(--bg-secondary)]/40'
                    : clsx(d.bg, d.border),
                  cell.dominant && cell.count > 0 && 'ring-1 ring-inset ring-white/10',
                )}
              >
                <span
                  className={clsx('font-bold tabular-nums text-sm', cell.count === 0 ? 'text-[var(--text-muted)]' : d.text)}
                  style={F_INTER}
                >
                  {cell.count}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Directives section ─────────────────────────────────────────────────────
function DirectivesPanel({ directives }: { directives: Directive[] }) {
  return (
    <div className="space-y-3">
      {directives.map((d) => (
        <div
          key={d.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
        >
          <p className="display text-lg text-white tracking-[0.06em]">
            {d.type.replace('_', ' ')} ({d.pos})
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]" style={F_INTER}>
            {d.body}
          </p>
          <BoomBustTags boomLabel={d.boomLabel} bustLabel={d.bustLabel} />
        </div>
      ))}
    </div>
  );
}

// ─── Player roster list ─────────────────────────────────────────────────────
function RosterPlayerRow({
  player,
  active,
  onClick,
}: {
  player: EnrichedPlayer;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'flex w-full items-center gap-2.5 border-b border-[var(--border)]/60 px-3 py-2.5 text-left transition hover:bg-white/[0.025]',
          active && 'bg-white/[0.03]',
        )}
      >
        <PosBadge pos={player.position} />
        <PlayerAvatar pid={player.id} name={player.name} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white" style={F_INTER}>
            {player.name}
          </p>
          <p className="text-[9px] text-[var(--text-muted)]" style={F_INTER}>
            {player.team}
            {player.age ? ` · Age ${player.age}` : ''}
          </p>
        </div>
        <ValueBar ktcValue={player.ktcValue} trend={player.trend} />
        <span className="w-12 shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--text-secondary)]" style={F_INTER}>
          {player.ktcValue > 0 ? player.ktcValue.toLocaleString() : '—'}
        </span>
        <TierIcon tier={player.tier} />
        <ChevronDown
          className={clsx('h-3.5 w-3.5 shrink-0 transition-transform text-[var(--text-muted)]', active && 'rotate-180')}
        />
      </button>

      {active && (
        <div className="border-b border-[var(--border)]/60 bg-[var(--bg-secondary)]/50 px-4 py-3">
          <div className="flex flex-wrap gap-2 text-[10px]">
            <div
              className="flex items-center gap-1.5 rounded border border-[var(--cyan)]/30 bg-[var(--cyan)]/8 px-2 py-1.5"
              style={F_INTER}
            >
              <BarChart3 className="h-3 w-3 text-[var(--cyan)]" />
              <span className="text-[var(--text-muted)] uppercase tracking-wider">BBV TREND</span>
              <span
                className={clsx(
                  'font-semibold',
                  player.trend === 'rising' ? 'text-emerald-300' : player.trend === 'declining' ? 'text-red-400' : 'text-amber-300',
                )}
              >
                {player.trend === 'rising' ? '↑ Rising' : player.trend === 'declining' ? '↓ Declining' : '→ Stable'}
              </span>
            </div>
            <Link
              href={`/dashboard/trade?giving=${encodeURIComponent(player.name)}`}
              className="flex items-center gap-1.5 rounded border border-[var(--indigo)]/40 bg-[var(--indigo)]/15 px-2 py-1.5 text-[var(--indigo-light)] font-semibold uppercase tracking-wide transition hover:bg-[var(--indigo)]/25"
              style={F_INTER}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowLeftRight className="h-3 w-3" />
              Analyze Trade
            </Link>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded border border-[var(--border)] px-2 py-1.5 text-[var(--text-secondary)] font-semibold uppercase tracking-wide transition hover:border-[var(--border-hover)] hover:text-white"
              style={F_INTER}
            >
              <Zap className="h-3 w-3" />
              View In League Posts
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function RosterList({ enriched }: { enriched: EnrichedPlayer[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setActiveId((prev) => (prev === id ? null : id)), []);

  if (enriched.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]" style={F_INTER}>
        No players loaded yet
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)]/40 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]" style={F_INTER}>
          Roster · {enriched.length} players
        </p>
        <span className="text-[9px] text-[var(--text-muted)]" style={F_INTER}>tap for actions</span>
      </div>
      <div className="bg-[var(--bg-card)]">
        {enriched.map((p) => (
          <RosterPlayerRow
            key={p.id}
            player={p}
            active={activeId === p.id}
            onClick={() => toggle(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── League Drawer ──────────────────────────────────────────────────────────
function LeagueDrawer({
  league,
  enriched,
  healthScore,
  directives,
  gapAlerts,
  scanning,
  onScan,
  onClose,
}: {
  league: LeagueRow | null;
  enriched: EnrichedPlayer[];
  healthScore: number;
  directives: Directive[];
  gapAlerts: string[];
  scanning: boolean;
  onScan: () => void;
  onClose: () => void;
}) {
  const visible = league !== null;

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  const boomerPlayer = enriched[0] ?? null;
  const busterPlayer = enriched.find((p) => p.tier === 'nuke') ?? enriched[enriched.length - 1] ?? null;

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-[40] bg-black/55 transition-opacity duration-300',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={clsx(
          'fixed bottom-0 right-0 top-[57px] z-[41] flex w-full flex-col overflow-hidden border-l border-[var(--border)] transition-transform duration-300 ease-out sm:w-[min(500px,92vw)]',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ background: '#080B12' }}
        role="dialog"
        aria-modal="true"
        aria-label="League analysis"
      >
        {league && (
          <>
            {/* Drawer header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-black/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white" style={F_INTER}>
                  {league.name}
                </p>
                <div
                  className="mt-1 flex w-fit items-center gap-1.5 rounded border border-[var(--cyan)]/40 bg-[var(--cyan)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--cyan)]"
                  style={F_INTER}
                >
                  <Zap className="h-2.5 w-2.5" />
                  Context: Roster Health &amp; Value Optimization
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-center">
                  <span
                    className={clsx(
                      'display text-2xl leading-none',
                      healthScore >= 70 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-300' : 'text-red-400',
                    )}
                  >
                    {healthScore}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide" style={F_INTER}>health</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">

              {/* Boomer + Buster */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--cyan)]/35 bg-[var(--cyan)]/[0.06] p-3.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 shrink-0 text-[var(--cyan)]" />
                    <p className="display text-sm tracking-[0.06em] text-[var(--cyan)]">
                      DIRECTIVE
                    </p>
                  </div>
                  <p className="display text-xs tracking-wide text-[var(--text-muted)] mb-1">
                    BOOMER&apos;S INSULATION PLAY
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]" style={F_INTER}>
                    {boomerPlayer
                      ? `${boomerPlayer.name} anchors your dynasty core with elite KTC positioning. Protect this asset — do not move without significant draft capital return.`
                      : 'Add players to see your insulation play.'}
                  </p>
                  {boomerPlayer && (
                    <div className="mt-2 flex items-center gap-2">
                      <PlayerAvatar pid={boomerPlayer.id} name={boomerPlayer.name} size={22} />
                      <span className="text-[10px] font-semibold text-[var(--cyan)]" style={F_INTER}>
                        {boomerPlayer.name} · {boomerPlayer.ktcValue.toLocaleString()} KTC
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-red-500/35 bg-red-500/[0.06] p-3.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="display text-sm tracking-[0.06em] text-red-400">
                      RATIONALE
                    </p>
                  </div>
                  <p className="display text-xs tracking-wide text-[var(--text-muted)] mb-1">
                    BUSTER&apos;S NUKE RISK
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]" style={F_INTER}>
                    {busterPlayer
                      ? `${busterPlayer.name} carries the lowest dynasty outlook in this league. Consider moving before training camp attrition accelerates the decline.`
                      : 'No nuke-tier assets detected.'}
                  </p>
                  {busterPlayer && (
                    <div className="mt-2 flex items-center gap-2">
                      <PlayerAvatar pid={busterPlayer.id} name={busterPlayer.name} size={22} />
                      <span className="text-[10px] font-semibold text-red-400" style={F_INTER}>
                        {busterPlayer.name} · sell window open
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Value heatmap */}
              <ValueHeatmap enriched={enriched} />

              {/* Directives */}
              <div>
                <p className="display text-sm uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">
                  Directives
                </p>
                <DirectivesPanel directives={directives} />
              </div>

              {/* Scan button */}
              <button
                type="button"
                onClick={onScan}
                disabled={scanning}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-base font-bold text-white transition disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--indigo) 0%, #4338ca 60%, rgba(34,211,238,0.55) 100%)',
                  boxShadow: '0 0 28px rgba(99,102,241,0.4)',
                  ...F_BEBAS,
                  letterSpacing: '0.1em',
                  fontSize: '1.05rem',
                }}
              >
                {scanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> SCANNING ROSTER…</>
                ) : (
                  <><Play className="h-4 w-4 fill-white/80" /> RUN OPTIMIZATION SCAN</>
                )}
              </button>

              {/* Mock draft integration */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <p className="display text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Mock Draft Integration
                  </p>
                  <span
                    className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300"
                    style={F_INTER}
                  >
                    Post-NFL Draft
                  </span>
                </div>
                {gapAlerts.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 border-b border-[var(--border)]/60 py-2 last:border-b-0"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--indigo)]" />
                    <p className="text-[10px] leading-snug text-[var(--text-secondary)]" style={F_INTER}>{g}</p>
                  </div>
                ))}
              </div>

              {/* Player roster list */}
              <RosterList enriched={enriched} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function OptimizerPage() {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [rosterByLeague, setRosterByLeague] = useState<Record<string, RosterRow>>({});
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [selectedLeague, setSelectedLeague] = useState<LeagueRow | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OptimizerScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Load data — same pattern as portfolio page
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      setLoading(true);

      const [{ data: leagueData }, profileRes] = await Promise.all([
        supabase.from('leagues').select('id, name, season, total_rosters, scoring_settings').order('season', { ascending: false }),
        supabase.from('profiles').select('sleeper_user_id').single(),
      ]);
      if (cancelled) return;

      const leagueList = (leagueData ?? []) as LeagueRow[];
      const ownerSid = profileRes.data?.sleeper_user_id ? String(profileRes.data.sleeper_user_id) : null;
      setLeagues(leagueList);

      // Fetch rosters
      const rosterMap: Record<string, RosterRow> = {};
      await Promise.all(
        leagueList.map(async (lg) => {
          const { data: rows } = ownerSid
            ? await supabase.from('rosters').select('*').eq('league_id', lg.id).eq('owner_id', ownerSid)
            : await supabase.from('rosters').select('*').eq('league_id', lg.id).limit(1);
          if (rows?.length) {
            const yours = ownerSid
              ? rows.find((row) => String((row as RosterRow).owner_id) === ownerSid) ?? rows[0]
              : rows[0];
            rosterMap[lg.id] = yours as RosterRow;
          }
        }),
      );
      if (cancelled) return;
      setRosterByLeague(rosterMap);

      // Fetch KTC values
      const valsRes = await fetch('/api/values');
      const kLower: Record<string, number> = {};
      if (valsRes.ok) {
        const arr: { player_name: string; ktc_value: number }[] = await valsRes.json();
        for (const row of arr) kLower[row.player_name.toLowerCase()] = row.ktc_value;
      }
      if (cancelled) return;
      setKtcMap(kLower);

      // Fetch player metadata
      const allIds = Array.from(
        new Set(Object.values(rosterMap).flatMap((r) => r.players ?? [])),
      ).slice(0, 300);

      let pmap: Record<string, PlayerRow> = {};
      if (allIds.length) {
        const pRes = await fetch(`/api/players?ids=${encodeURIComponent(allIds.join(','))}`);
        pmap = pRes.ok ? await pRes.json() : {};
      }
      if (cancelled) return;
      setPlayers(pmap);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All unique player IDs across all leagues
  const allPlayerIds = useMemo(
    () => Array.from(new Set(Object.values(rosterByLeague).flatMap((r) => r.players ?? []))),
    [rosterByLeague],
  );

  // Global position ranking (cross-league for consistent tier assignment)
  const globalRanked = useMemo(
    () => buildRankedPlayers(allPlayerIds, players, ktcMap),
    [allPlayerIds, players, ktcMap],
  );

  // Per-league health scores
  const leagueHealth = useMemo(() => {
    const out: Record<string, number> = {};
    for (const lg of leagues) {
      const r = rosterByLeague[lg.id];
      const ids = r?.players ?? [];
      const ranked = globalRanked.filter((p) => ids.includes(p.id));
      out[lg.id] = calculateLeagueHealthScore({ rankedPlayers: ranked, extra1stRoundPicks: 0 });
    }
    return out;
  }, [leagues, rosterByLeague, globalRanked]);

  // Build enriched roster for the selected league
  const drawerEnriched = useMemo(() => {
    if (!selectedLeague) return [];
    const r = rosterByLeague[selectedLeague.id];
    return buildEnrichedRoster(
      r?.players ?? [],
      r?.starters ?? [],
      players,
      ktcMap,
      globalRanked,
    );
  }, [selectedLeague, rosterByLeague, players, ktcMap, globalRanked]);

  const drawerDirectives = useMemo(
    () => (selectedLeague ? generateDirectives(drawerEnriched) : []),
    [selectedLeague, drawerEnriched],
  );

  // Global heatmap across all leagues (summary view)
  const globalEnriched = useMemo(() => {
    const allIds = Array.from(new Set(Object.values(rosterByLeague).flatMap((r) => r.players ?? [])));
    const allStarters = Array.from(new Set(Object.values(rosterByLeague).flatMap((r) => r.starters ?? [])));
    return buildEnrichedRoster(allIds, allStarters, players, ktcMap, globalRanked);
  }, [rosterByLeague, players, ktcMap, globalRanked]);

  const globalDirectives = useMemo(() => generateDirectives(globalEnriched), [globalEnriched]);

  const starterSetsByLeague = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const lg of leagues) {
      const r = rosterByLeague[lg.id];
      if (r?.starters?.length) m[lg.id] = new Set(r.starters);
    }
    return m;
  }, [leagues, rosterByLeague]);

  const scanRowsForView = useMemo(() => {
    if (!scanResult?.players?.length) return null;
    if (selectedLeague) return scanResult.players.filter((p) => p.leagueId === selectedLeague.id);
    return dedupeScanByBestTfo(scanResult.players);
  }, [scanResult, selectedLeague]);

  const scanEnriched = useMemo(() => {
    if (!scanRowsForView?.length) return null;
    return scanRowsToEnriched(scanRowsForView, ktcMap, starterSetsByLeague);
  }, [scanRowsForView, ktcMap, starterSetsByLeague]);

  const heatmapEnriched = scanEnriched ?? (selectedLeague ? drawerEnriched : globalEnriched);
  const directivesForMain =
    scanResult !== null
      ? scanDirectivesToPanel(scanResult.directives)
      : selectedLeague
        ? drawerDirectives
        : globalDirectives;
  const gapAlertsForMain = buildGapAlerts(
    scanEnriched ?? (selectedLeague ? drawerEnriched : globalEnriched),
    players,
    ktcMap,
  );

  const drawerEnrichedEffective = scanEnriched ?? drawerEnriched;
  const drawerDirectivesEffective =
    scanResult !== null ? scanDirectivesToPanel(scanResult.directives) : drawerDirectives;
  const drawerGapAlertsEffective = selectedLeague
    ? buildGapAlerts(drawerEnrichedEffective, players, ktcMap)
    : [];

  const drawerHealth = selectedLeague ? (leagueHealth[selectedLeague.id] ?? 50) : 50;

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/optimizer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = (await res.json().catch(() => null)) as OptimizerScanResponse | { error?: string } | null;
      if (!res.ok || !json || Array.isArray(json)) {
        const msg = json && typeof json === 'object' && 'error' in json && typeof json.error === 'string' ? json.error : 'Scan failed';
        setScanError(msg);
        setScanResult(null);
        return;
      }
      if ('players' in json && 'directives' in json && 'summary' in json) {
        setScanResult(json as OptimizerScanResponse);
      } else {
        setScanError('Invalid scan response');
        setScanResult(null);
      }
    } catch {
      setScanError('Network error');
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  }

  // ─── Skeleton ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppBackground intensity="subtle">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-pulse">
          <div className="h-14 w-2/3 max-w-lg rounded-lg bg-white/[0.06]" />
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50" />
            <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/50" />
          </div>
          <div className="h-48 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40" />
        </main>
      </AppBackground>
    );
  }

  // ─── Page ────────────────────────────────────────────────────────────────
  return (
    <AppBackground intensity="subtle">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 lg:pb-12 pt-8 lg:pt-10 space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="display font-normal leading-none text-[var(--gold)]"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)' }}
            >
              ROSTER OPTIMIZER
            </h1>
            <div
              className="mt-2 flex w-fit items-center gap-1.5 rounded border border-[var(--cyan)]/40 bg-[var(--cyan)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cyan)]"
              style={F_INTER}
            >
              <Zap className="h-3 w-3" />
              Context: Roster Health &amp; Value Optimization
            </div>
          </div>

          {/* League context dropdown */}
          {leagues.length > 0 && (
            <div className="relative">
              <select
                value={selectedLeague?.id ?? ''}
                onChange={(e) => {
                  const lg = leagues.find((l) => l.id === e.target.value) ?? null;
                  setSelectedLeague(lg);
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm font-semibold text-white appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[var(--indigo)]"
                style={F_INTER}
                aria-label="Select league context"
              >
                <option value="">All Leagues</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
          )}
        </header>

        {leagues.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-12 text-center">
            <p className="text-[var(--text-secondary)] mb-4">No synced leagues yet. Connect Sleeper from Settings.</p>
            <Link
              href="/dashboard/settings"
              className="inline-flex px-6 py-3 rounded-xl bg-[var(--indigo)] text-white font-semibold"
            >
              Settings
            </Link>
          </div>
        ) : (
          <>
            {/* ── Two-column: Heatmap + Directives ── */}
            <section className="grid lg:grid-cols-2 gap-6">
              <div>
                <p className="display text-lg text-white uppercase tracking-[0.1em] mb-3">Value Heatmap</p>
                <ValueHeatmap enriched={heatmapEnriched} />
              </div>

              <div>
                <p className="display text-lg text-white uppercase tracking-[0.1em] mb-3">Directives</p>
                <DirectivesPanel directives={directivesForMain} />
              </div>
            </section>

            {scanError && (
              <div
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                style={F_INTER}
                role="alert"
              >
                {scanError}
              </div>
            )}

            {/* ── Run Optimization Scan ── */}
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={scanning}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-xl font-bold text-white transition disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--indigo) 0%, #4338ca 60%, rgba(34,211,238,0.5) 100%)',
                boxShadow: '0 0 32px rgba(99,102,241,0.45)',
                ...F_BEBAS,
                letterSpacing: '0.12em',
              }}
            >
              {scanning ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> SCANNING ROSTER…</>
              ) : (
                <><Play className="h-5 w-5 fill-white/80" /> RUN OPTIMIZATION SCAN</>
              )}
            </button>

            {/* ── Mock Draft Integration ── */}
            <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <p className="display text-lg text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                  Mock Draft Integration (Post-NFL Draft)
                </p>
                <span
                  className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-300"
                  style={F_INTER}
                >
                  Beta
                </span>
              </div>
              <div className="space-y-0">
                {gapAlertsForMain.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-b border-[var(--border)]/60 py-3 last:border-b-0"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--indigo)]" />
                    <p className="text-sm leading-snug text-[var(--text-secondary)]" style={F_INTER}>
                      {g}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── League grid ── */}
            <section className="space-y-3">
              <h2 className="display text-lg uppercase tracking-[0.1em] text-white">League Analysis</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {leagues.map((lg) => {
                  const health = leagueHealth[lg.id] ?? 50;
                  const dist = scanResult
                    ? distFromScanPlayers(scanResult.players.filter((p) => p.leagueId === lg.id))
                    : getAssetDistribution(globalRanked.filter((p) => (rosterByLeague[lg.id]?.players ?? []).includes(p.id)));
                  const grade =
                    health >= 80 ? 'A' : health >= 65 ? 'B' : health >= 50 ? 'C' : health >= 35 ? 'D' : 'F';
                  const gradeColor =
                    grade === 'A' ? 'text-[var(--gold)] border-[var(--gold)]/35 bg-[var(--gold)]/10'
                    : grade === 'B' ? 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10'
                    : grade === 'C' ? 'text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan)]/8'
                    : grade === 'D' ? 'text-amber-300 border-amber-500/30 bg-amber-500/8'
                    : 'text-red-400 border-red-500/30 bg-red-500/8';
                  const healthBarColor =
                    health >= 70 ? 'bg-emerald-400' : health >= 50 ? 'bg-amber-400' : 'bg-red-400';

                  return (
                    <button
                      key={lg.id}
                      type="button"
                      onClick={() => setSelectedLeague(lg)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-left transition hover:border-[var(--indigo)]/40 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-sm font-semibold text-white" style={F_INTER}>
                          {lg.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className={clsx('h-full rounded-full transition-all duration-500', healthBarColor)}
                              style={{ width: `${health}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-[var(--text-muted)]" style={F_INTER}>
                            {health}%
                          </span>
                        </div>
                        <div className="flex gap-2 text-[9px]" style={F_INTER}>
                          <span className="text-amber-300">◆ {dist.diamonds}</span>
                          <span className="text-[var(--indigo-light)]">✦ {dist.gems}</span>
                          <span className="text-emerald-300">— {dist.starters}</span>
                          <span className="text-red-400">☠ {dist.nukes}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <span
                          className={clsx(
                            'display flex h-9 w-9 items-center justify-center rounded-lg border text-xl leading-none',
                            gradeColor,
                          )}
                        >
                          {grade}
                        </span>
                        <span className="text-[8px] text-[var(--text-muted)] uppercase" style={F_INTER}>
                          analyze
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Full roster list (selected or global top) ── */}
            <section>
              <h2 className="display text-lg uppercase tracking-[0.1em] text-white mb-3">
                {selectedLeague ? `${selectedLeague.name} — Roster` : 'All Rostered Players'}
              </h2>
              <RosterList enriched={(scanEnriched ?? (selectedLeague ? drawerEnriched : globalEnriched)).slice(0, 40)} />
            </section>
          </>
        )}
      </main>

      {/* League drawer */}
      <LeagueDrawer
        league={selectedLeague}
        enriched={drawerEnrichedEffective}
        healthScore={drawerHealth}
        directives={drawerDirectivesEffective}
        gapAlerts={drawerGapAlertsEffective}
        scanning={scanning}
        onScan={() => void handleScan()}
        onClose={() => setSelectedLeague(null)}
      />
    </AppBackground>
  );
}
