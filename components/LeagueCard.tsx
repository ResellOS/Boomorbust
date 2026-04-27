'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';

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

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  K:  'bg-gray-500/20 text-gray-300',
  DEF: 'bg-red-500/20 text-red-300',
};

const INJURY_COLORS: Record<string, string> = {
  Q: 'bg-yellow-500/20 text-yellow-400',
  D: 'bg-orange-500/20 text-orange-400',
  O: 'bg-red-500/20 text-red-400',
  IR: 'bg-red-600/30 text-red-400',
};

export default function LeagueCard({ league }: { league: League }) {
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
    <Link href={`/dashboard/league/${league.id}`}>
      <div
        className={clsx(
          'bg-[#1E293B] rounded-2xl p-6 flex flex-col gap-4',
          'border border-white/5 hover:border-indigo-500/40',
          'hover:shadow-lg hover:shadow-indigo-500/5',
          'transition-all duration-200 cursor-pointer h-full'
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
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">Roster</p>
          {rosterIds.length === 0 ? (
            <p className="text-[#94A3B8] text-sm italic">Loading...</p>
          ) : (
            <ul className="space-y-1.5">
              {rosterIds.map((id) => {
                const p = players[id];
                const injuryKey = p?.injury_status?.toUpperCase() as string;
                return (
                  <li key={id} className="flex items-center gap-2 text-sm">
                    {p ? (
                      <>
                        <span
                          className={clsx(
                            'text-xs font-semibold px-1.5 py-0.5 rounded shrink-0',
                            POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300'
                          )}
                        >
                          {p.position}
                        </span>
                        <span className="text-[#CBD5E1] truncate">{p.full_name}</span>
                        {p.injury_status && INJURY_COLORS[injuryKey] && (
                          <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded shrink-0', INJURY_COLORS[injuryKey])}>
                            {p.injury_status}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[#94A3B8]">{id}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Row 4: view link */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-[#6366F1] text-sm font-medium">View League</span>
          <ArrowRight className="w-4 h-4 text-[#6366F1]" />
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
