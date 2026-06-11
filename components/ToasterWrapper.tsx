'use client';

import dynamic from 'next/dynamic';

const Toaster = dynamic(() => import('sonner').then((m) => m.Toaster), { ssr: false });

export default function ToasterWrapper() {
  return (
    <Toaster
      theme="dark"
      richColors
      position="top-right"
      toastOptions={{
        style: {
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#F8FAFC',
        },
      }}
    />
  );
}
