import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { normalizeTier } from '@/lib/access/gates';
import { buildSystemPrompt, buildCoachPortfolioContext } from '@/lib/coach/context';
import { checkAIRateLimit, rateLimitExceededResponse } from '@/lib/rateLimit/ai';
import { checkBudget, trackSpend, estimateCost } from '@/lib/ai/budget';

const anthropic = new Anthropic();
const PRO_DAILY_CAP = 10;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

type Tier = 'free' | 'pro' | 'elite' | 'all_pro_terminal';

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
    .select('subscription_tier, is_paid')
    .eq('id', user.id)
    .single();

  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  const tier: Tier = normalizeTier(rawTier, profile?.is_paid);

  if (tier === 'free') {
    return new Response(
      JSON.stringify({
        error: 'Dynasty Coach requires Pro or Elite.',
        code: 'TIER_REQUIRED',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rateCheck = await checkAIRateLimit(user.id, tier);
  let remainingAfter: number | null = rateCheck.limit >= 999 ? null : rateCheck.remaining;

  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ ...rateLimitExceededResponse(rateCheck, tier), code: 'RATE_LIMITED' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Legacy Pro slot — kept for existing RPC compatibility
  if (tier === 'pro') {
    const { ok, remaining } = await consumeProSlot(supabase, user.id);
    if (!ok) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached. Resets at midnight UTC.' }),
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

  // Hard monthly budget gate
  const budget = await checkBudget();
  if (!budget.allowed) {
    return new Response(
      JSON.stringify({
        error: 'AI service temporarily unavailable',
        message: 'Monthly AI budget reached. Service resets on the 1st.',
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        code: 'BUDGET_EXCEEDED',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

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
        let inputTokens = 0;
        let outputTokens = 0;
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          if (event.type === 'message_start') {
            inputTokens = event.message.usage?.input_tokens ?? 0;
          }
          if (event.type === 'message_delta') {
            outputTokens = (event.usage as { output_tokens?: number } | undefined)?.output_tokens ?? 0;
          }
        }
        controller.enqueue(encoder.encode(`\n\x00${JSON.stringify(payload)}`));
        // Track spend after stream completes (non-blocking)
        void trackSpend(estimateCost(inputTokens, outputTokens));
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
