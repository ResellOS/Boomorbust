import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-tactical',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Boom or Bust — Dynasty Fantasy Football Intelligence',
    template: 'Boom or Bust · %s',
  },
  description:
    'Manage your dynasty leagues like a portfolio. Sit/start decisions, trade analysis, and dynasty scouting powered by the TFO formula.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://boomorbust.app'
  ),
  openGraph: {
    title: 'Boom or Bust',
    description: 'Dynasty fantasy football intelligence platform',
    type: 'website',
    url: 'https://boomorbust.app',
    siteName: 'Boom or Bust',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boom or Bust',
    description: 'Dynasty fantasy football intelligence platform',
  },
  applicationName: 'Boom or Bust',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#080B14',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  return (
    <html lang="en">
      <head>
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${bebasNeue.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F8FAFC',
            },
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}