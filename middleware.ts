import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkPresetRateLimit,
  clientIpFromHeaders,
  rateLimit429Response,
  type RateLimitPreset,
} from '@/lib/rateLimit/general';
import { updateSession } from '@/lib/supabase/middleware';

function presetForPath(pathname: string): RateLimitPreset | null {
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/sync/')) return 'sync';
  if (pathname.startsWith('/api/feedback')) return 'feedback';
  return null;
}

export async function middleware(request: NextRequest) {
  // Always refresh Supabase session cookies before Server Components run.
  let response = await updateSession(request);

  const preset = presetForPath(request.nextUrl.pathname);
  if (!preset) return response;

  const ip = clientIpFromHeaders(request.headers);
  const result = await checkPresetRateLimit(preset, ip);

  if (!result.allowed) {
    return NextResponse.json(rateLimit429Response(result), {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    });
  }

  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return response;
}

export const config = {
  matcher: [
    /*
     * Session refresh on all app routes; skip static assets.
     * Rate limits still apply only to auth/sync/feedback API paths above.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
