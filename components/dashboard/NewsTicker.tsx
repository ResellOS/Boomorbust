'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { NewsItem, NewsResponse } from '@/app/api/dashboard/news/route';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 animate-pulse"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      aria-hidden
    >
      {/* Timestamp */}
      <div className="h-3 w-7 rounded bg-white/[0.07] shrink-0" />
      {/* Headline */}
      <div className="h-3 flex-1 rounded bg-white/[0.06]" />
      {/* Source */}
      <div className="h-3 w-14 rounded bg-white/[0.05] shrink-0" />
    </div>
  );
}

// ─── News row ─────────────────────────────────────────────────────────────────

function NewsRow({ item, isLast }: { item: NewsItem; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 cursor-pointer"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background:   hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="article"
      aria-label={item.headline}
    >
      {/* Timestamp */}
      <span
        className="shrink-0"
        style={{
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:   11,
          color:      '#64748B',
          minWidth:   32,
        }}
      >
        {item.timestamp}
      </span>

      {/* Headline */}
      <span
        className="flex-1 min-w-0 truncate leading-snug"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize:   13,
          color:      '#ffffff',
        }}
        title={item.headline}
      >
        {item.headline}
      </span>

      {/* Source */}
      <span
        className="shrink-0 ml-2"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize:   11,
          color:      '#64748B',
        }}
      >
        {item.source}
      </span>
    </div>
  );
}

// ─── NewsTicker ───────────────────────────────────────────────────────────────

export interface NewsTickerProps {
  className?: string;
}

export default function NewsTicker({ className }: NewsTickerProps) {
  const [items,   setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/dashboard/news?limit=4', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as NewsResponse;
        if (!cancelled) setItems(json.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <section
      className={`rounded-xl overflow-hidden ${className ?? ''}`}
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="uppercase tracking-widest"
          style={{
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      12,
            color:         '#64748B',
            letterSpacing: '0.1em',
          }}
        >
          News Ticker
        </span>
        <Link
          href="/digest"
          className="transition-colors duration-150 hover:underline"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   12,
            color:      '#22D3EE',
          }}
        >
          View Full News →
        </Link>
      </div>

      {/* List */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} isLast={i === 3} />
        ))
      ) : items.length === 0 ? (
        <div
          className="px-4 py-8 text-center"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   13,
            color:      '#64748B',
          }}
        >
          No news items available.
        </div>
      ) : (
        items.map((item, i) => (
          <NewsRow key={item.id} item={item} isLast={i === items.length - 1} />
        ))
      )}
    </section>
  );
}
