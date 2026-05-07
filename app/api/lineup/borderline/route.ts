import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { buildSystemPrompt } from '@/lib/coach/context';

const anthropic = new Anthropic();

type PairRow = {
  player_a: string;
  player_b: string;
  position: string;
  projected_a: number;
  projected_b: number;
  matchup_a?: string;
  matchup_b?: string;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let pairs: PairRow[];
  try {
    const body = await request.json();
    pairs = Array.isArray(body?.pairs) ? body.pairs : [];
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!pairs.length) {
    const encoder = new TextEncoder();
    const empty = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('No razor-thin calls this week — start your studs.'));
        controller.close();
      },
    });
    return new Response(empty, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  const lines = pairs.map(
    (p) =>
      `- ${p.position}: ${p.player_a} (${p.projected_a.toFixed(1)} proj, ${p.matchup_a ?? '?'}) vs ${p.player_b} (${p.projected_b.toFixed(1)} proj, ${p.matchup_b ?? '?'})`
  );

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(
          `Give a "Close Calls" section for sit/start. For EVERY pair below, write EXACTLY ONE sentence with a bold call (Start X or lean X) citing projection + matchup. Skip hedging phrases like "Based on the data." Name both players. Tone: confident co-pilot.\n\nPairs:\n${lines.join('\n')}`
        ),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: 'Output 1–2 paragraphs; use line breaks between pair takes.' }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
