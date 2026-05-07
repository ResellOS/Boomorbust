import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { findTradeTargets, type TradeMatch } from '@/lib/trade/finder';
import { Redis } from '@upstash/redis';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/coach/context';
import type { ManagerProfileData } from '@/lib/managers/analyzer';

const anthropic = new Anthropic();

const TRADE_FINDER_SYSTEM = buildSystemPrompt(
  "You are a dynasty fantasy football trade analyst. Write concise, specific trade pitches that speak to this manager's WR-first rebuild philosophy. Always name the chips on both sides. Always reference KTC value tier or round equivalent — never vague phrases like \"a lot of value.\" End with the win condition for each team."
);

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

async function generatePitch(
  match: TradeMatch,
  userLeague: string,
  theirProfile: ManagerProfileData | null
): Promise<string> {
  const profileContext = theirProfile
    ? `\nTarget manager profile: ${theirProfile.archetype_label} — ${theirProfile.archetype_desc} Avg buy age: ${theirProfile.avg_buy_age ?? '?'}. Pitch angle: ${theirProfile.pitch_angle}`
    : '';

  const prompt = `Dynasty trade pitch for a ${userLeague} league:${profileContext}

You need: ${match.you_need.join(', ') || 'depth'}
They need: ${match.they_need.join(', ') || 'depth'}
You offer: ${match.your_chip}
They offer: ${match.their_chip}
Trade concept: ${match.trade_concept}

Write a specific, compelling 3–4 sentence trade pitch tailored to how this manager actually behaves. Name the chips. Reference KTC tiers. End with the win condition for each team.`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: [{ type: 'text', text: TRADE_FINDER_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('');
  } catch {
    return match.trade_concept;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { league_id } = await request.json();
  const cacheKey = `trade_finder:${user.id}:${league_id}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<TradeMatch[]>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  const [{ data: league }, { data: allRosters }, { data: profile }] = await Promise.all([
    supabase.from('leagues').select('name, scoring_settings').eq('id', league_id).single(),
    supabase.from('rosters').select('roster_id, players, owner_id').eq('league_id', league_id),
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
  ]);

  const ownerSid = profile?.sleeper_user_id != null ? String(profile.sleeper_user_id).trim() : null;
  if (!ownerSid) {
    console.warn('[api/trade/find] No profiles.sleeper_user_id — link Sleeper in Settings');
    return NextResponse.json([], { headers: { 'X-Trade-Finder-Reason': 'no_sleeper_user_id' } });
  }

  const { data: userRoster, error: userRosterErr } = await supabase
    .from('rosters')
    .select('roster_id, players, owner_id')
    .eq('league_id', league_id)
    .eq('owner_id', ownerSid)
    .maybeSingle();

  if (userRosterErr) console.warn('[api/trade/find] user roster lookup', userRosterErr.message);

  if (!allRosters?.length) {
    console.warn('[api/trade/find] league has no roster rows synced', league_id);
    return NextResponse.json([]);
  }
  if (!userRoster?.players?.length) {
    console.warn(
      '[api/trade/find] no roster matched owner_id=%s league=%s (sample owners: %s)',
      ownerSid,
      league_id,
      allRosters.map((r) => r.owner_id).slice(0, 8).join(',') || 'none'
    );
    return NextResponse.json([]);
  }

  const allIds = Array.from(new Set(allRosters.flatMap((r) => (r.players ?? []) as string[])));
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allIds),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  const matches = findTradeTargets(
    userRoster.roster_id,
    (userRoster.players ?? []) as string[],
    allRosters.map((r) => ({ roster_id: r.roster_id as number, players: (r.players ?? []) as string[] })),
    playerData,
    ktcMap
  );

  // Look up cached manager profiles for personalized pitches
  const profileMap: Record<number, ManagerProfileData> = {};
  if (redis) {
    try {
      const cached = await redis.get<Array<{ sleeper_roster_id: number; data: ManagerProfileData }>>(`mgr_profiles:${league_id}`);
      if (cached) {
        for (const p of cached) profileMap[p.sleeper_roster_id] = p.data;
      }
    } catch {}
  }
  if (!Object.keys(profileMap).length) {
    const { data: dbProfiles } = await supabase
      .from('manager_profiles')
      .select('sleeper_roster_id, data')
      .eq('league_id', league_id);
    for (const p of dbProfiles ?? []) {
      profileMap[p.sleeper_roster_id as number] = p.data as ManagerProfileData;
    }
  }

  const withPitches = await Promise.all(
    matches.map(async (m, i) => {
      if (i < 3) {
        const theirProfile = profileMap[m.roster_id] ?? null;
        const pitch = await generatePitch(m, league?.name ?? '', theirProfile);
        return { ...m, ai_pitch: pitch };
      }
      return m;
    })
  );

  if (redis) {
    try {
      await redis.set(cacheKey, withPitches, { ex: 21600 });
    } catch {}
  }

  console.info(`[api/trade/find] league=${league_id} owner=${ownerSid} matches=${withPitches.length}`);

  return NextResponse.json(withPitches);
}
