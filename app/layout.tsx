import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: 'The Front Office',
    template: '%s | The Front Office',
  },
  description: 'Manage your dynasty like a front office. Trade analysis, injury alerts, AI coaching, and more.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thefrontoffice.app'),
  openGraph: {
    title: 'The Front Office',
    description: 'Manage your dynasty like a front office.',
    type: 'website',
    siteName: 'The Front Office',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Front Office',
    description: 'Manage your dynasty like a front office.',
  },
  applicationName: 'The Front Office',
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1E293B',
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
