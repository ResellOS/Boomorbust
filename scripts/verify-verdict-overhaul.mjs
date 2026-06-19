// One-shot verification of the Verdict Overhaul DB state.
// Checks: formula_scores verdict distribution, rank_delta population,
// Engine 5 SELL/BUST filter, Engine 6 daily_tasks freshness.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim();
const url = get('NEXT_PUBLIC_SUPABASE_URL');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(url, key, { auth: { persistSession: false } });

const line = (s = '') => console.log(s);

async function columns() {
  const { data, error } = await db.from('formula_scores').select('*').limit(1);
  if (error) return line('formula_scores read error: ' + error.message);
  line('formula_scores columns: ' + (data?.[0] ? Object.keys(data[0]).join(', ') : '(no rows)'));
}

async function distribution() {
  line('\n=== [1] formula_scores verdict distribution ===');
  // pull all verdicts for the default dynasty/ppr context
  const { data, error } = await db
    .from('formula_scores')
    .select('verdict, rank_delta')
    .eq('scoring_context', 'dynasty')
    .eq('scoring_type', 'ppr')
    .eq('weight_set_name', 'default');
  if (error) return line('error: ' + error.message);
  const total = data.length;
  const counts = {};
  let rankDeltaNonNull = 0;
  for (const r of data) {
    counts[r.verdict ?? 'NULL'] = (counts[r.verdict ?? 'NULL'] || 0) + 1;
    if (r.rank_delta !== null && r.rank_delta !== undefined) rankDeltaNonNull++;
  }
  line('total rows: ' + total);
  for (const [v, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    line(`  ${v.padEnd(6)} ${String(c).padStart(4)}  ${((c / total) * 100).toFixed(1)}%`);
  }
  line(`rank_delta non-null: ${rankDeltaNonNull}/${total} (${((rankDeltaNonNull / total) * 100).toFixed(1)}%)`);
  return { counts, total };
}

async function sampleRankDelta() {
  line('\n=== [2] 10 sample players rank_delta ===');
  const { data, error } = await db
    .from('formula_scores')
    .select('player_id, tfo_score, verdict, rank_delta')
    .eq('scoring_context', 'dynasty')
    .eq('scoring_type', 'ppr')
    .eq('weight_set_name', 'default')
    .limit(10);
  if (error) return line('error: ' + error.message);
  for (const r of data) {
    line(`  ${String(r.player_id).padEnd(8)} tfo=${String(r.tfo_score).padStart(5)} verdict=${String(r.verdict).padEnd(6)} rank_delta=${r.rank_delta}`);
  }
}

async function engine5() {
  line('\n=== [5] Engine 5 filter: verdict IN (SELL, BUST) ===');
  const { data, error } = await db
    .from('formula_scores')
    .select('player_id, verdict, rank_delta')
    .in('verdict', ['SELL', 'BUST'])
    .eq('scoring_context', 'dynasty')
    .eq('scoring_type', 'ppr')
    .eq('weight_set_name', 'default')
    .order('rank_delta', { ascending: true })
    .limit(10);
  if (error) return line('error: ' + error.message);
  line(`SELL/BUST rows (showing up to 10): ${data.length}`);
  for (const r of data) line(`  ${String(r.player_id).padEnd(8)} ${r.verdict} rank_delta=${r.rank_delta}`);
}

async function engine6() {
  line('\n=== [6] Engine 6 daily_tasks ===');
  const { data, error } = await db
    .from('daily_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return line('daily_tasks error: ' + error.message);
  line('recent daily_tasks rows: ' + data.length);
  if (data[0]) line('columns: ' + Object.keys(data[0]).join(', '));
  for (const r of data) {
    line(`  ${r.created_at ?? '?'}  type=${r.task_type ?? r.type ?? '?'}  verdict=${r.verdict ?? '-'}`);
  }
}

await columns();
await distribution();
await sampleRankDelta();
await engine5();
await engine6();
line('\nDONE');
