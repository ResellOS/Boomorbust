/**
 * Supabase Edge Function — weekly-medical-sync
 *
 * Pulls injury data from an ESPN-compatible endpoint and upserts into
 * the medical_history table on (player_id, injury_type, season).
 *
 * Exports: syncMedicalHistory(), getMedicalHistory(playerId)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ESPNInjuryEntry {
  athlete?: {
    id?: string;
    fullName?: string;
    position?: { abbreviation?: string };
  };
  status?: string;
  injuries?: Array<{
    type?: { description?: string };
    details?: { fantasyStatus?: { description?: string } };
  }>;
}

interface MedicalHistoryRow {
  player_id: string;
  sleeper_player_id?: string | null;
  injury_type: string;
  season: number;
  severity: string | null;
  games_missed: number;
  recurrence_count: number;
  source: string;
  updated_at: string;
}

// ─── ESPN fetch ────────────────────────────────────────────────────────────────

async function fetchESPNInjuries(): Promise<ESPNInjuryEntry[]> {
  const res = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries',
  );
  if (!res.ok) return [];
  const data = await res.json() as { injuries?: ESPNInjuryEntry[] };
  return data.injuries ?? [];
}

// ─── Player ID resolver ────────────────────────────────────────────────────────
// Fuzzy name match — ESPN uses ESPN IDs, we store Sleeper IDs in bbv_values.

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function resolvePlayerId(
  supabase: ReturnType<typeof getSupabase>,
  espnName: string,
): Promise<string | null> {
  const norm = normalizeName(espnName);
  const parts = norm.split(' ');
  if (parts.length < 2) return null;

  const lastName = parts[parts.length - 1];
  const { data } = await supabase
    .from('bbv_values')
    .select('player_id, player_name')
    .ilike('player_name', `%${lastName}%`)
    .limit(10);

  if (!data?.length) return null;

  // Pick best match by full name similarity
  let bestId: string | null = null;
  let bestScore = 0;

  for (const row of data as Array<{ player_id: string; player_name: string }>) {
    const candidate = normalizeName(row.player_name ?? '');
    const common = norm.split(' ').filter(w => candidate.includes(w)).length;
    const score = common / Math.max(norm.split(' ').length, 1);
    if (score > bestScore) {
      bestScore = score;
      bestId = row.player_id;
    }
  }

  return bestScore >= 0.6 ? bestId : null;
}

// ─── syncMedicalHistory ────────────────────────────────────────────────────────

export async function syncMedicalHistory(): Promise<{ synced: number; errors: number }> {
  const supabase = getSupabase();
  const season = new Date().getFullYear();
  const injuries = await fetchESPNInjuries();

  let synced = 0;
  let errors = 0;

  for (const entry of injuries) {
    const espnName = entry.athlete?.fullName;
    if (!espnName) continue;

    const playerId = await resolvePlayerId(supabase, espnName);
    if (!playerId) continue;

    const injuryDesc = entry.injuries?.[0]?.type?.description ?? 'Unknown';
    const fantasyStatus = entry.injuries?.[0]?.details?.fantasyStatus?.description ?? null;

    const severity: string | null =
      fantasyStatus?.toLowerCase().includes('out') ? 'out' :
      fantasyStatus?.toLowerCase().includes('doubtful') ? 'doubtful' :
      fantasyStatus?.toLowerCase().includes('questionable') ? 'questionable' :
      null;

    // Check if this injury already exists to bump recurrence count
    const { data: existing } = await supabase
      .from('medical_history')
      .select('recurrence_count, games_missed')
      .eq('player_id', playerId)
      .ilike('injury_type', `%${injuryDesc.split(' ')[0]}%`)
      .eq('season', season - 1)
      .maybeSingle();

    const priorCount = (existing as { recurrence_count?: number } | null)?.recurrence_count ?? 0;

    const row: MedicalHistoryRow = {
      player_id: playerId,
      injury_type: injuryDesc,
      season,
      severity,
      games_missed: 0,
      recurrence_count: priorCount >= 1 ? priorCount + 1 : 1,
      source: 'espn',
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase
        .from('medical_history')
        .upsert(row, { onConflict: 'player_id,injury_type,season' });
      synced++;
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}

// ─── getMedicalHistory ─────────────────────────────────────────────────────────

export async function getMedicalHistory(playerId: string): Promise<MedicalHistoryRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('medical_history')
    .select('*')
    .eq('player_id', playerId)
    .order('season', { ascending: false });

  return (data as MedicalHistoryRow[] | null) ?? [];
}

// ─── Edge function handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await syncMedicalHistory();

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
