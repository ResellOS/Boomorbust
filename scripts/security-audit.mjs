/**
 * Security audit helpers — uses .env.local, prints non-secret findings only.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(process.cwd(), '.env.local');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const anonClient = createClient(url, anon);
const adminClient = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Email confirmation (GoTrue public settings) ──
try {
  const settingsRes = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (settingsRes.ok) {
    const settings = await settingsRes.json();
    const autoconfirm = settings.autoconfirm ?? settings.mailer_autoconfirm;
    console.log('=== EMAIL VERIFICATION (GoTrue settings) ===');
    console.log(
      autoconfirm === true
        ? 'WARNING: autoconfirm is ON — email confirmation appears DISABLED'
        : autoconfirm === false
          ? 'OK: autoconfirm is OFF — email confirmation likely ENABLED'
          : `UNKNOWN: autoconfirm=${JSON.stringify(autoconfirm)} — verify in Supabase dashboard`,
    );
    if (settings.external_email_enabled !== undefined) {
      console.log(`external_email_enabled: ${settings.external_email_enabled}`);
    }
  } else {
    console.log('=== EMAIL VERIFICATION ===');
    console.log(`Could not fetch GoTrue settings (HTTP ${settingsRes.status}) — check dashboard manually`);
  }
} catch (e) {
  console.log('=== EMAIL VERIFICATION ===');
  console.log(`Fetch failed: ${String(e)} — check Supabase dashboard manually`);
}

// ── RLS probe: anon SELECT on critical tables ──
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

console.log('\n=== RLS PROBE (anon INSERT — should be blocked) ===');
const insertProbes = {
  profiles: { id: '00000000-0000-0000-0000-000000000001' },
  leagues: { id: 'probe-league', user_id: '00000000-0000-0000-0000-000000000001', name: 'probe' },
  rosters: { roster_id: 99999, league_id: 'probe-league', owner_id: 'probe' },
  formula_scores: { player_id: 'probe', scoring_context: 'dynasty' },
  user_feedback: { message: 'probe' },
  user_badges: { user_id: '00000000-0000-0000-0000-000000000001', badge_key: 'probe' },
  waitlist_signups: { email: 'probe@example.com' },
  waitlist: { email: 'probe@example.com' },
};

for (const [table, row] of Object.entries(insertProbes)) {
  const { error } = await anonClient.from(table).insert(row);
  if (error) {
    const blocked =
      error.code === '42501' ||
      error.message.toLowerCase().includes('permission denied') ||
      error.message.toLowerCase().includes('row-level security');
    console.log(`${blocked ? 'RLS BLOCKED' : 'INSERT ERROR'} ${table} — ${error.code} ${error.message.slice(0, 70)}`);
  } else {
    console.log(`INSERT ALLOWED (bad) ${table} — anon insert succeeded`);
  }
}

console.log('\n=== RLS PROBE (anon SELECT count) ===');
for (const table of critical) {
  const { data, error, count } = await anonClient
    .from(table)
    .select('*', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    const code = error.code ?? '';
    const msg = error.message ?? '';
    if (code === '42P01' || msg.includes('does not exist')) {
      console.log(`NOT FOUND ${table}`);
    } else if (code === '42501' || msg.toLowerCase().includes('permission denied')) {
      console.log(`RLS BLOCKED (good) ${table} — ${msg.slice(0, 80)}`);
    } else {
      console.log(`ERROR ${table} — ${code} ${msg.slice(0, 80)}`);
    }
  } else {
    console.log(
      `ANON READABLE ${table} — count header=${count ?? '?'} (RLS may be missing or policy allows public read)`,
    );
  }
}

// ── List public tables via OpenAPI ──
try {
  const openApiRes = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  if (openApiRes.ok) {
    const spec = await openApiRes.json();
    const paths = Object.keys(spec.paths ?? {}).filter((p) => p.startsWith('/')).map((p) => p.slice(1));
    console.log(`\n=== PUBLIC TABLES (${paths.length} in OpenAPI) ===`);
    console.log(paths.sort().join(', '));
  }
} catch {
  // optional
}
