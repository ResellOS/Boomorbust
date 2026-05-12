/**
 * Zustand store for the current user's subscription tier.
 * Fetched once per session from /api/user/tier and cached in memory.
 */

import { create } from 'zustand';
import type { SubscriptionTier } from '@/lib/access/gates';

interface UserTierState {
  /** null = not yet fetched */
  tier: SubscriptionTier | null;
  loading: boolean;
  /** Call once per app boot — subsequent calls are no-ops if already loaded. */
  fetchTier: () => Promise<void>;
}

export const useUserTierStore = create<UserTierState>((set, get) => ({
  tier: null,
  loading: false,

  fetchTier: async () => {
    // Already fetched or in-flight — skip
    if (get().tier !== null || get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch('/api/user/tier');
      if (res.ok) {
        const body = (await res.json()) as { tier: SubscriptionTier };
        set({ tier: body.tier });
      } else {
        // On error, assume free so ads always show (safe default)
        set({ tier: 'free' });
      }
    } catch {
      set({ tier: 'free' });
    } finally {
      set({ loading: false });
    }
  },
}));

/** True when the user is on any paid subscription tier. */
export function isPaidTier(tier: SubscriptionTier | null): boolean {
  return tier === 'pro' || tier === 'elite' || tier === 'all_pro_terminal';
}
