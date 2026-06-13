'use client';

import { useMemo, useState } from 'react';
import { formatTimeAgo } from '@/lib/dashboard/fetchDashboardNews';
import type { DashboardNewsItem } from '@/lib/dashboard/rotation';

interface DynastyNewsFeedProps {
  items: DashboardNewsItem[];
  rosterPlayerIds?: Set<string>;
  allMode?: boolean;
}

function NewsModal({
  item,
  onClose,
}: {
  item: DashboardNewsItem;
  onClose: () => void;
}) {
  const [iframeBlocked, setIframeBlocked] = useState(false);

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
          <div className="font-figtree text-[13px] font-semibold text-text">{item.headline}</div>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted">
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
              <p className="font-figtree text-[12px] text-muted">
                This article cannot be embedded. Open it in a new tab.
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-boom/40 px-4 py-2 font-figtree text-[12px] text-boom no-underline hover:bg-boom/10"
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
            className="font-mono text-[10px] text-boom no-underline hover:underline"
          >
            Open in new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1 font-figtree text-[11px] text-muted hover:text-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DynastyNewsFeed({ items, rosterPlayerIds, allMode = false }: DynastyNewsFeedProps) {
  const [modalItem, setModalItem] = useState<DashboardNewsItem | null>(null);

  const visible = useMemo(() => {
    const filtered = allMode
      ? items
      : items.filter((i) => !i.playerId || rosterPlayerIds?.has(i.playerId));
    return filtered.slice(0, 4);
  }, [items, rosterPlayerIds, allMode]);

  return (
    <>
      <div className="flex shrink-0 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
          <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
            Dynasty News Feed
          </span>
          <span className="font-mono text-[10px] text-boom">● LIVE</span>
        </div>
        <div className="overflow-hidden">
          {visible.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-muted">No news for this league yet.</div>
          ) : (
            visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.url.startsWith('http')) setModalItem(item);
                  else window.open(item.url, '_blank');
                }}
                className="grid w-full cursor-pointer grid-cols-[32px_1fr_auto] items-start gap-[5px] border-b border-border/40 px-3 py-[7px] text-left transition-colors last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="pt-px font-mono text-[10px] text-muted">
                  {formatTimeAgo(item.publishedAt)}
                </span>
                <span className="truncate font-figtree text-[11px] leading-snug text-text">
                  <span className="font-semibold" style={{ color: item.highlightColor }}>
                    {item.playerHighlight}
                  </span>{' '}
                  {item.headline.replace(item.playerHighlight, '').trim() || item.headline}
                </span>
                <span className="whitespace-nowrap rounded-full border border-border/60 bg-bg px-1.5 py-0.5 font-mono text-[8px] text-muted">
                  {item.source}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      {modalItem && <NewsModal item={modalItem} onClose={() => setModalItem(null)} />}
    </>
  );
}
