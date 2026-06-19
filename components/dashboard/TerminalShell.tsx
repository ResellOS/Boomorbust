'use client';

import MobileTabBar from '@/components/nav/MobileTabBar';

export default function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-bg text-text font-figtree md:h-screen md:min-w-[1280px]">
      <div className="min-h-0 flex-1 overflow-hidden pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <MobileTabBar />
    </div>
  );
}
