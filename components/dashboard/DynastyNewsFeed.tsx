'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PulsingDot from '@/components/ui/PulsingDot';
import { formatTimeAgo } from '@/lib/dashboard/fetchDashboardNews';
import { playerHubHref } from '@/lib/dashboard/dashboardRoutes';
import type { DashboardNewsItem } from '@/lib/dashboard/rotation';

interface DynastyNewsFeedProps {
  items: DashboardNewsItem[];
  rosterPlayerIds?: Set<string>;
  allMode?: boolean;
  title?: string;
}

function impactLine(item: DashboardNewsItem): string | null {
  if (item.headline.toLowerCase().includes('injur')) {
    return `Impact: Monitor ${item.playerHighlight} availability and backups.`;
  }
  if (item.headline.toLowerCase().includes('sign') || item.headline.toLowerCase().includes('trade')) {
    return `Impact: ${item.playerHighlight} projection may shift — review exposure.`;
  }
  if (item.playerHighlight) {
    return `Impact: Review ${item.playerHighlight} role and target share.`;
  }
  return null;
}

function affectedAssets(item: DashboardNewsItem): string[] {
  const names: string[] = [];
  if (item.playerHighlight) names.push(item.playerHighlight);
  return names;
}

function NewsModal({
  item,
  onClose,
}: {
  item: DashboardNewsItem;
  onClose: () => void;
}) {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const impact = impactLine(item);
  const assets = affectedAssets(item);

  useEffect(() => {
    const onEsc = () => onClose();
    window.addEventListener('dashboard:escape', onEsc);
    return () => window.removeEventListener('dashboard:escape', onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="border-b border-border px-4 py-3">
          <div className="font-figtree text-[14px] font-semibold text-text">{item.headline}</div>
          {impact ? (
            <p className="mt-1.5 font-mono text-[11px] leading-snug text-[#9aa8c4]">{impact}</p>
          ) : null}
          {assets.length > 0 ? (
            <div className="mt-2">
              <div className="font-mono text-[9px] uppercase tracking-wide text-muted">Affected Assets</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {assets.map((name) =>
                  item.playerId ? (
                    <Link
                      key={name}
                      href={playerHubHref(item.playerId)}
                      className="rounded border border-boom/30 bg-boom/10 px-2 py-0.5 font-figtree text-[11px] text-boom no-underline hover:border-boom/50"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span
                      key={name}
                      className="rounded border border-border px-2 py-0.5 font-figtree text-[11px] text-text"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{item.source}</span>
            <span>·</span>
            <span>{formatTimeAgo(item.publishedAt)} ago</span>
          </div>
        </div>
        <div className="min-h-[200px] flex-1 bg-bg">
          {!iframeBlocked ? (
            <iframe
              src={item.url}
              title={item.headline}
              className="h-[50vh] w-full border-0"
              onError={() => setIframeBlocked(true)}
            />
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-figtree text-[13px] text-muted">
                This article cannot be embedded. Open it in a new tab.
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="dash-action-btn rounded-md border border-boom/40 px-4 py-2 font-figtree text-[13px] text-boom no-underline"
              >
                Read full article
              </a>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-boom no-underline hover:underline"
          >
            Open in new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1 font-figtree text-[12px] text-muted hover:text-text"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DynastyNewsFeed({
  items,
  rosterPlayerIds,
  allMode = false,
  title = 'News That Matters',
}: DynastyNewsFeedProps) {
  const [modalItem, setModalItem] = useState<DashboardNewsItem | null>(null);

  const closeModal = useCallback(() => setModalItem(null), []);

  const visible = useMemo(() => {
    const pool = allMode
      ? items
      : items.filter((i) => Boolean(i.playerId) && rosterPlayerIds?.has(i.playerId!));
    return pool
      .filter((item) => item.playerId || impactLine(item))
      .slice(0, 4);
  }, [items, rosterPlayerIds, allMode]);

  if (visible.length === 0) return null;

  return (
    <>
      <div className="flex shrink-0 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
          <span className="font-figtree text-[11px] uppercase tracking-[1.5px] text-text">{title}</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-boom">
            <PulsingDot color="#EF4444" size={6} />
            LIVE
          </span>
        </div>
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => {
            const impact = impactLine(item);
            const assets = affectedAssets(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.url.startsWith('http')) setModalItem(item);
                  else window.open(item.url, '_blank');
                }}
                className="group dash-clickable-row flex w-full cursor-pointer flex-col border-b border-r border-border/40 px-3 py-3 text-left last:border-b-0 md:border-b-0"
              >
                <span className="font-figtree text-[12px] font-semibold leading-snug text-text">
                  {item.headline}
                </span>
                {impact ? (
                  <span className="mt-1.5 font-mono text-[10px] italic leading-snug text-boom">{impact}</span>
                ) : null}
                {assets.length > 0 ? (
                  <div className="dash-news-hover-reveal">
                    <div className="font-mono text-[8px] uppercase tracking-wide text-muted">Affected</div>
                    <div className="font-figtree text-[11px] text-boom">{assets.join(' · ')}</div>
                  </div>
                ) : null}
                <span className="mt-2 font-mono text-[9px] text-muted">{formatTimeAgo(item.publishedAt)} ago</span>
              </button>
            );
          })}
        </div>
      </div>
      {modalItem && <NewsModal item={modalItem} onClose={closeModal} />}
    </>
  );
}
