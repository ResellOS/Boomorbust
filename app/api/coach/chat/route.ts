import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { buildSystemPrompt, buildCoachPortfolioContext } from '@/lib/coach/context';

const anthropic = new Anthropic();
const PRO_DAILY_CAP = 10;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

type Tier = 'free' | 'pro' | 'elite';

function tierFromProfile(pref: Record<string, unknown> | null | undefined, isPaid: boolean): Tier {
  const t = pref?.subscription_tier;
  if (t === 'elite') return 'elite';
  if (isPaid) return 'pro';
  return 'free';
}

/** Redis fallback when coach_usage RPC is not migrated yet */
async function consumeProViaRedis(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const today = new Date().toISOString().slice(0, 10);
  const key = `coach_pro:${userId}:${today}`;
  if (!redis) return { allowed: true, remaining: PRO_DAILY_CAP };

  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 86400);
    return { allowed: n <= PRO_DAILY_CAP, remaining: Math.max(0, PRO_DAILY_CAP - n) };
  } catch {
    return { allowed: true, remaining: PRO_DAILY_CAP };
  }
}

async function consumeProSlot(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ ok: boolean; remaining: number }> {
  const r = await supabase.rpc('reserve_coach_message', { p_user_id: userId });
  if (!r.error && r.data && typeof r.data === 'object') {
    const row = r.data as { ok?: boolean; remaining?: number };
    if (row.ok === false) return { ok: false, remaining: typeof row.remaining === 'number' ? row.remaining : 0 };
    if (row.ok === true) return { ok: true, remaining: typeof row.remaining === 'number' ? row.remaining : 0 };
  }

  const fb = await consumeProViaRedis(userId);
  return { ok: fb.allowed, remaining: fb.remaining };
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('preference_data, is_paid')
    .eq('id', user.id)
    .single();

  const tier = tierFromProfile(
    profile?.preference_data as Record<string, unknown> | undefined,
    profile?.is_paid ?? false
  );

  if (tier === 'free') {
    return new Response(
      JSON.stringify({
        error: 'Dynasty Coach requires Pro or Elite.',
        code: 'TIER_REQUIRED',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let remainingAfter: number | null = null;

  if (tier === 'pro') {
    const { ok, remaining } = await consumeProSlot(supabase, user.id);
    if (!ok) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached (10 messages). Resets at midnight UTC.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    remainingAfter = remaining;
  }

  const body = (await request.json()) as Record<string, unknown>;

  const rawMessages = body.messages as unknown;
  if (!Array.isArray(rawMessages) || !rawMessages.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const apiMessages = rawMessages
    .filter(
      (m): m is { role: string; content: string } =>
        Boolean(m && typeof (m as { role?: string }).role === 'string' && typeof (m as { content?: string }).content === 'string')
    )
    .map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(m.content).slice(0, 48_000),
    }));
  if (!apiMessages.length) {
    return new Response(JSON.stringify({ error: 'Invalid messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const includeContext = Boolean(body.includeContext);
  const leagueId = (body.league_id as string | null | undefined) ?? null;

  const systemContext = includeContext ? await buildCoachPortfolioContext(user.id, leagueId) : '';

  const focusLine = leagueId
    ? 'The manager may be focusing on one league for this message — prioritize that league when it helps.'
    : '';

  const systemPrompt = buildSystemPrompt(
    `You are Dynasty Coach — an expert dynasty fantasy football analyst with complete access to this manager's Sleeper-backed rosters. Be specific, direct, and reference actual players and league situations. Always explain your reasoning. Be opinionated and give a clear recommendation. Mention KTC dynasty value tiers when discussing trades. ${focusLine}${systemContext ? `\n\n${systemContext}` : ''}`
  );

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: apiMessages,
  });

  const encoder = new TextEncoder();
  const payload = remainingAfter !== null ? { remaining: remainingAfter, tier: 'pro' as const } : { remaining: null, tier: 'elite' as const };

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.enqueue(encoder.encode(`\n\x00${JSON.stringify(payload)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Rate-Limit-Remaining': remainingAfter !== null ? String(remainingAfter) : 'unlimited',
      'Cache-Control': 'no-cache',
    },
  });
}
