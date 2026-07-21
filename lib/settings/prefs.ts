// Client-side user preferences persisted in localStorage.
//
// Notification + display toggles and locally-hidden ("disconnected") leagues.
// SSR-safe: every getter returns defaults when localStorage is unavailable.

export interface NotificationPrefs {
  regimeChange: boolean;
  sellWindow: boolean;
  breakoutSignals: boolean;
  championshipChanges: boolean;
  tradeOpportunities: boolean;
  weeklyReport: boolean;
}

export interface DisplayPrefs {
  showKtc: boolean;
  showConfidence: boolean;
  compactMode: boolean;
  showReasoning: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  regimeChange: true,
  sellWindow: true,
  breakoutSignals: true,
  championshipChanges: true,
  tradeOpportunities: true,
  weeklyReport: true,
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showKtc: true,
  showConfidence: true,
  compactMode: false,
  showReasoning: true,
};

const NOTIF_KEY = 'bob_notification_prefs';
const DISPLAY_KEY = 'bob_display_prefs';
const HIDDEN_LEAGUES_KEY = 'bob_hidden_leagues';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — preference simply isn't persisted */
  }
}

export const getNotificationPrefs = (): NotificationPrefs =>
  read(NOTIF_KEY, DEFAULT_NOTIFICATION_PREFS);
export const saveNotificationPrefs = (p: NotificationPrefs): void => write(NOTIF_KEY, p);

export const getDisplayPrefs = (): DisplayPrefs => read(DISPLAY_KEY, DEFAULT_DISPLAY_PREFS);
export const saveDisplayPrefs = (p: DisplayPrefs): void => write(DISPLAY_KEY, p);

export function getHiddenLeagues(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(HIDDEN_LEAGUES_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function setHiddenLeagues(ids: string[]): void {
  write(HIDDEN_LEAGUES_KEY, ids);
}
