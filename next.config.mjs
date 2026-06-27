import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required on Next 14 so instrumentation.ts (Sentry server init) runs.
  experimental: { instrumentationHook: true },
  // Deploy gate is `tsc --noEmit` (per CLAUDE.md), not ESLint. Lint warnings/unused-var
  // errors should not freeze production deploys — type-checking still runs and blocks.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sleepercdn.com',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'sleepercdn.com',
        pathname: '/content/nfl/players/**',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/i/teamlogos/nfl/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, max-age=0, s-maxage=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Surrogate-Control', value: 'no-store' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
  /** Legacy `/dashboard/*` URLs from older builds → canonical App Router paths (route group omits segment). */
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: false },
      { source: '/dashboard/lineup', destination: '/lineup', permanent: false },
      { source: '/dashboard/lineup/:path*', destination: '/lineup', permanent: false },
      { source: '/dashboard/trade-hub', destination: '/trade', permanent: false },
      { source: '/dashboard/trade', destination: '/trade', permanent: false },
      { source: '/dashboard/trade/:path*', destination: '/trade', permanent: false },
      { source: '/trade-hub', destination: '/trade', permanent: false },
      { source: '/trade-hub/:path*', destination: '/trade', permanent: false },
      { source: '/dashboard/scouting', destination: '/scouting', permanent: false },
      { source: '/dashboard/scouting/:path*', destination: '/scouting', permanent: false },
      { source: '/dashboard/rookies', destination: '/rookies', permanent: false },
      { source: '/dashboard/coach', destination: '/coach', permanent: false },
      { source: '/dashboard/settings', destination: '/settings', permanent: false },
      { source: '/dashboard/waiver-wire', destination: '/waiver-wire', permanent: false },
      { source: '/dashboard/digest', destination: '/digest', permanent: false },
      { source: '/dashboard/wrapped', destination: '/wrapped', permanent: false },
      { source: '/dashboard/rankings/arbitrage', destination: '/arbitrage', permanent: false },
      { source: '/dashboard/rankings', destination: '/arbitrage', permanent: false },
      { source: '/dashboard/blueprint', destination: '/digest', permanent: false },
    ];
  },
};

// Sentry: server-only error monitoring (no client config → frontend not instrumented).
// Source-map upload disabled (no auth token needed; build never fails on its absence).
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
