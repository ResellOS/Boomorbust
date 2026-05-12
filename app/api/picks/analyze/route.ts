import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as {
      pick?: unknown;
      rosterPlayers?: unknown;
      league?: unknown;
      quickAnalysis?: unknown;
    };

    if (!body.pick || !body.quickAnalysis) {
      return NextResponse.json({ error: 'pick and quickAnalysis required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const rosterSlice = Array.isArray(body.rosterPlayers) ? body.rosterPlayers.slice(0, 48) : [];

    const userPrompt = [
      'You are a dynasty fantasy football Pick Advisor.',
      'Write a concise analysis (max ~350 words). Use short paragraphs.',
      'Start optional section titles with a single line like **VERDICT** (markdown bold on its own line).',
      'Reference KTC-style pick value, roster age curve from the summary, and give a clear hold vs shop recommendation.',
      '',
      'PICK:',
      JSON.stringify(body.pick),
      '',
      'QUICK ANALYSIS:',
      JSON.stringify(body.quickAnalysis),
      '',
      'ROSTER PLAYERS (subset):',
      JSON.stringify(rosterSlice),
      '',
      'LEAGUE:',
      JSON.stringify(body.league ?? {}),
    ].join('\n');

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = msg.content.find((b) => b.type === 'text');
    const analysis = block && block.type === 'text' ? block.text : '';
    if (!analysis.trim()) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 502 });
    }

    return NextResponse.json({ analysis });
  } catch (e) {
    console.error('[picks/analyze]', e);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
