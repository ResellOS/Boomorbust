import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { buildSystemPrompt } from '@/lib/coach/context';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  interface BodyPayload {
    verdict: string;
    value_delta?: number;
    rounds_label?: string;
    giving_assets: string;
    receiving_assets: string;
    dimension_notes?: {
      dynasty_value?: string;
      contention_fit?: string;
      positional_need?: string;
      age_curve?: string;
    };
  }

  let payload: BodyPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { verdict, value_delta = 0, rounds_label = 'Even', giving_assets, receiving_assets, dimension_notes = {} } = payload;

  const systemPrompt = buildSystemPrompt(
    `You are writing the "Coach's Note" recap for ONE dynasty fantasy trade verdict.

Rules:
- You speak AS this manager's co-pilot inside the app's voice — confident, blunt, conversational.
- Use the manager's Dynasty Persona cues (WR-first patience, specifics over vibes).
- Call every player BY NAME exactly as listed. Mention picks explicitly (season + round).
- Never start with "Based on the data," "Certainly," or "Great question." No meta filler.
- 3–7 sentences maximum. Deliver a decisive bottom-line: what this verdict means today and what to watch next.
- Weave one concrete detail from positional or age commentary if helpful.

Facts for this verdict (do not invent numbers beyond these): Verdict=${verdict}. Raw KTC differential≈ ${value_delta}. Round framing: ${rounds_label}.
YOU GIVE UP: ${giving_assets}
YOU GET: ${receiving_assets}
Brief dimension notes —
Dynasty Value: ${dimension_notes.dynasty_value ?? 'n/a'}
Contention Fit: ${dimension_notes.contention_fit ?? 'n/a'}
Positional Fit: ${dimension_notes.positional_need ?? 'n/a'}
Age Curve: ${dimension_notes.age_curve ?? 'n/a'}
`
  );

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: 'Give the Coach\'s Note — bottom-line only.',
      },
    ],
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
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
