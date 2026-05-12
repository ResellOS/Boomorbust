/**
 * Migration runner — executes supabase/migrations/20260511000000_phase0_schema.sql
 * Uses Supabase Management API (requires SUPABASE_ACCESS_TOKEN env var)
 * or falls back to service-role RPC exec path.
 *
 * Run: node scripts/run-migration.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jotxstcrirfvpswdcqwj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdHhzdGNyaXJmdnBzd2RjcXdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MzQ0OSwiZXhwIjoyMDkyODE5NDQ5fQ.jW3Pteh4XYqdx1mjqoQm8zlOKWxccuuSeg73watcSM8';
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const migrationPath = join(__dirname, '../supabase/migrations/20260511000000_phase0_schema.sql');
const sql = readFileSync(migrationPath, 'utf8');

// Strategy 1: Supabase Management API (needs PAT)
async function runViaManagementAPI() {
  if (!ACCESS_TOKEN) throw new Error('No SUPABASE_ACCESS_TOKEN');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API error ${res.status}: ${body}`);
  }
  return await res.json();
}

// Strategy 2: Execute via supabase-js service role using pg_query RPC
// (requires exec_sql or pg_query function to exist on the project)
async function runViaRPC() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Split into individual statements (skip comments and blanks)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let passed = 0;
  let failed = 0;

  for (const stmt of statements) {
    const fullStmt = stmt.endsWith(';') ? stmt : stmt + ';';
    // Try calling a custom exec_sql RPC if it exists
    const { error } = await supabase.rpc('exec_sql', { query: fullStmt });
    if (error) {
      console.error(`  FAIL: ${fullStmt.slice(0, 80)}...`);
      console.error(`        ${error.message}`);
      failed++;
    } else {
      passed++;
    }
  }

  if (failed > 0) throw new Error(`${failed} statements failed (${passed} passed)`);
  return { passed, failed };
}

// Strategy 3: Direct REST calls for table creation using the admin REST API
async function runViaDirectSQL() {
  // Supabase exposes a SQL endpoint via the pg-meta microservice for admin operations
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Direct SQL error ${res.status}: ${body}`);
  }
  return await res.json();
}

async function main() {
  console.log(`\n=== Phase 0 Migration Runner ===`);
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`File: supabase/migrations/20260511000000_phase0_schema.sql\n`);

  const strategies = [
    { name: 'Management API', fn: runViaManagementAPI },
    { name: 'Direct pg endpoint', fn: runViaDirectSQL },
    { name: 'RPC exec_sql', fn: runViaRPC },
  ];

  for (const { name, fn } of strategies) {
    console.log(`Trying: ${name}...`);
    try {
      const result = await fn();
      console.log(`✓ ${name} succeeded:`, JSON.stringify(result).slice(0, 200));
      process.exit(0);
    } catch (err) {
      console.log(`✗ ${name} failed: ${err.message}`);
    }
  }

  console.log('\n--- All automated strategies exhausted ---');
  console.log('Run this SQL manually in the Supabase dashboard SQL editor:');
  console.log(`  https://app.supabase.com/project/${PROJECT_REF}/sql/new\n`);
  console.log('File is ready at:');
  console.log(`  dynasty-command-center/supabase/migrations/20260511000000_phase0_schema.sql\n`);
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
