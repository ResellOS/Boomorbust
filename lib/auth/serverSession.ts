import { createClient } from '@/lib/supabase/server';

export interface DashboardAuthResult {
  userId: string | null;
  sleeperUserId: string | null;
  needsOnboarding: boolean;
  /** True when profile could not be loaded — do not redirect to login. */
  profileUnavailable: boolean;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves the current user for dashboard routes.
 * Retries once on transient failures; never treats a profile DB error as logged-out.
 */
export async function resolveDashboardAuth(): Promise<DashboardAuthResult> {
  const supabase = createClient();
  let userId: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user?.id) {
      userId = data.user.id;
    } else if (error) {
      console.error('[auth] getUser error:', error);
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData.session?.user?.id ?? null;
    }
  } catch (err) {
    console.error('[auth] getUser failed:', err);
  }

  if (!userId) {
    return { userId: null, sleeperUserId: null, needsOnboarding: false, profileUnavailable: false };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('sleeper_user_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[auth] profile query error:', error);
        if (attempt === 0) {
          await sleep(200);
          continue;
        }
        return { userId, sleeperUserId: null, needsOnboarding: false, profileUnavailable: true };
      }

      if (!profile) {
        console.error('[auth] no profile for user:', userId);
        return { userId, sleeperUserId: null, needsOnboarding: false, profileUnavailable: true };
      }

      if (!profile.sleeper_user_id) {
        return { userId, sleeperUserId: null, needsOnboarding: true, profileUnavailable: false };
      }

      return {
        userId,
        sleeperUserId: profile.sleeper_user_id,
        needsOnboarding: false,
        profileUnavailable: false,
      };
    } catch (err) {
      console.error('[auth] profile fetch failed:', err);
      if (attempt === 0) {
        await sleep(200);
        continue;
      }
      return { userId, sleeperUserId: null, needsOnboarding: false, profileUnavailable: true };
    }
  }

  return { userId, sleeperUserId: null, needsOnboarding: false, profileUnavailable: true };
}
