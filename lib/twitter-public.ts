/** Public landing URLs — set NEXT_PUBLIC_TWITTER_HANDLE and/or NEXT_PUBLIC_TWITTER_URL in env. */

const rawHandle = (process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? 'YourHandle').replace(/^@/, '');

export const TWITTER_PROFILE_HREF =
  typeof process.env.NEXT_PUBLIC_TWITTER_URL === 'string' &&
  process.env.NEXT_PUBLIC_TWITTER_URL.startsWith('http')
    ? process.env.NEXT_PUBLIC_TWITTER_URL
    : `https://twitter.com/${rawHandle}`;

export const TWITTER_AT_DISPLAY = `@${rawHandle}`;
