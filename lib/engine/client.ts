// Client for the Boom or Bust formula engine bridge API.
// Configured via FORMULA_ENGINE_URL + BOB_API_KEY (server-only env).

// Strip any trailing slash so `${BASE}/api/...` can never produce a double slash.
const BASE = (process.env.ENGINE_BASE_URL ?? process.env.FORMULA_ENGINE_URL ?? '').replace(/\/+$/, '');
const ENGINE_API_KEY = process.env.CONSUMER_API_KEY ?? process.env.BOB_API_KEY;

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

// Parse a response as JSON, but never throw on an HTML error page (a 404/500 from
// the engine returns "<!DOCTYPE …", which would otherwise crash res.json() with
// "Unexpected token '<'"). Returns a structured error instead.
async function safeJson(res: Response, label: string) {
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    console.error(`[engine] ${label}: non-JSON response (HTTP ${res.status}) — ${snippet}`);
    return {
      ok: false,
      error: `Engine returned HTTP ${res.status} (non-JSON). The bridge route may be missing.`,
    };
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[engine] ${label}: JSON parse failed (HTTP ${res.status})`);
    return { ok: false, error: 'Engine returned malformed JSON.' };
  }
}

export async function getEngineStatus() {
  if (!BASE) return notConfigured();
  const url = `${BASE}/api/bridge/status`;
  console.log('[engine] getEngineStatus →', url);
  try {
    const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
    return await safeJson(res, 'getEngineStatus');
  } catch (err) {
    console.error('[engine] getEngineStatus failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}

export async function triggerRescore(
  scoringContext: RescoreContext = 'both',
  force = true,
) {
  if (!BASE) return notConfigured();
  const url = `${BASE}/api/bridge/rescore`;
  console.log('[engine] triggerRescore → POST', url, { scoringContext, force });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ scoringContext, season: 2026, force }),
      cache: 'no-store',
    });
    return await safeJson(res, 'triggerRescore');
  } catch (err) {
    console.error('[engine] triggerRescore failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}

export async function getPlayerScores(
  playerIds: string[],
  context: ScoringContext = 'dynasty',
) {
  if (!BASE) return notConfigured();
  const ids = playerIds.join(',');
  const url = `${BASE}/api/bridge/scores?player_ids=${ids}&context=${context}`;
  console.log('[engine] getPlayerScores →', url);
  try {
    const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
    return await safeJson(res, 'getPlayerScores');
  } catch (err) {
    console.error('[engine] getPlayerScores failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}

export interface TrackRecordConsensusParams {
  season?: number;
  limit?: number;
  min_abs_delta?: number;
  as_of?: string;
  source?: string;
}

export async function getTrackRecordConsensus(params: TrackRecordConsensusParams = {}) {
  if (!BASE) return notConfigured();
  const qs = new URLSearchParams();
  if (params.season != null) qs.set('season', String(params.season));
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.min_abs_delta != null) qs.set('min_abs_delta', String(params.min_abs_delta));
  if (params.as_of) qs.set('as_of', params.as_of);
  if (params.source) qs.set('source', params.source);

  const query = qs.toString();
  const url = `${BASE}/api/v1/track-record/consensus${query ? `?${query}` : ''}`;
  console.log('[engine] getTrackRecordConsensus →', url);
  try {
    const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
    return await safeJson(res, 'getTrackRecordConsensus');
  } catch (err) {
    console.error('[engine] getTrackRecordConsensus failed:', err);
    return { ok: false, error: 'Engine unreachable' };
  }
}
