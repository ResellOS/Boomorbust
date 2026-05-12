'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import type { RecommendedTarget, SnapshotLeague } from '@/app/api/dashboard/snapshot/route';
import { verdictToHighlight } from '@/components/dashboard/PlayerBhsActions';
import type { TFOVerdict } from '@/lib/tfo/formula';

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeVerdict(raw: string | null | undefined): TFOVerdict | null {
  if (raw == null || String(raw).trim() === '') return null;
  const u = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  const allowed: TFOVerdict[] = ['BOOM', 'LEAN_BOOM', 'NEUTRAL', 'LEAN_BUST', 'BUST'];
  if ((allowed as string[]).includes(u)) return u as TFOVerdict;
  if (u.includes('LEAN') && u.includes('BOOM')) return 'LEAN_BOOM';
  if (u.includes('LEAN') && u.includes('BUST')) return 'LEAN_BUST';
  if (u.includes('BOOM')) return 'BOOM';
  if (u.includes('BUST')) return 'BUST';
  return 'NEUTRAL';
}

const POS_COLOR: Record<string, string> = {
  QB: '#F87171',
  RB: '#4ADE80',
  WR: '#60A5FA',
  TE: '#FBBF24',
};

function posColor(pos: string): string {
  return POS_COLOR[pos?.toUpperCase()] ?? '#94A3B8';
}

function tradeFinderHref(playerId: string, leagueId: string): string {
  const q = new URLSearchParams({ targetPlayerId: playerId, intent: 'buy', leagueId });
  return `/dashboard/trade/finder?${q.toString()}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TargetCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 animate-pulse">
      <div className="skeleton shrink-0 h-14 w-14 rounded-full" />
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        <div className="skeleton h-2.5 w-2/3" />
        <div className="skeleton h-2 w-1/2" />
        <div className="skeleton h-2 w-full" />
        <div className="skeleton h-2 w-4/5" />
      </div>
    </div>
  );
}

function LeagueGroupSkeleton({ label }: { label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">{label}</p>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <TargetCardSkeleton />
        <TargetCardSkeleton />
        <TargetCardSkeleton />
      </div>
    </div>
  );
}

// ── Target card ───────────────────────────────────────────────────────────────

function TargetCard({ target }: { target: RecommendedTarget }) {
  const router = useRouter();
  const highlight = verdictToHighlight(normalizeVerdict(target.tfoVerdict ?? null));
  const glowColor = highlight === 'buy' ? '#36E7A1' : highlight === 'sell' ? '#EF4444' : '#FBBF24';
  const pc = posColor(target.position);

  const [bviPart, ktcPart, deltaPart] = target.bviLine.split('|').map((s) => s.trim());

  return (
    <button
      type="button"
      onClick={() => router.push(tradeFinderHref(target.player_id, target.leagueId))}
      className={clsx(
        'group w-full text-left rounded-xl border bg-white/[0.03] p-3 transition-all duration-200',
        'hover:bg-white/[0.06] hover:border-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        'border-white/[0.07] cursor-pointer',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Headshot */}
        <div className="relative shrink-0">
          <div
            className="h-14 w-14 rounded-full overflow-hidden border"
            style={{ borderColor: `${pc}55` }}
          >
            <Image
              src={target.photoUrl}
              alt={target.name}
              width={56}
              height={56}
              className="h-full w-full object-cover object-top"
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://sleepercdn.com/images/v2/icons/player_default.webp`;
              }}
            />
          </div>
          {/* Position badge */}
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full px-1 py-px text-[7px] font-black uppercase font-mono-tactical border"
            style={{ background: `${pc}22`, borderColor: `${pc}55`, color: pc }}
          >
            {target.position}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + team */}
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <p className="text-[13px] font-semibold leading-tight text-white truncate">{target.name}</p>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{target.team}</span>
          </div>

          {/* Gap reason */}
          <p
            className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5"
            style={{ color: glowColor }}
          >
            {target.gapReason}
          </p>

          {/* BVI line — three segments in JetBrains Mono */}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {bviPart && (
              <span className="font-mono-tactical text-[8px] text-[var(--text-secondary)]">
                {bviPart}
              </span>
            )}
            {ktcPart && (
              <span className="font-mono-tactical text-[8px] text-[var(--text-muted)]">
                {ktcPart}
              </span>
            )}
            {deltaPart && (
              <span
                className="font-mono-tactical text-[8px] font-black"
                style={{ color: glowColor }}
              >
                {deltaPart}
              </span>
            )}
          </div>
        </div>

        {/* Acquire chevron */}
        <div
          className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono-tactical font-black uppercase"
          style={{ color: glowColor }}
        >
          →
        </div>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface RecommendedTargetsProps {
  targets: RecommendedTarget[];
  leagues: SnapshotLeague[];
  /** Pass true when snapshot is still loading (shows skeletons). */
  loading?: boolean;
  className?: string;
}

export default function RecommendedTargets({
  targets,
  leagues,
  loading = false,
  className = '',
}: RecommendedTargetsProps) {
  const showSkeleton = loading || targets.length === 0;

  // Group targets by league
  const byLeague = new Map<string, RecommendedTarget[]>();
  for (const t of targets) {
    if (!byLeague.has(t.leagueId)) byLeague.set(t.leagueId, []);
    byLeague.get(t.leagueId)!.push(t);
  }
  const leagueIds = Array.from(byLeague.keys());
  const multiLeague = leagueIds.length > 1;

  return (
    <section className={clsx('glass-panel rounded-xl border border-white/[0.07] p-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[15px] tracking-wide text-white uppercase">
            Recommended Targets
          </h2>
          <p className="text-[10px] text-[var(--text-muted)]">
            BVI undervalue × roster gap analysis · click any card to open Trade Finder
          </p>
        </div>
        <div className="ml-auto shrink-0 rounded-full border border-[#36E7A1]/30 bg-[#36E7A1]/08 px-2 py-0.5">
          <span className="font-mono-tactical text-[8px] font-black text-[#36E7A1] uppercase tracking-[0.1em]">
            BVI Engine
          </span>
        </div>
      </div>

      {showSkeleton ? (
        <div className="space-y-4">
          {multiLeague ? (
            <>
              <LeagueGroupSkeleton label="League 01" />
              <LeagueGroupSkeleton label="League 02" />
            </>
          ) : (
            <LeagueGroupSkeleton />
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {leagueIds.map((lid) => {
            const rows = byLeague.get(lid) ?? [];
            const leagueName = leagues.find((l) => l.id === lid)?.name ?? rows[0]?.leagueName ?? lid;
            return (
              <div key={lid}>
                {multiLeague && (
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                      {leagueName}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {rows.map((t) => (
                    <TargetCard key={`${t.leagueId}-${t.player_id}`} target={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
