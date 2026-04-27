'use client';

import { ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { sleeperLeagueUrl } from '@/lib/sleeper/deeplinks';

interface Props {
  leagueId: string;
  variant?: 'button' | 'link' | 'icon';
  className?: string;
}

export default function OpenInSleeper({ leagueId, variant = 'button', className }: Props) {
  const href = sleeperLeagueUrl(leagueId);

  const handleClick = (e: React.MouseEvent) => e.stopPropagation();

  if (variant === 'icon') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        title="Open in Sleeper"
        className={clsx('text-[#475569] hover:text-white transition-colors', className)}
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    );
  }

  if (variant === 'link') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={clsx('inline-flex items-center gap-1 text-xs text-[#6366F1] hover:text-white transition-colors', className)}
      >
        Open in Sleeper <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center gap-2 bg-[#1E293B] hover:bg-[#2D3F55]',
        'border border-white/10 hover:border-white/25',
        'text-[#CBD5E1] hover:text-white text-xs font-semibold',
        'px-3 py-2 rounded-lg transition-all',
        className
      )}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      Open in Sleeper
    </a>
  );
}
