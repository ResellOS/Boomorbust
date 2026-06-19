import { createAdminClient } from '@/lib/supabase/admin';
import { fetchRotationData } from './fetchRotationData';
import { empireRatingFromTfo } from './rotation';

export const EMPIRE_RATING_TOOLTIP = `Your Empire Rating measures the overall strength of your dynasty portfolio across all connected leagues.

It's calculated from:
• Average Dynasty Rating of your rostered players (weighted by roster slot)
• League count and diversity
• Contention window across leagues

Higher = stronger overall portfolio.
Updates when your rosters sync.`;

export async function computeEmpireRatingForUser(
  userId: string,
  sleeperUserId: string,
): Promise<number> {
  const data = await fetchRotationData(userId, sleeperUserId);
  return empireRatingFromTfo(data.portfolio.teamTfo);
}

/** Persist empire rating snapshot after a successful roster sync. */
export async function persistLastEmpireRatingAfterSync(
  userId: string,
  sleeperUserId: string,
): Promise<void> {
  try {
    const db = createAdminClient();
    const rating = await computeEmpireRatingForUser(userId, sleeperUserId);
    const { error } = await db
      .from('profiles')
      .update({ last_empire_rating: rating })
      .eq('id', userId);
    if (error) console.error('[empireRating] profile update failed:', error.message);
  } catch (err) {
    console.error('[empireRating] persist failed:', err);
  }
}

/** Delta vs last sync; null when no prior snapshot or unchanged. */
export function empireRatingDelta(
  current: number,
  lastSync: number | null | undefined,
): number | null {
  if (lastSync == null || !Number.isFinite(lastSync)) return null;
  const delta = Math.round((current - lastSync) * 10) / 10;
  return delta === 0 ? null : delta;
}
