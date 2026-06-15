import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';

export const dynamic = 'force-dynamic';

export interface CalculatorSearchHit {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  tfoScore: number | null;
  ktcValue: number | null;
}

function rank(name: string, q: string): number {
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const i = n.indexOf(q);
  return i === -1 ? 999 : 10 + i;
}

// GET /api/trade/calculator-search?q= — name search enriched with TFO + KTC,
// for the roster-agnostic Trade Calculator.
export async function GET(req: NextRequest) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] as CalculatorSearchHit[] });

  const all = await fetchAllPlayers();
  if (!all) return NextResponse.json({ results: [] as CalculatorSearchHit[] });

  const matches: { s: number; playerId: string; name: string; position: string; team: string | null }[] = [];
  for (const [playerId, p] of Object.entries(all)) {
    if (!p.full_name || p.position === 'DEF') continue;
    if (!p.full_name.toLowerCase().includes(q)) continue;
    matches.push({
      s: rank(p.full_name, q),
      playerId,
      name: p.full_name,
      position: p.position ?? '—',
      team: p.team ?? null,
    });
    if (matches.length > 80) break;
  }
  matches.sort((a, b) => a.s - b.s || a.name.localeCompare(b.name));
  const top = matches.slice(0, 20);

  // Enrich with TFO (dynasty) + KTC.
  const ids = top.map((m) => m.playerId);
  const tfoById = new Map<string, number>();
  const ktcById = new Map<string, number>();
  if (ids.length > 0) {
    try {
      const db = createAdminClient();
      const [{ data: scores }, { data: ktc }] = await Promise.all([
        db.from('formula_scores').select('player_id, tfo_score')
          .eq('scoring_context', 'dynasty').in('player_id', ids),
        db.from('bbv_values').select('player_id, ktc_value').in('player_id', ids),
      ]);
      for (const s of scores ?? []) {
        if (s.tfo_score != null) tfoById.set(String(s.player_id), Number(s.tfo_score));
      }
      for (const k of ktc ?? []) {
        if (k.ktc_value != null) ktcById.set(String(k.player_id), Number(k.ktc_value));
      }
    } catch (err) {
      console.error('[trade/calculator-search] enrich failed:', err);
    }
  }

  const results: CalculatorSearchHit[] = top.map((m) => ({
    playerId: m.playerId,
    name: m.name,
    position: m.position,
    team: m.team,
    tfoScore: tfoById.get(m.playerId) ?? null,
    ktcValue: ktcById.get(m.playerId) ?? null,
  }));

  return NextResponse.json({ results });
}
