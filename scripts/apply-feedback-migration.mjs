/**
 * Apply feedback migration via Supabase service role + PostgREST is DDL-only blocked.
 * Uses direct Postgres when SUPABASE_POOLER_URL or DATABASE_URL is set.
 * Usage: node scripts/apply-feedback-migration.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[m[1]] = v;
}

const url = process.env.SUPABASE_POOLER_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.log('No SUPABASE_POOLER_URL — run supabase/migrations/20260615_user_feedback_badges.sql in the SQL editor.');
  process.exit(0);
}

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260615_user_feedback_badges.sql'),
  'utf8',
);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log('Migration applied successfully.');
