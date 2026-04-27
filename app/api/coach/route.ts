import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

const anthropic = new Anthropic();
const DAILY_LIMIT = 20;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: DAILY_LIMIT };

  const today = new Date().toISOString().slice(0, 10);
  const key = `coach_rate:${userId}:${today}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400);
    return { allowed: count <= DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) };
  } catch {
    return { allowed: true, remaining: DAILY_LIMIT };
  }
}

async function buildCoachContext(userId: string): Promise<string> {
  const supabase = createClient();
  const [{ data: leagues }] = await Promise.all([
    supabase.from('leagues').select('id, name, season, total_rosters, scoring_settings').eq('user_id', userId),
  ]);

  if (!leagues?.length) return 'No leagues found for this user.';

  const rosterResults = await Promise.all(
    leagues.map(async (lg) => {
      const { data } = await supabase
        .from('rosters')
        .select('players, starters')
        .eq('league_id', lg.id)
        .single();
      return { league: lg, players: (data?.players ?? []) as string[], starters: (data?.starters ?? []) as string[] };
    })
  );

  const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players)));
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allIds.slice(0, 150)),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  const lines: string[] = ['## Manager Portfolio\n'];

  for (const { league, players, starters } of rosterResults) {
    const rec = (league.scoring_settings?.rec ?? 0);
    const fmt = rec >= 1 ? 'PPR' : rec >= 0.5 ? '0.5 PPR' : 'Standard';
    lines.push(`### ${league.name} (${fmt}, ${league.total_rosters} teams, ${league.season})`);

    const topPlayers = players
      .map((id) => ({ id, p: playerData[id], ktc: ktcMap[playerData[id]?.full_name.toLowerCase() ?? ''] ?? 0 }))
      .filter((x) => x.p)
      .sort((a, b) => b.ktc - a.ktc)
      .slice(0, 12);

    for (const { p, ktc, id } of topPlayers) {
      if (!p) continue;
      const isStarter = starters.includes(id) ? '(S)' : '(B)';
      const inj = p.injury_status ? ` [${p.injury_status}]` : '';
      lines.push(`- ${p.full_name} ${p.position} ${p.team ?? '?'} age:${p.age ?? '?'} ktc:${ktc}${inj} ${isStarter}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { allowed, remaining } = await checkRateLimit(user.id);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Daily limit reached. Resets at midnight.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, includeContext } = await request.json();
  const systemContext = includeContext ? await buildCoachContext(user.id) : '';

  const systemPrompt = `You are Dynasty Coach, an expert dynasty fantasy football analyst with access to this manager's complete roster data across all their Sleeper leagues. Be specific, direct, and reference their actual players and league situations. Always explain your reasoning. Be opinionated and give a clear recommendation.

${systemContext ? `\n${systemContext}` : ''}`;

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Send remaining count as a final JSON chunk
        controller.enqueue(encoder.encode(`\n\x00${JSON.stringify({ remaining })}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Rate-Limit-Remaining': String(remaining),
      'Cache-Control': 'no-cache',
    },
  });
}
