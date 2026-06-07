'use client';

import { useEffect, useRef, useState } from 'react';

export interface NewsItem {
  timestamp: string;
  playerHighlight: string;
  highlightColor: string;
  text: string;
  source: string;
  url: string;
}

const PLACEHOLDER_NEWS: NewsItem[] = [
  {
    timestamp: '8m',
    playerHighlight: "Ja'Marr Chase (WR CIN)",
    highlightColor: '#36E7A1',
    text: ' Expected to play Sunday, full practice',
    source: 'Sleeper',
    url: 'https://sleeper.com',
  },
  {
    timestamp: '12m',
    playerHighlight: 'Puka Nacua (WR LAR)',
    highlightColor: '#FBBF24',
    text: ' Limited in practice with knee',
    source: 'NFL.com',
    url: 'https://nfl.com',
  },
  {
    timestamp: '35m',
    playerHighlight: 'Trey Benson (RB ARI)',
    highlightColor: '#36E7A1',
    text: ' Seeing increased 1st team reps',
    source: 'Sleeper',
    url: 'https://sleeper.com',
  },
  {
    timestamp: '1h',
    playerHighlight: 'Rashee Rice (WR KC)',
    highlightColor: '#36E7A1',
    text: ' Expected to return in Week 9',
    source: 'ESPN',
    url: 'https://espn.com',
  },
  {
    timestamp: '2h',
    playerHighlight: 'Caleb Williams (QB CHI)',
    highlightColor: '#FBBF24',
    text: ' Progressing well in rehab',
    source: 'CBS Sports',
    url: 'https://cbssports.com',
  },
  {
    timestamp: '3h',
    playerHighlight: 'Keenan Allen (WR NE)',
    highlightColor: '#A78BFA',
    text: ' Questionable, missed Thursday practice',
    source: 'NFL.com',
    url: 'https://nfl.com',
  },
  {
    timestamp: '4h',
    playerHighlight: 'Drake London (WR ATL)',
    highlightColor: '#A78BFA',
    text: ' Snap count reduced amid offense struggles',
    source: 'ESPN',
    url: 'https://espn.com',
  },
  {
    timestamp: '5h',
    playerHighlight: 'Malik Nabers (WR NYG)',
    highlightColor: '#36E7A1',
    text: ' Posted career-high 12 targets last week',
    source: 'Sleeper',
    url: 'https://sleeper.com',
  },
];

const VISIBLE_COUNT = 6;

export default function DynastyNewsFeed({ items = PLACEHOLDER_NEWS }: { items?: NewsItem[] }) {
  const [queue, setQueue] = useState(items.slice(0, VISIBLE_COUNT));
  const nextIdxRef = useRef(VISIBLE_COUNT % items.length);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueue((prev) => {
        const next = items[nextIdxRef.current % items.length];
        nextIdxRef.current = (nextIdxRef.current + 1) % items.length;
        return [...prev.slice(1), next];
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [items]);

  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
        <span className="font-figtree text-[9.5px] font-bold uppercase tracking-[1.5px] text-text">
          Dynasty News Feed
        </span>
        <span className="font-mono text-[8px] text-boom">● LIVE</span>
      </div>
      <div className="overflow-hidden">
        {queue.map((item, i) => (
          <div
            key={`${item.timestamp}-${item.playerHighlight}-${i}`}
            className="grid grid-cols-[26px_1fr_auto] items-start gap-[5px] border-b border-border/40 px-3 py-[5px] transition-opacity duration-400 last:border-b-0"
            style={{ opacity: i === 0 ? 1 : 1 }}
          >
            <span className="pt-px font-mono text-[8px] text-muted">{item.timestamp}</span>
            <span className="font-figtree text-[10px] leading-snug text-text">
              <span className="font-semibold" style={{ color: item.highlightColor }}>
                {item.playerHighlight}
              </span>
              {item.text}
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap pt-px font-mono text-[8px] text-muted no-underline hover:text-boom"
            >
              {item.source}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
