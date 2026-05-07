'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import OpenInSleeper from '@/components/OpenInSleeper';
import PlayerCard from '@/components/PlayerCard';

interface League {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
  settings: Record<string, unknown> | null;
  status: string | null;
}

interface PlayerSummary {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

function getScoringFormat(settings: Record<string, number> | null): string {
  if (!settings) return 'Standard';
  if ((settings.rec ?? 0) >= 1) return 'PPR';
  if ((settings.rec ?? 0) >= 0.5) return '0.5 PPR';
  return 'Standard';
}

export default function LeagueCard({ league, hasAlert = false }: { league: League; hasAlert?: boolean }) {
  const [players, setPlayers] = useState<Record<string, PlayerSummary>>({});
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const supabase = createClient();
  const format = getScoringFormat(league.scoring_settings);

  useEffect(() => {
    async function loadRoster() {
      const { data: rosters } = await supabase
        .from('rosters')
        .select('players')
        .eq('league_id', league.id)
        .limit(1)
        .single();

      const ids: string[] = rosters?.players ?? [];
      if (!ids.length) return;
      setRosterIds(ids.slice(0, 5));

      const res = await fetch(`/api/players?ids=${ids.slice(0, 20).join(',')}`);
      if (res.ok) setPlayers(await res.json());
    }
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.id]);

  const numTeams = (league.settings as Record<string, number> | null)?.num_teams
    ?? league.total_rosters;

  return (
    <Link href={`/dashboard/league/${league.id}`} className="relative block">
      {hasAlert && (
        <span
          title="Roster action needed"
          className="absolute -top-1.5 -right-1.5 z-10 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#0F172A]"
        />
      )}
      <div
        className={clsx(
          'bg-[#1E293B] rounded-2xl p-6 flex flex-col gap-4',
          'border transition-all duration-200 cursor-pointer h-full',
          hasAlert
            ? 'border-red-500/30 hover:border-red-500/50'
            : 'border-white/5 hover:border-indigo-500/40',
          'hover:shadow-lg hover:shadow-indigo-500/5',
        )}
      >
        {/* Row 1: name + scoring badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-white font-semibold text-lg leading-tight truncate flex-1">
            {league.name}
          </h3>
          <span className="shrink-0 bg-[#6366F1]/20 text-[#6366F1] text-xs font-semibold px-2.5 py-1 rounded-full">
            {format}
          </span>
        </div>

        {/* Row 2: stat chips */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-[#CBD5E1] bg-white/5 px-2.5 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
            {numTeams ?? '—'} teams
          </span>
          <span className="flex items-center gap-1.5 text-sm text-[#CBD5E1] bg-white/5 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
            {league.season}
          </span>
        </div>

        {/* Row 3: roster */}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Top players</p>
          {rosterIds.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm italic">Loading...</p>
          ) : (
            <ul className="space-y-2">
              {rosterIds.slice(0, 3).map((id) => {
                const p = players[id];
                return (
                  <li key={id}>
                    {p ? (
                      <PlayerCard
                        player_id={id}
                        player_name={p.full_name}
                        position={p.position}
                        team={(p.team as string | null) ?? ''}
                        age={typeof p.age === 'number' ? p.age : 24}
                        injury_status={p.injury_status ?? undefined}
                        size="sm"
                      />
                    ) : (
                      <span className="text-[var(--text-muted)]">{id}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Row 4: view link + open in Sleeper */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[#6366F1] text-sm font-medium">
            View League
            <ArrowRight className="w-4 h-4" />
          </div>
          <OpenInSleeper leagueId={league.id} variant="icon" />
        </div>
      </div>
    </Link>
  );
}

export function LeagueCardSkeleton() {
  return (
    <div className="bg-[#1E293B] rounded-2xl p-6 flex flex-col gap-4 border border-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="h-6 w-3/4 shimmer rounded-lg" />
        <div className="h-6 w-14 shimmer rounded-full" />
      </div>
      <div className="flex gap-3">
        <div className="h-7 w-24 shimmer rounded-lg" />
        <div className="h-7 w-20 shimmer rounded-lg" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-16 shimmer rounded mb-3" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-5 shimmer rounded" style={{ width: `${70 + i * 5}%` }} />
        ))}
      </div>
      <div className="pt-2 border-t border-white/5">
        <div className="h-4 w-24 shimmer rounded" />
      </div>
    </div>
  );
}
