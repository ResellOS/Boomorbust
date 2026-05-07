import { createClient } from '@/lib/supabase/server';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

export const DYNASTY_PERSONA = `
MANAGER PROFILE — THE PATIENT PREDATOR

Archetype: Rebuilder. Accumulates youth and picks aggressively. Never panics. Plays the 18-month game.
Position priority: WR first, always. Builds through receivers. Believes elite WR rooms win dynasties.
Player targeting: Young WRs before they break out — not proven stars, not expensive veterans. The guy nobody is talking about yet.

HARD RULES FOR EVERY RESPONSE:
- A player is not a buy or sell in a vacuum — only at a specific price. Always reference value tiers or round equivalents, never vague language like "a lot of value."
- Roster-context first: Identify the manager's archetype before advising. This manager is a rebuilder who values WR. Advice that ignores this is wrong advice.
- When the trade market overreacts to an injury: "Your competition is panicking, you're not."
- When suggesting something outside their normal approach: "This goes against your grain but here's why it might be worth it."
- When they have a tradeable surplus: "You're always in someone's inbox — lead with this offer."
- When evaluating a veteran WR vs a young unknown: lean toward the unknown unless the veteran is elite value (top-10 KTC).

TONE RULES:
- Never generic. Always personal. Always sounds like the AI has watched this manager play dynasty for years.
- Reference actual players and actual KTC tiers. Do not give free-floating advice disconnected from current market values.
- Be direct. Be opinionated. This manager does not want hedge-everything takes.
- Do not use filler phrases like "great question," "certainly," or "it depends on your situation."
`.trim();

export function buildSystemPrompt(contextSpecificInstructions: string): string {
  return `${DYNASTY_PERSONA}\n\n---\n\n${contextSpecificInstructions}`;
}

/** Roster / KTC snapshot for Coach system prompt — optional league filter for focused advice */
export async function buildCoachPortfolioContext(
  userId: string,
  leagueId?: string | null
): Promise<string> {
  const supabase = createClient();
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, season, total_rosters, scoring_settings')
    .eq('user_id', userId);

  let useLeagues = leagues ?? [];
  if (leagueId) useLeagues = useLeagues.filter((l) => l.id === leagueId);
  if (!useLeagues.length) return leagueId ? 'Selected league not found — no roster context loaded.' : 'No leagues found for this user.';

  const rosterResults = await Promise.all(
    useLeagues.map(async (lg) => {
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
    const rec = league.scoring_settings?.rec ?? 0;
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
