'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LeagueCard, { LeagueCardSkeleton } from '@/components/LeagueCard';

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
  const supabase = createClient();

  useEffect(() => {
    async function syncAndLoad() {
      setSyncing(true);

      try {
        await fetch('/api/sync', { method: 'POST' });
      } catch (err) {
        console.error('Sync failed:', err);
      }

      const { data } = await supabase
        .from('leagues')
        .select('*')
        .order('season', { ascending: false });

      setLeagues(data ?? []);
      setSyncing(false);
    }

    syncAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* Sync toast */}
      {syncing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#94A3B8] shadow-xl">
          <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
          Syncing leagues...
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
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}
    </main>
  );
}
