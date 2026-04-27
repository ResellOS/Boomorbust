/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sleepercdn.com',
        pathname: '/avatars/**',
      },
    ],
  },
};

export default nextConfig;
