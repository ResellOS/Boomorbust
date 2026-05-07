import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { fetchLeagueRosters } from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';

const IR_STATUSES = new Set(['IR', 'O', 'PUP', 'SUS', 'NA', 'DNR', 'NFI', 'COV']);
const HIGH_URGENCY = new Set(['IR', 'O', 'SUS']);

export interface RosterIssue {
  league_id: string;
  league_name: string;
  player_id: string;
  player_name: string;
  position: string;
  injury_status: string;
  issue_type: 'ir_eligible';
  urgency: 'high' | 'medium';
  message: string;
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const redis = getRedis();
  const cacheKey = `taxi_ir:${user.id}`;

  if (redis) {
    try {
      const cached = await redis.get<RosterIssue[]>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  const [profileResult, leaguesResult, playerDb] = await Promise.all([
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).single(),
    supabase.from('leagues').select('id, name, settings').eq('user_id', user.id),
    fetchAllPlayers(),
  ]);

  const sleeperUserId = profileResult.data?.sleeper_user_id;
  const leagues = leaguesResult.data ?? [];

  if (!playerDb || !leagues.length) return NextResponse.json([]);

  const issueArrays = await Promise.all(
    leagues.map(async (league): Promise<RosterIssue[]> => {
      const rosters = await fetchLeagueRosters(league.id);
      if (!rosters?.length) return [];

      const settings = league.settings as Record<string, unknown> | null;
      const reserveSlots = Number(settings?.reserve_slots ?? 0);
      if (reserveSlots === 0) return [];

      const userRoster = sleeperUserId
        ? rosters.find((r) => r.owner_id === sleeperUserId)
        : null;
      if (!userRoster) return [];

      const activePlayers = userRoster.players ?? [];
      const reservePlayers = userRoster.reserve ?? [];
      const reserveUsed = reservePlayers.length;

      if (reserveUsed >= reserveSlots) return [];

      const issues: RosterIssue[] = [];
      for (const playerId of activePlayers) {
        const player = playerDb[playerId];
        if (!player?.injury_status) continue;
        const status = player.injury_status.toUpperCase();
        if (!IR_STATUSES.has(status)) continue;

        issues.push({
          league_id: league.id,
          league_name: league.name,
          player_id: playerId,
          player_name: player.full_name ?? playerId,
          position: player.position ?? '?',
          injury_status: status,
          issue_type: 'ir_eligible',
          urgency: HIGH_URGENCY.has(status) ? 'high' : 'medium',
          message: `${player.full_name} (${status}) should be moved to IR`,
        });
      }
      return issues;
    })
  );

  const issues = issueArrays.flat().sort((a, b) =>
    a.urgency === b.urgency ? 0 : a.urgency === 'high' ? -1 : 1
  );

  if (redis) {
    try { await redis.set(cacheKey, issues, { ex: 1800 }); } catch {}
  }

  return NextResponse.json(issues);
}
