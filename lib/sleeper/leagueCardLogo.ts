import { nflLogoUrl } from '@/lib/nfl/teamLogo';

/** Raw Sleeper roster shape can include avatar in several places depending on endpoint/version. */
export type SleeperRosterLogoSource = {
  settings?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  avatar?: string | null;
};

/** Persist avatar id into merged settings JSON for Supabase (metadata not stored separately). */
export function mergeSleeperRosterSettings(roster: Record<string, unknown>): Record<string, unknown> {
  const settings =
    typeof roster.settings === 'object' && roster.settings !== null
      ? ({ ...(roster.settings as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const meta =
    typeof roster.metadata === 'object' && roster.metadata !== null
      ? (roster.metadata as Record<string, unknown>)
      : {};

  const idRaw =
    (typeof roster.avatar === 'string' && roster.avatar.trim()) ||
    (typeof settings.avatar === 'string' && settings.avatar.trim()) ||
    (typeof meta.avatar === 'string' && meta.avatar.trim()) ||
    '';

  if (idRaw) settings.avatar = idRaw;
  return settings;
}

/**
 * League cards: Sleeper vanity team avatar when available.
 * Fallback: deterministic NFL team illustration (matches previous nflLogoUrl(league.id) behavior).
 */
export function sleeperLeagueCardImageUrl(roster: SleeperRosterLogoSource | null | undefined, fallbackLeagueId: string): string {
  const fallback = nflLogoUrl(fallbackLeagueId);
  if (!roster) return fallback;

  const id =
    (typeof roster.avatar === 'string' && roster.avatar.trim()) ||
    (typeof roster.settings?.avatar === 'string' && roster.settings.avatar.trim()) ||
    (typeof roster.metadata?.avatar === 'string' && roster.metadata.avatar.trim()) ||
    '';

  if (!id) return fallback;
  return `https://sleepercdn.com/avatars/${id}`;
}
