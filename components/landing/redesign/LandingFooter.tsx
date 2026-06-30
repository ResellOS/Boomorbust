import Link from 'next/link';
import { TWITTER_PROFILE_HREF } from '@/lib/twitter-public';
import { LANDING } from './constants';

export default function LandingFooter() {
  return (
    <footer style={{ background: LANDING.bg }}>
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-figtree text-[13px] text-[#e8ecf4]/50">
          <Link href="/privacy" className="hover:text-[#e8ecf4]/80">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#e8ecf4]/80">
            Terms of Service
          </Link>
          <a href={TWITTER_PROFILE_HREF} className="hover:text-[#e8ecf4]/80" target="_blank" rel="noopener noreferrer">
            @boomorbustapp
          </a>
        </div>
        <p className="mt-4 text-center font-figtree text-[12px] text-[#e8ecf4]/40">
          © 2026 SaaSylum. All rights reserved.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-center font-figtree text-[11px] leading-relaxed text-[#e8ecf4]/35">
          Boom or Bust is an analytical tool. Past performance does not guarantee future results.
        </p>
      </div>
    </footer>
  );
}
