import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Public marketing `/` uses no Supabase SSR — skipping middleware avoids edge failures
  // when env is misconfigured and reduces cache oddities on the homepage.
  if (request.nextUrl.pathname === '/') {
    const res = NextResponse.next({ request });
    // Must match next.config.mjs — tell browsers + Vercel edge not to reuse HTML/RSC for `/`
    res.headers.set(
      'Cache-Control',
      'no-store, no-cache, max-age=0, s-maxage=0, must-revalidate'
    );
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Surrogate-Control', 'no-store');
    res.headers.set('CDN-Cache-Control', 'no-store');
    res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return res;
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return supabaseResponse;
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.getUser();

    return supabaseResponse;
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
