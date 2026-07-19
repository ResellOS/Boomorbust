'use client';

import type { ReactNode } from 'react';
import BetaBanner from '@/components/BetaBanner';
import { SidebarCollapseProvider, useSidebarCollapse } from './SidebarCollapseContext';

type GridVariant = 'default' | 'startsit';

const ROWS: Record<GridVariant, string> = {
  default: '66px 1fr 28px',
  startsit: '58px 1fr 28px',
};

function GridInner({ children, variant }: { children: ReactNode; variant: GridVariant }) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div
      className={`terminal-page-grid h-full overflow-hidden${collapsed ? ' sidebar-collapsed' : ''}`}
      style={{ gridTemplateRows: ROWS[variant] }}
    >
      {children}
    </div>
  );
}

interface TerminalPageGridProps {
  children: ReactNode;
  variant?: GridVariant;
}

export default function TerminalPageGrid({ children, variant = 'default' }: TerminalPageGridProps) {
  return (
    <SidebarCollapseProvider>
      <div className="flex h-full flex-col">
        <BetaBanner />
        <div className="min-h-0 flex-1">
          <GridInner variant={variant}>{children}</GridInner>
        </div>
      </div>
    </SidebarCollapseProvider>
  );
}
