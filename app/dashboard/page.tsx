'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LeagueCard, { LeagueCardSkeleton } from '@/components/LeagueCard';
import OpenInSleeper from '@/components/OpenInSleeper';
import type { RosterIssue } from '@/app/api/roster/taxi-ir/route';

interface League {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
  settings: Record<string, unknown> | null;
  status: string | null;
}

export default function DashboardPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [issues, setIssues] = useState<RosterIssue[]>([]);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function syncAndLoad() {
      setSyncing(true);

      try {
        await fetch('/api/sync', { method: 'POST' });
      } catch (err) {
        console.error('Sync failed:', err);
      }

      const [leagueRes, issueData] = await Promise.all([
        supabase.from('leagues').select('*').order('season', { ascending: false }),
        fetch('/api/roster/taxi-ir').then((r) => r.ok ? r.json() : []).catch((): RosterIssue[] => []),
      ]);

      setLeagues(leagueRes.data ?? []);
      setIssues(issueData as RosterIssue[]);
      setSyncing(false);
    }

    syncAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highIssues = issues.filter((i) => i.urgency === 'high');
  const affectedLeagueIds = new Set(issues.map((i) => i.league_id));
  const affectedLeagueCount = new Set(highIssues.map((i) => i.league_id)).size;
  const showBanner = !alertDismissed && highIssues.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* Sync toast */}
      {syncing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#94A3B8] shadow-xl">
          <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
          Syncing leagues...
        </div>
      )}

      {/* Roster alert banner */}
      {showBanner && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-red-300 font-semibold text-sm">
              ⚠️ Roster action needed in {affectedLeagueCount} league{affectedLeagueCount !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setAlertDismissed(true)}
              className="text-[#475569] hover:text-white transition shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {highIssues.map((issue) => (
              <li
                key={`${issue.league_id}-${issue.player_id}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-[#CBD5E1]">
                  <span className="text-red-400 font-semibold">{issue.player_name}</span>
                  {' '}({issue.injury_status}) should be on IR in{' '}
                  <span className="text-white">{issue.league_name}</span>
                </span>
                <OpenInSleeper leagueId={issue.league_id} variant="link" className="shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Your Leagues</h1>
        <p className="text-[#94A3B8] text-sm">2025 Season · Synced from Sleeper</p>
      </div>

      {syncing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <LeagueCardSkeleton />
          <LeagueCardSkeleton />
          <LeagueCardSkeleton />
        </div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#CBD5E1] mb-3">
            No leagues found. Make sure your Sleeper username is correct.
          </p>
          <Link href="/settings" className="text-[#6366F1] hover:underline text-sm">
            Go to Settings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leagues.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              hasAlert={affectedLeagueIds.has(league.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
