import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** OAuth code exchange (Google / Apple) → session cookie → app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, url.origin));
      }
      console.error('[auth/callback] exchange error:', error);
    } catch (err) {
      console.error('[auth/callback] failed:', err);
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=oauth', url.origin));
}
