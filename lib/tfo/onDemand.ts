/**
 * Fire-and-forget TFO pre-warm for new users.
 * Called after Sleeper league sync completes so the dashboard
 * is populated immediately instead of waiting for the nightly cron.
 */

export function triggerOnDemandTFO(cookieHeader: string | null): void {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  fetch(`${siteUrl}/api/onboarding/calculate-tfo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  }).catch(() => { /* intentional fire-and-forget */ });
}
