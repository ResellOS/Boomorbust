import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = {};
for (const line of readFileSync('G:/SaaSylum/FantasySmartass/dynasty-command-center/.env.local','utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

for (const t of ['formula_scores']) {
  const { data, error, count } = await db.from(t).select('*', { count:'exact' }).limit(1);
  console.log(`=== ${t} === rows=${count ?? '?'}${error?(' ERROR '+error.message):''}`);
  if (data?.[0]) { console.log('cols:', Object.keys(data[0]).join(', ')); console.log('sample:', JSON.stringify(data[0]).slice(0,400)); }
}

// season/context breakdown of formula_scores
const { data: ctx } = await db.from('formula_scores').select('season, scoring_context, scoring_type').limit(2000);
const agg = {};
for (const r of ctx ?? []) { const k=`${r.season}/${r.scoring_context}/${r.scoring_type}`; agg[k]=(agg[k]||0)+1; }
console.log('formula_scores breakdown:', agg);

// cios coverage in formula_scores
const SID='897812626640637952';
const { data: rosters } = await db.from('rosters').select('players').eq('owner_id', SID);
const pids=new Set(); for(const r of rosters??[]) for(const p of (r.players??[])) if(p) pids.add(String(p));
const ids=[...pids]; let covered=new Set();
for(let i=0;i<ids.length;i+=200){const {data}=await db.from('formula_scores').select('player_id').in('player_id',ids.slice(i,i+200));for(const r of data??[])covered.add(String(r.player_id));}
console.log(`cios players in formula_scores: ${covered.size}/${pids.size}`);
