import type { ReactNode } from 'react';

type GridVariant = 'default' | 'startsit';

const ROWS: Record<GridVariant, string> = {
  default: '66px 1fr 28px',
  startsit: '58px 1fr 28px',
};

interface TerminalPageGridProps {
  children: ReactNode;
  variant?: GridVariant;
}

export default function TerminalPageGrid({ children, variant = 'default' }: TerminalPageGridProps) {
  return (
    <div
      className="terminal-page-grid h-full overflow-hidden"
      style={{ gridTemplateRows: ROWS[variant] }}
    >
      {children}
    </div>
  );
}
