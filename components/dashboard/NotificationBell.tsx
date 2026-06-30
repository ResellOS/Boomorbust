'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';

export type NotificationFeedType =
  | 'sell_high'
  | 'SELL_HIGH'
  | 'injury'
  | 'injury_risk'
  | 'INJURY_RISK'
  | 'trade_offer'
  | 'TRADE_OFFER'
  | 'boom_signal'
  | 'BOOM_SIGNAL'
  | 'bust_signal'
  | 'BUST_SIGNAL'
  | string;

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationFeedType;
  player_id: string | null;
  league_id: string | null;
  message: string;
  redirects_to: string | null;
  read: boolean;
  created_at: string;
}

function parseMessage(raw: string): { playerName: string; reason: string } {
  const t = raw.trim();
  if (!t) return { playerName: '—', reason: 'No details.' };
  try {
    const j = JSON.parse(t) as { playerName?: string; reason?: string };
    if (j.playerName && j.reason) return { playerName: String(j.playerName), reason: String(j.reason) };
  } catch {
    /* fall through */
  }
  const pipe = t.indexOf('|');
  if (pipe > 0) {
    return { playerName: t.slice(0, pipe).trim() || 'Player', reason: t.slice(pipe + 1).trim() || t };
  }
  return { playerName: 'Player', reason: t };
}

function labelForType(t: string): string {
  const u = t.trim().toLowerCase().replace(/-/g, '_');
  switch (u) {
    case 'sell_high':
      return 'SELL HIGH';
    case 'injury':
    case 'injury_risk':
    case 'mrs':
      return 'INJURY RISK';
    case 'trade_offer':
      return 'TRADE OFFER';
    case 'boom_signal':
    case 'tfo_boom':
      return 'Buy Signal';
    case 'bust_signal':
    case 'tfo_bust':
      return 'Sell Signal';
    default:
      return t.replace(/_/g, ' ').toUpperCase() || 'ALERT';
  }
}

function badgeClassForType(t: string): string {
  const u = t.trim().toLowerCase();
  if (u.includes('sell') || u === 'trade_offer') return 'border-amber-400/35 bg-amber-500/10 text-amber-200';
  if (u.includes('injury') || u === 'mrs') return 'border-rose-400/35 bg-rose-500/10 text-rose-200';
  if (u.includes('trade')) return 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100';
  if (u.includes('boom')) return 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200';
  if (u.includes('bust')) return 'border-red-400/40 bg-red-500/12 text-red-200';
  return 'border-white/12 bg-white/[0.06] text-[#94A3B8]';
}

function defaultHref(row: NotificationRow, playerName: string): string {
  const t = row.type.trim().toLowerCase().replace(/-/g, '_');
  const encName = encodeURIComponent(playerName);
  const pid = row.player_id ?? '';
  const lid = row.league_id ?? '';

  if (t === 'sell_high' || t === 'trade_offer') {
    const q = new URLSearchParams();
    if (pid) q.set('playerId', pid);
    if (lid) q.set('leagueId', lid);
    return `/trade-hub?${q.toString()}`;
  }
  return `/rookies?player=${encName}`;
}

function resolveHref(row: NotificationRow, playerName: string): string {
  const r = row.redirects_to?.trim();
  if (r?.startsWith('/')) return r;
  return defaultHref(row, playerName);
}

export default function NotificationBell() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const [listRes, countRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, user_id, type, player_id, league_id, message, redirects_to, read, created_at')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ]);

    if (listRes.error) {
      setRows([]);
      setUnreadCount(0);
    } else {
      setRows((listRes.data ?? []) as NotificationRow[]);
      const c = countRes.error ? null : countRes.count;
      setUnreadCount(typeof c === 'number' ? c : listRes.data?.length ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
      if (!error) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    },
    [],
  );

  const onOpenItem = useCallback(
    async (row: NotificationRow, href: string) => {
      await markRead(row.id);
      setOpen(false);
      router.push(href);
    },
    [markRead, router],
  );

  const items = useMemo(
    () =>
      rows.map((row) => {
        const { playerName, reason } = parseMessage(row.message);
        const displayName =
          playerName !== 'Player' || !row.player_id ? playerName : `Player ${row.player_id.slice(0, 6)}…`;
        const href = resolveHref(row, displayName);
        return { row, displayName, reason, href };
      }),
    [rows],
  );

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#94A3B8] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {!loading && unreadCount > 0 ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-40" />
            </span>
            <span
              className="notif-badge-count pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[11px] font-bold leading-none text-white font-mono tabular-nums ring-2 ring-[#0a0d14]"
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        ) : null}
      </button>

      {open ? (
        <div
          className={clsx(
            'absolute right-0 z-[80] mt-1 max-h-[min(72vh,420px)] w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0d14] sm:w-[min(100vw-2rem,24rem)]',
          )}
          style={{ boxShadow: '0 0 28px rgba(34,211,238,0.12)' }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#64748B]">
              Inbox
            </span>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#64748B]" /> : null}
          </div>
          <ul className="slim-scroll max-h-[min(64vh,360px)] overflow-y-auto p-2">
            {!loading && items.length === 0 ? (
              <li className="px-2 py-6 text-center font-mono text-[12px] text-[#64748B]">No unread alerts.</li>
            ) : null}
            {items.map(({ row, displayName, reason, href }) => (
              <li key={row.id} className="mb-2 last:mb-0">
                <button
                  type="button"
                  onClick={() => void onOpenItem(row, href)}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-left transition hover:border-white/[0.12] hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-[13px] font-semibold text-white">{displayName}</p>
                    <span
                      className={clsx(
                        'shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider font-mono',
                        badgeClassForType(String(row.type)),
                      )}
                    >
                      {labelForType(String(row.type))}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#94A3B8] font-mono">{reason}</p>
                  <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wide text-[#22D3EE] font-mono">
                    Open
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/[0.06] px-2 py-2 text-center">
            <Link
              href="/trade-hub"
              className="font-mono text-[11px] font-bold uppercase tracking-wide text-[#64748B] hover:text-[#22D3EE]"
              onClick={() => setOpen(false)}
            >
              Trade hub
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
