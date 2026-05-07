import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('preference_data')
    .eq('id', user.id)
    .single();

  const prefs = (profile?.preference_data as Record<string, unknown>) ?? {};
  const pendingUid = prefs._verify_uid as string | undefined;
  const pendingUsername = prefs._verify_username as string | undefined;
  const exp = prefs._verify_exp as number | undefined;

  if (!pendingUid || !pendingUsername) {
    return NextResponse.json(
      { error: 'No pending verification found. Please start over.' },
      { status: 400 },
    );
  }

  if (exp && Date.now() > exp) {
    return NextResponse.json(
      { error: 'Verification session expired (10-minute limit). Please start over.' },
      { status: 400 },
    );
  }

  // Fetch Sleeper user by user_id (stable identifier)
  const sleeperRes = await fetch(
    `https://api.sleeper.app/v1/user/${encodeURIComponent(pendingUid)}`,
  );
  if (!sleeperRes.ok) {
    return NextResponse.json(
      { error: 'Could not reach Sleeper API. Try again in a moment.' },
      { status: 502 },
    );
  }

  const sleeperUser = (await sleeperRes.json()) as {
    user_id?: string;
    username?: string;
    display_name?: string;
  } | null;

  if (!sleeperUser || !sleeperUser.user_id) {
    return NextResponse.json(
      { error: 'Unexpected response from Sleeper API. Try again.' },
      { status: 502 },
    );
  }

  // Round-trip user_id check prevents substitution attacks
  if (sleeperUser.user_id !== pendingUid) {
    return NextResponse.json({ error: 'Account mismatch. Please start over.' }, { status: 400 });
  }

  const displayName = sleeperUser.display_name ?? '';
  const match = displayName.match(/BOB(\d{3})/i);

  if (!match) {
    return NextResponse.json(
      {
        verified: false,
        error: `No "BOBnnn" code found in your Sleeper display name (currently: "${displayName || '(empty)'}"). Make sure you saved, then try again.`,
      },
      { status: 400 },
    );
  }

  const digits = match[1];

  // Validate digits against an active row in verification_codes table
  const { data: codeRow, error: codeErr } = await supabase
    .from('verification_codes')
    .select('id, use_count')
    .eq('code', digits)
    .eq('is_active', true)
    .single();

  if (codeErr || !codeRow) {
    return NextResponse.json(
      {
        verified: false,
        error: `Code "BOB${digits}" is not currently active. Please start over to get the current code.`,
      },
      { status: 400 },
    );
  }

  await supabase
    .from('verification_codes')
    .update({ use_count: ((codeRow.use_count as number) ?? 0) + 1 })
    .eq('id', codeRow.id as string);

  // Strip temp verification fields and save verified profile
  const cleanPrefs = { ...prefs };
  delete cleanPrefs._verify_uid;
  delete cleanPrefs._verify_username;
  delete cleanPrefs._verify_exp;

  const { error: saveErr } = await supabase
    .from('profiles')
    .update({
      sleeper_user_id: sleeperUser.user_id,
      username: sleeperUser.username,
      preference_data: cleanPrefs,
    })
    .eq('id', user.id);

  if (saveErr) {
    return NextResponse.json({ error: 'Failed to save profile. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ verified: true, username: sleeperUser.username });
}
