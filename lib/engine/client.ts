// Client for the Boom or Bust formula engine bridge API.
// Configured via FORMULA_ENGINE_URL + BOB_API_KEY (server-only env).

const ENGINE_URL = process.env.FORMULA_ENGINE_URL;
const ENGINE_API_KEY = process.env.BOB_API_KEY;

export type ScoringContext = 'dynasty' | 'redraft';
export type RescoreContext = ScoringContext | 'both';

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${ENGINE_API_KEY ?? ''}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function notConfigured() {
  return { ok: false, error: 'Formula engine not configured (missing FORMULA_ENGINE_URL / BOB_API_KEY)' };
}

export async function getEngineStatus() {
  if (!ENGINE_URL) return notConfigured();
  try {
    const res = await fetch(`${ENGINE_URL}/api/bridge/status`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    return await res.json();
  } catch (err) {
    console.error('[engine] getEngineStatus failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}

export async function triggerRescore(
  scoringContext: RescoreContext = 'both',
  force = true,
) {
  if (!ENGINE_URL) return notConfigured();
  try {
    const res = await fetch(`${ENGINE_URL}/api/bridge/rescore`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ scoringContext, season: 2026, force }),
    });
    return await res.json();
  } catch (err) {
    console.error('[engine] triggerRescore failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}

export async function getPlayerScores(
  playerIds: string[],
  context: ScoringContext = 'dynasty',
) {
  if (!ENGINE_URL) return notConfigured();
  try {
    const ids = playerIds.join(',');
    const res = await fetch(
      `${ENGINE_URL}/api/bridge/scores?player_ids=${ids}&context=${context}`,
      { headers: authHeaders(), cache: 'no-store' },
    );
    return await res.json();
  } catch (err) {
    console.error('[engine] getPlayerScores failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}
