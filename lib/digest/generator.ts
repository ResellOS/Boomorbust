import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { scanAllRosterInjuries } from '@/lib/injuries/broadcaster';
import type { InjuryAlert } from '@/lib/injuries/broadcaster';

export interface DigestData {
  user_email: string;
  week: number;
  season: string;
  injuries: InjuryAlert[];
  borderline_decisions: Array<{
    player_name: string;
    position: string;
    league_name: string;
    projected_points: number;
    recommendation: 'FLEX';
  }>;
  waiver_targets: Array<{
    name: string;
    position: string;
    team: string | null;
    reason: string;
  }>;
  total_leagues: number;
}

export async function generateWeeklyDigest(
  user_id: string,
  user_email: string,
  week: number,
  season: string,
  supabase: SupabaseClient
): Promise<DigestData | null> {
  const [{ data: leagues }, { data: profile }] = await Promise.all([
    supabase.from('leagues').select('id, name, total_rosters, scoring_settings').eq('user_id', user_id),
    supabase.from('profiles').select('sleeper_user_id, preference_data').eq('id', user_id).single(),
  ]);

  if (!leagues?.length) return null;

  // Check if user has opted out
  const prefs = (profile?.preference_data as Record<string, unknown>) ?? {};
  if (prefs.digest_enabled === false) return null;

  // Fetch all rosters
  const rosterResults = await Promise.all(
    (leagues ?? []).map(async (lg) => {
      const { data } = await supabase
        .from('rosters')
        .select('roster_id, players, starters')
        .eq('league_id', lg.id)
        .single();
      return {
        league_id: lg.id,
        league_name: lg.name,
        roster_id: data?.roster_id ?? 0,
        players: (data?.players ?? []) as string[],
        starters: (data?.starters ?? []) as string[],
      };
    })
  );

  // Fetch all player data
  const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players)));
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allIds),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  // Injury alerts
  const injuries = scanAllRosterInjuries(rosterResults, playerData, ktcMap).slice(0, 5);

  // Borderline FLEX decisions (simplified — starters with Q/D status)
  const borderline_decisions = rosterResults.flatMap((r) =>
    r.starters
      .filter((id) => {
        const p = playerData[id];
        return p?.injury_status === 'Q' || p?.injury_status === 'D';
      })
      .slice(0, 2)
      .map((id) => {
        const p = playerData[id];
        return {
          player_name: p?.full_name ?? id,
          position: p?.position ?? '',
          league_name: r.league_name,
          projected_points: 8,
          recommendation: 'FLEX' as const,
        };
      })
  ).slice(0, 3);

  // Simple waiver targets — players with rising trend not on any roster
  const waiver_targets: DigestData['waiver_targets'] = [
    { name: 'Check your waiver wire', position: 'RB', team: null, reason: 'Emerging role players from injured starters.' },
  ];

  return {
    user_email,
    week,
    season,
    injuries,
    borderline_decisions,
    waiver_targets,
    total_leagues: leagues.length,
  };
}

export function buildDigestEmailHtml(data: DigestData): string {
  const injuryRows = data.injuries.slice(0, 3).map((a) =>
    `<tr>
      <td style="padding:8px 0;color:#F8FAFC;font-weight:600">${a.player.name}</td>
      <td style="padding:8px 0;color:#94A3B8">${a.player.position} · ${a.player.team ?? '?'}</td>
      <td style="padding:8px 0;color:${a.severity === 'season_ending' ? '#f87171' : a.severity === 'multi_week' ? '#fb923c' : '#fbbf24'}">${a.severity_label}</td>
      <td style="padding:8px 0;color:#CBD5E1;font-size:12px">${a.recommendation}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0F172A;color:#F8FAFC;font-family:system-ui,sans-serif;padding:32px;max-width:600px;margin:0 auto">
  <h1 style="color:#6366F1;font-size:24px;margin-bottom:4px">The Front Office</h1>
  <p style="color:#94A3B8;margin-top:0">Week ${data.week} · ${data.season} Season Digest</p>
  <hr style="border-color:#1E293B;margin:24px 0">

  ${data.injuries.length ? `
  <h2 style="color:#F8FAFC;font-size:16px;margin-bottom:12px">🚨 Injury Alerts (${data.injuries.length})</h2>
  <table style="width:100%;border-collapse:collapse">${injuryRows}</table>
  <hr style="border-color:#1E293B;margin:24px 0">
  ` : ''}

  ${data.borderline_decisions.length ? `
  <h2 style="color:#F8FAFC;font-size:16px;margin-bottom:12px">⚖️ Borderline Lineup Calls</h2>
  <ul style="color:#CBD5E1;padding-left:20px">
    ${data.borderline_decisions.map((d) => `<li>${d.player_name} (${d.league_name}) — <span style="color:#fbbf24">FLEX</span> decision</li>`).join('')}
  </ul>
  <hr style="border-color:#1E293B;margin:24px 0">
  ` : ''}

  <p style="text-align:center;margin-top:32px">
    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
      Open Dashboard
    </a>
  </p>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px">
    The Front Office · <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings" style="color:#6366F1">Unsubscribe</a>
  </p>
</body>
</html>`;
}
