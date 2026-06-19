/**
 * One-off RLS audit — reads .env.local, prints table RLS status only.
 * Usage: node scripts/security-audit-rls.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const envPath = resolve(process.cwd(), '.env.local');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const poolerUrl = process.env.SUPABASE_POOLER_URL;
if (!poolerUrl) {
  console.error('SUPABASE_POOLER_URL not set — cannot query RLS');
  process.exit(1);
}

const client = new pg.Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const tables = await client.query(`
  SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname;
`);

console.log('=== PUBLIC TABLES RLS ===');
for (const row of tables.rows) {
  console.log(`${row.rls_enabled ? 'ENABLED ' : 'DISABLED'} ${row.tablename}`);
}

const critical = [
  'profiles',
  'leagues',
  'rosters',
  'formula_scores',
  'user_feedback',
  'user_badges',
  'waitlist_signups',
  'waitlist',
];

console.log('\n=== CRITICAL TABLES ===');
const byName = new Map(tables.rows.map((r) => [r.tablename, r.rls_enabled]));
for (const t of critical) {
  if (byName.has(t)) {
    console.log(`${byName.get(t) ? 'OK' : 'MISSING RLS'} ${t}`);
  } else {
    console.log(`NOT FOUND ${t}`);
  }
}

await client.end();
