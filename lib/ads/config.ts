export type AdPlacement = 'dashboard-sidebar' | 'trade-history' | 'player-hub';

/** AdSense publisher / client id (ca-pub-…). */
export function getAdSenseClientId(): string | null {
  return (
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ??
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ??
    null
  );
}

export function getAdSlotId(placement: AdPlacement): string | null {
  switch (placement) {
    case 'dashboard-sidebar':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_SIDEBAR ?? null;
    case 'trade-history':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_TRADE_HISTORY ?? null;
    case 'player-hub':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLAYER_HUB ?? null;
  }
}

export function getAdConfig(placement: AdPlacement): {
  clientId: string | null;
  slotId: string | null;
} {
  return {
    clientId: getAdSenseClientId(),
    slotId: getAdSlotId(placement),
  };
}

/** Env vars required to enable AdSense (for setup docs / logging). */
export const ADSENSE_SETUP_ENV = [
  'NEXT_PUBLIC_ADSENSE_CLIENT_ID',
  'NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_SIDEBAR',
  'NEXT_PUBLIC_ADSENSE_SLOT_TRADE_HISTORY',
  'NEXT_PUBLIC_ADSENSE_SLOT_PLAYER_HUB',
] as const;
