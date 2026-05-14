'use client';

import { useEffect, useState } from 'react';
import type { StatusResponse } from '@/app/api/dashboard/status/route';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatusSkeleton() {
  return (
    <div className="flex items-center gap-6 animate-pulse" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-3 rounded bg-white/[0.07]" style={{ width: i === 0 ? 160 : 80 }} />
        </div>
      ))}
    </div>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

export interface StatusBarProps {
  className?: string;
}

export default function StatusBar({ className }: StatusBarProps) {
  const [data,    setData]    = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/dashboard/status', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        if (!cancelled) setData((await res.json()) as StatusResponse);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const tre    = data?.treEngine;
  const acc    = data?.dataAccuracy;
  const edge   = data?.edgeOpportunities;
  const sync   = data?.leagueSync;

  const LABEL: React.CSSProperties = {
    fontFamily: 'var(--font-body), Inter, sans-serif',
    fontSize:   12,
    color:      '#64748B',
  };
  const VALUE: React.CSSProperties = {
    fontFamily:  'var(--font-mono), "JetBrains Mono", monospace',
    fontSize:    13,
    fontVariant: 'tabular-nums',
  };
  const SUBLABEL: React.CSSProperties = {
    fontFamily: 'var(--font-body), Inter, sans-serif',
    fontSize:   11,
    color:      '#475569',
  };

  return (
    <div
      className={`w-full border-t py-3 px-6 ${className ?? ''}`}
      style={{
        borderColor:    'rgba(255,255,255,0.06)',
        background:     'rgba(10,13,20,0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {loading ? (
        <StatusSkeleton />
      ) : (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">

          {/* ── Item 1: TRE Engine ──────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Pulsing green dot */}
            <span
              className="rounded-full bg-emerald-400 animate-pulse shrink-0"
              style={{ width: 6, height: 6 }}
              aria-hidden
            />
            <span style={LABEL}>TRE Engine</span>
            <span
              style={{
                ...LABEL,
                color:      '#36E7A1',
                fontWeight: 500,
              }}
            >
              {tre?.status ?? 'Optimal'}
            </span>
            {tre?.lastRun && tre.lastRun !== '—' && (
              <span style={SUBLABEL}>· Last run: {tre.lastRun}</span>
            )}
          </div>

          {/* ── Item 2: Data Accuracy ───────────────────────────── */}
          <div className="flex items-center gap-1.5">
            <span
              style={{ ...VALUE, color: '#36E7A1' }}
            >
              {acc?.pct ?? '—'}
            </span>
            <span style={LABEL}>
              {acc?.label && acc.label !== '—' ? `${acc.label} Accuracy` : 'Data Accuracy'}
            </span>
          </div>

          {/* ── Item 3: Edge Opportunities ──────────────────────── */}
          <div className="flex items-center gap-1.5">
            <span
              style={{ ...VALUE, color: '#22D3EE' }}
            >
              {edge?.count != null ? edge.count : '—'}
            </span>
            <span style={LABEL}>
              {edge?.label && edge.label !== '—' ? edge.label : 'Edge Opportunities'}
            </span>
          </div>

          {/* ── Item 4: League Sync ─────────────────────────────── */}
          <div className="flex items-center gap-1.5">
            <span
              style={{ ...VALUE, color: '#36E7A1' }}
            >
              {sync ? `${sync.connected}/${sync.total}` : '—'}
            </span>
            <span style={LABEL}>
              {sync && sync.connected === sync.total && sync.total > 0
                ? 'All Connected'
                : 'League Sync'}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
