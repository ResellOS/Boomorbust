'use client';

/**
 * Strict Sleeper ownership hook.
 *
 * Fetches the user's leagues and player pools from the DB, matching
 * `owner_id === sleeper_user_id` — no fallback to roster index 0.
 * Ghost players (owned by other managers in the same league) never leak in.
 */
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SleeperLeagueMeta {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
}

export interface SleeperOwnershipState {
  loading: boolean;
  error: string | null;
  leagues: SleeperLeagueMeta[];
  /** All player_ids confirmed on YOUR rosters — never includes other managers' players. */
  ownedPlayerIds: Set<string>;
  sleeperUserId: string | null;
}

export function useSleeper(): SleeperOwnershipState {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<SleeperLeagueMeta[]>([]);
  const [ownedPlayerIds, setOwnedPlayerIds] = useState<Set<string>>(new Set());
  const [sleeperUserId, setSleeperUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Resolve Sleeper user ID from profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('sleeper_user_id')
          .single();

        if (profileErr || !profile?.sleeper_user_id) {
          throw new Error('No Sleeper account linked — visit /onboarding to connect.');
        }

        const ownerSid = String(profile.sleeper_user_id);
        if (!cancelled) setSleeperUserId(ownerSid);

        // 2. Fetch this user's leagues
        const { data: leagueRows } = await supabase
          .from('leagues')
          .select('id, name, season, total_rosters')
          .order('season', { ascending: false });

        const leagueList = (leagueRows ?? []) as SleeperLeagueMeta[];
        if (!cancelled) setLeagues(leagueList);

        // 3. Per league: find ONLY the roster whose owner_id matches our Sleeper ID.
        //    CRITICAL: no fallback to rows[0] — that roster may belong to another
        //    manager and would flood the UI with ghost players.
        const owned = new Set<string>();

        await Promise.all(
          leagueList.map(async (lg) => {
            const { data: rows } = await supabase
              .from('rosters')
              .select('owner_id, players')
              .eq('league_id', lg.id)
              .eq('owner_id', ownerSid);

            // Only accept a row that explicitly belongs to this owner
            const yours = (rows ?? []).find(
              (r) => String(r.owner_id) === ownerSid,
            );
            if (!yours) return;

            for (const pid of (yours.players ?? []) as string[]) {
              owned.add(pid);
            }
          }),
        );

        if (!cancelled) {
          setOwnedPlayerIds(owned);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Sleeper ownership fetch failed',
          );
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return useMemo<SleeperOwnershipState>(
    () => ({ loading, error, leagues, ownedPlayerIds, sleeperUserId }),
    [loading, error, leagues, ownedPlayerIds, sleeperUserId],
  );
}
