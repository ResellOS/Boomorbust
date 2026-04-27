import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { PickInput, RosterPlayerInput, LeagueInput } from '@/lib/picks/advisor';
import { buildSystemPrompt } from '@/lib/coach/context';

const client = new Anthropic();

const PICK_INSTRUCTIONS = `You are a dynasty fantasy football expert with deep knowledge of pick values, roster construction, and long-term team building. Your analysis is direct, specific, and actionable.

When analyzing a dynasty draft pick, structure your response with exactly these four sections:

**Overview**
What this pick slot typically produces: player caliber, historical examples, and floor vs. ceiling expectations. Reference KTC value tier (not vague language — use "~4,500 KTC mid-first range" style references).

**Roster Fit**
How this pick fits the team's specific age curve and positional needs. Be specific about the roster data provided — mention actual players if relevant. Factor in this manager's WR-first philosophy.

**Trade Considerations**
When to hold vs. trade this pick. Reference specific value thresholds that should trigger selling. Name the round/tier equivalent for any offers worth considering.

**Bottom Line**
One clear recommendation in 2-3 sentences. Be direct and opinionated.

Keep the total response under 450 words. Use dynasty community terminology.`;

const SYSTEM_PROMPT = buildSystemPrompt(PICK_INSTRUCTIONS);

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    pick: PickInput;
    rosterPlayers: RosterPlayerInput[];
    league: LeagueInput;
    quickAnalysis: { pick_label: string; estimated_value: number; tier_label: string; roster_context: string; roster_summary: { rising: number; stable: number; declining: number; top_players: string[]; weakest_position: string; total_ktc: number } };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { pick, league, quickAnalysis } = body;
  const { roster_summary } = quickAnalysis;
  const format = (league.scoring_settings?.rec ?? 0) >= 1 ? 'PPR' : (league.scoring_settings?.rec ?? 0) >= 0.5 ? '0.5 PPR' : 'Standard';

  const userMessage = `Analyze this dynasty pick for me:

**Pick:** ${quickAnalysis.pick_label}
**Estimated KTC Value:** ~${quickAnalysis.estimated_value.toLocaleString()}
**Value Tier:** ${quickAnalysis.tier_label}

**League:** ${league.name}
- Format: ${format}, ${league.total_rosters ?? 12} teams
- Season: ${pick.season}

**My Roster Summary:**
- Roster trend: ${roster_summary.rising} rising / ${roster_summary.stable} stable / ${roster_summary.declining} declining players
- Total KTC across roster: ${roster_summary.total_ktc.toLocaleString()}
- Weakest position: ${roster_summary.weakest_position}
- Top players by value:
${roster_summary.top_players.map((p) => `  • ${p}`).join('\n')}

Provide a full dynasty pick analysis.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error('Anthropic API error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 502 });
  }
}
