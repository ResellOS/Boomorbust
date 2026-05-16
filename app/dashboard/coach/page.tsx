'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  ArrowLeftRight,
  Crown,
  ExternalLink,
  Loader2,
  Menu,
  MessageSquarePlus,
  PanelRightClose,
  Send,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: number;
}

interface CoachSession {
  id: string;
  preview: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface HistoryFile {
  sessions: CoachSession[];
  activeId: string | null;
}

function historyKey(uid: string) {
  return `bb_coach_history_${uid}`;
}

function loadHistory(uid: string): HistoryFile {
  try {
    const raw = globalThis.localStorage?.getItem(historyKey(uid));
    if (!raw) return { sessions: [], activeId: null };
    const parsed = JSON.parse(raw) as HistoryFile;
    if (!parsed.sessions?.length) return { sessions: [], activeId: null };
    return parsed;
  } catch {
    return { sessions: [], activeId: null };
  }
}

function persistHistory(uid: string, data: HistoryFile) {
  const trimmed: CoachSession[] = [...data.sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);
  const ids = new Set(trimmed.map((s) => s.id));
  const activeId = data.activeId && ids.has(data.activeId) ? data.activeId : trimmed[0]?.id ?? null;
  globalThis.localStorage?.setItem(historyKey(uid), JSON.stringify({ sessions: trimmed, activeId }));
}

interface SleeperPlayerRow {
  full_name?: string;
  position?: string;
  team?: string | null;
  age?: number | null;
}

function formatTime(at: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(at));
  } catch {
    return '';
  }
}

function formatSessionTs(at: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at));
  } catch {
    return '';
  }
}

function parsePlayerFragments(
  text: string,
  sorted: Array<{ ln: string; id: string }>,
  renderLink: (id: string, label: string) => ReactNode
): ReactNode {
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    let bestLen = 0;
    let bestId = '';
    for (const { ln, id } of sorted) {
      if (text.length - i < ln.length) continue;
      const sub = text.slice(i, i + ln.length);
      if (sub.localeCompare(ln, undefined, { sensitivity: 'accent' }) !== 0) continue;
      const beforeCh = i > 0 ? text[i - 1] : '';
      const afterCh = i + ln.length < text.length ? text[i + ln.length] : '';
      const beforeOk = i === 0 || !/[A-Za-z0-9'’]/.test(beforeCh);
      const afterOk = i + ln.length >= text.length || !/[A-Za-z']/i.test(afterCh);
      if (beforeOk && afterOk && ln.length > bestLen) {
        bestLen = ln.length;
        bestId = id;
      }
    }
    if (bestLen > 0 && bestId) {
      const label = text.slice(i, i + bestLen);
      parts.push(<span key={key++}>{renderLink(bestId, label)}</span>);
      i += bestLen;
    } else {
      parts.push(
        <span key={key++} className="whitespace-pre">
          {text[i]}
        </span>
      );
      i += 1;
    }
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function CoachMessageBody({
  content,
  nameIndex,
  onPlayerClick,
}: {
  content: string;
  nameIndex: Array<{ ln: string; id: string }>;
  onPlayerClick: (id: string) => void;
}) {
  const link = useCallback(
    (id: string, label: string) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPlayerClick(id);
        }}
        className="underline decoration-[var(--indigo)] decoration-2 underline-offset-2 text-[var(--indigo-light)] hover:text-white font-medium cursor-pointer bg-transparent border-0 p-0 inline"
      >
        {label}
      </button>
    ),
    [onPlayerClick]
  );

  if (!nameIndex.length) return <span className="whitespace-pre-wrap break-words">{content}</span>;
  return <span className="whitespace-pre-wrap break-words">{parsePlayerFragments(content, nameIndex, link)}</span>;
}

async function fetchKtcByName(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const res = await fetch('/api/values');
    if (!res.ok) return map;
    const arr = (await res.json()) as Array<{ player_name?: string; ktc_value?: number }>;
    for (const r of arr ?? []) {
      if (!r.player_name) continue;
      map.set(r.player_name.toLowerCase(), r.ktc_value ?? 0);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export default function CoachPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<'free' | 'pro' | 'elite' | 'all_pro_terminal'>('free');
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState('');
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [proUsedToday, setProUsedToday] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeGive, setTradeGive] = useState('');
  const [tradeGet, setTradeGet] = useState('');
  const [modalPlayer, setModalPlayer] = useState<{ id: string; ktc?: number } | null>(null);
  const [modalData, setModalData] = useState<{ p?: SleeperPlayerRow; bbv?: number } | null>(null);
  const ktcRef = useRef<Map<string, number> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const leagueLabel = useMemo(() => {
    if (selectedLeague === 'all') {
      if (leagues.length > 1) return 'all synced leagues';
      return leagues[0]?.name ?? 'your league';
    }
    return leagues.find((l) => l.id === selectedLeague)?.name ?? 'your league';
  }, [leagues, selectedLeague]);

  /** player name lowercase -> id built from Sleeper roster */
  const [namePairs, setNamePairs] = useState<Array<{ ln: string; id: string }>>([]);

  useEffect(() => {
    async function bootstrap() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, lgRes] = await Promise.all([
        supabase.from('profiles').select('subscription_tier, is_paid').eq('id', user.id).single(),
        supabase.from('leagues').select('id, name'),
      ]);

      const r = ((profile as { subscription_tier?: string } | null)?.subscription_tier ?? '').toLowerCase();
      const t: 'free' | 'pro' | 'elite' | 'all_pro_terminal' =
        r === 'all_pro_terminal' || r === 'all_pro' ? 'all_pro_terminal'
        : r === 'elite' || r === 'veteran' ? 'elite'
        : r === 'pro' || r === 'rookie' || profile?.is_paid ? 'pro'
        : 'free';
      setTier(t);

      const lgs = (lgRes.data ?? []).map((l) => ({ id: l.id, name: l.name }));
      setLeagues(lgs);

      const rostersAll = (
        await Promise.all(
          lgs.map(async (l) => {
            const { data } = await supabase.from('rosters').select('players').eq('league_id', l.id).maybeSingle();
            return (data?.players ?? []) as string[];
          })
        )
      ).flat();

      const idSet = Array.from(new Set(rostersAll));

      if (!idSet.length) {
        setNamePairs([]);
      } else {
        const qs = `/api/players?ids=${idSet.slice(0, 200).join(',')}`;
        try {
          const pr = await fetch(qs);
          const blob = (await pr.json()) as Record<string, SleeperPlayerRow>;
          const pairs: Array<{ ln: string; id: string }> = [];
          for (const sid of Object.keys(blob)) {
            const n = blob[sid]?.full_name?.trim();
            if (n)
              pairs.push({
                ln: n.toLowerCase(),
                id: sid,
              });
          }
          pairs.sort((a, b) => b.ln.length - a.ln.length);
          setNamePairs(pairs);
        } catch {
          setNamePairs([]);
        }
      }

      const today = new Date().toISOString().slice(0, 10);
      if (t === 'pro') {
        const { data: usage } = await supabase
          .from('coach_usage')
          .select('message_count')
          .eq('user_id', user.id)
          .eq('usage_date', today)
          .maybeSingle();
        const u = typeof usage?.message_count === 'number' ? usage.message_count : 0;
        setProUsedToday(u);
      } else {
        setProUsedToday(null);
      }

      const hist = loadHistory(user.id);
      if (hist.sessions.length === 0) {
        const ns: CoachSession = {
          id: crypto.randomUUID(),
          preview: 'New conversation',
          updatedAt: Date.now(),
          messages: [],
        };
        persistHistory(user.id, { sessions: [ns], activeId: ns.id });
        setSessions([ns]);
        setActiveId(ns.id);
        setMessages([]);
      } else {
        setSessions(hist.sessions);
        const aid = hist.activeId && hist.sessions.some((s) => s.id === hist.activeId) ? hist.activeId : hist.sessions[0]?.id ?? null;
        setActiveId(aid);
        const cur = hist.sessions.find((s) => s.id === aid);
        setMessages(cur?.messages ?? []);
      }
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** persist when messages mutate */
  const persistDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPersist = useCallback((nextSessions: CoachSession[], nextActive: string | null) => {
    if (!userId) return;
    persistHistory(userId, { sessions: nextSessions, activeId: nextActive });
  }, [userId]);

  const updateSessionMessages = useCallback(
    (nextMsgs: ChatMessage[]) => {
      setMessages(nextMsgs);
      if (!activeId || !userId) return;
      const first = nextMsgs.find((m) => m.role === 'user');
      const preview = first?.content?.slice(0, 72) ?? 'Empty chat';
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: nextMsgs, preview, updatedAt: Date.now() }
            : s
        );
        if (persistDebouncedRef.current) clearTimeout(persistDebouncedRef.current);
        persistDebouncedRef.current = setTimeout(() => flushPersist(next, activeId), 200);
        return next;
      });
    },
    [activeId, userId, flushPersist]
  );

  async function refreshProUsage(uid: string) {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from('coach_usage')
      .select('message_count')
      .eq('user_id', uid)
      .eq('usage_date', today)
      .maybeSingle();
    const u = typeof usage?.message_count === 'number' ? usage.message_count : 0;
    setProUsedToday(u);
  }

  const openModal = useCallback(
    async (playerId: string) => {
      setModalPlayer({ id: playerId });
      setModalData(null);
      try {
        if (!ktcRef.current) ktcRef.current = await fetchKtcByName();
        const pr = await fetch(`/api/players?ids=${playerId}`);
        const pj = (await pr.json()) as Record<string, SleeperPlayerRow>;
        const bb = await fetch(`/api/bbv?ids=${playerId}`);
        const bj = (await bb.json()) as Record<string, number>;
        const p = pj[playerId];
        const name = p?.full_name?.toLowerCase() ?? '';
        const ktc = ktcRef.current?.get(name) ?? 0;
        setModalData({ p, bbv: bj[playerId] });
        setModalPlayer({ id: playerId, ktc });
      } catch {
        setModalData({});
      }
    },
    []
  );

  async function send(opts?: string) {
    const text = (opts ?? input).trim();
    if (!text || streaming || !userId) return;
    if (tier === 'free') return;

    setInput('');
    setTradeOpen(false);
    setError('');

    const snapshot = messages;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      at: Date.now(),
    };
    const isFirstInclude = snapshot.length === 0;
    const pending = [...snapshot, userMsg];
    updateSessionMessages(pending);

    setStreaming(true);
    setStreamText('');

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: pending.map((m) => ({ role: m.role, content: m.content })),
          includeContext: isFirstInclude,
          league_id: selectedLeague === 'all' ? null : selectedLeague,
        }),
      });

      if (res.status === 403) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j?.error === 'string' ? j.error : 'Upgrade required.');
        updateSessionMessages(snapshot);
        return;
      }

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Daily limit reached.');
        updateSessionMessages(snapshot);
        return;
      }

      if (!res.ok || !res.body) {
        setError('Something went wrong. Try again.');
        updateSessionMessages(snapshot);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = '';
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const si = carry.indexOf('\x00');
        if (si !== -1) {
          assistantText = carry.slice(0, si);
          setStreamText(assistantText);
          const jsonPart = carry.slice(si + 1);
          try {
            JSON.parse(jsonPart);
          } catch {
            /* sentinel only */
          }
          if (userId) await refreshProUsage(userId);
          break;
        }
        setStreamText(carry);
      }

      if (!carry.includes('\x00') && carry.length) {
        assistantText = carry;
      }

      const asst: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText.trim(),
        at: Date.now(),
      };
      updateSessionMessages([...pending, asst]);
      setStreamText('');
    } catch {
      setError('Connection error.');
      updateSessionMessages(snapshot);
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function newChat() {
    if (!userId) return;
    const ns: CoachSession = {
      id: crypto.randomUUID(),
      preview: 'New conversation',
      updatedAt: Date.now(),
      messages: [],
    };
    const nextSessions = [ns, ...sessions];
    persistHistory(userId, { sessions: nextSessions, activeId: ns.id });
    setSessions(nextSessions.slice(0, 10));
    setActiveId(ns.id);
    setMessages([]);
    setDrawerOpen(false);
  }

  function selectSession(id: string) {
    const s = sessions.find((x) => x.id === id);
    if (!s || !userId) return;
    setActiveId(id);
    setMessages(s.messages);
    persistHistory(userId, { sessions, activeId: id });
    setDrawerOpen(false);
  }

  const showEmptyState = messages.length === 0 && !streaming && !streamText;

  function applyTextareaGrowth(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    const max = 120;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }

  const rateLimited =
    tier === 'pro' &&
    typeof proUsedToday === 'number' &&
    proUsedToday >= 10;

  return (
    <AppBackground intensity="full">
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        {/* Page title row */}
        <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4 shrink-0 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)]">
          <div>
            <h1 className="display text-[48px] leading-none text-[var(--text-primary)] uppercase tracking-[0.04em]">
              DYNASTY ANALYST
            </h1>
            <p className="mt-2 text-[var(--text-secondary)] text-sm md:text-base max-w-xl">
              Formula-powered dynasty advice. Plain English, no fluff.
            </p>
          </div>
          <button
            type="button"
            aria-label="Open conversations"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium"
          >
            <Menu className="w-5 h-5" /> Chats
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-[30%] max-w-[360px] flex-col shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)]/50">
            <div className="p-4 space-y-3 sticky top-[72px] self-start w-full">
              <button
                type="button"
                onClick={newChat}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 text-white font-semibold text-sm shadow-[var(--shadow-glow)] transition"
              >
                <MessageSquarePlus className="w-5 h-5 shrink-0" />
                New Chat
              </button>

              {tier === 'free' ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                    Upgrade to Pro to unlock the Analyst.
                  </p>
                  <Link
                    href="/dashboard/settings?tab=billing"
                    className="block text-center rounded-lg bg-[var(--indigo)] hover:opacity-90 text-white text-xs font-semibold py-2 px-3"
                  >
                    Upgrade to Pro →
                  </Link>
                </div>
              ) : tier === 'elite' ? (
                <p className="text-xs text-[var(--cyan)] px-2">Unlimited</p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] px-2">
                  {typeof proUsedToday === 'number' ? `${Math.min(proUsedToday, 10)} of 10 messages today` : '—'}
                </p>
              )}

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 px-2">Recent</p>
                <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => selectSession(s.id)}
                        className={clsx(
                          'w-full text-left rounded-lg px-3 py-2 text-xs transition',
                          activeId === s.id
                            ? 'bg-[var(--indigo)]/20 text-white border border-[var(--indigo)]/35'
                            : 'text-[var(--text-secondary)] hover:bg-white/[0.04] border border-transparent'
                        )}
                      >
                        <span className="block truncate font-medium">{s.preview}</span>
                        <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">
                          {formatSessionTs(s.updatedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {tier === 'free' && (
              <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-primary)]">
                  Dynasty Analyst is a Pro feature. Upgrade to get 10 messages/day.
                </p>
                <Link
                  href="/dashboard/settings?tab=billing"
                  className="shrink-0 rounded-lg bg-[var(--indigo)] hover:opacity-90 text-white text-sm font-semibold px-4 py-2"
                >
                  Upgrade to Pro
                </Link>
              </div>
            )}

            <div className="shrink-0 px-4 sm:px-6 lg:px-10 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Crown className="w-6 h-6 text-[var(--gold)] shrink-0" />
                <span className="font-semibold text-white truncate display text-xl tracking-wide">Dynasty Analyst</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLeague}
                    onChange={(e) => setSelectedLeague(e.target.value)}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--indigo)] max-w-[200px]"
                  >
                    <option value="all">All leagues</option>
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <p className="shrink-0 px-4 sm:px-6 lg:px-10 pb-4 text-[11px] text-[var(--text-muted)]">
              Analyst has context on:{' '}
              <span className="text-[var(--text-secondary)]">
                {leagueLabel}, your roster, KTC values, recent trades where synced.
              </span>
            </p>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 space-y-4">
              {showEmptyState && tier !== 'free' && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/60 p-6 max-w-xl mx-auto text-center mb-8">
                  <SparklesBanner />
                  <div className="grid gap-2 sm:grid-cols-2 text-left mt-6">
                    {[
                      {
                        label: 'Should I accept this trade?',
                        onClick: () => setTradeOpen(true),
                      },
                      {
                        label: 'Who should I target with my picks?',
                        onClick: () =>
                          send('Who should I target with my draft picks given my roster?'),
                      },
                      {
                        label: 'Rank my players by value',
                        onClick: () => send('Rank my dynasty players by value for my leagues'),
                      },
                      {
                        label: 'Which league should I focus on rebuilding?',
                        onClick: () =>
                          send('Which of my synced leagues should I prioritize for a rebuild vs competing? Explain why.'),
                      },
                    ].map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        disabled={streaming || rateLimited}
                        onClick={q.onClick}
                        className="text-left rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/80 hover:border-[var(--indigo)]/40 hover:bg-[var(--indigo)]/[0.06] px-4 py-3 text-sm text-[var(--text-primary)] disabled:opacity-40 transition"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showEmptyState && tier === 'free' && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/40 p-8 max-w-xl mx-auto text-center text-[var(--text-muted)]">
                  Preview Analyst — subscribe to send messages.
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={clsx('flex flex-col gap-1', m.role === 'user' ? 'items-end pl-12' : 'items-start pr-12')}>
                  <div
                    className={clsx(
                      'rounded-2xl px-4 py-3 max-w-[min(100%,42rem)] text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-[var(--indigo)] text-white rounded-tr-md'
                        : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-md'
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <CoachMessageBody
                        content={m.content}
                        nameIndex={namePairs}
                        onPlayerClick={openModal}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    )}
                  </div>
                  <span className="text-[10px] px-2 text-[var(--text-muted)]">{formatTime(m.at)}</span>
                </div>
              ))}

              {streaming && (
                <div className="flex flex-col gap-1 items-start pr-12">
                  <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[min(100%,42rem)] text-sm bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]">
                    {streamText ? (
                      <CoachMessageBody
                        content={streamText}
                        nameIndex={namePairs}
                        onPlayerClick={openModal}
                      />
                    ) : (
                      <span className="inline-flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--indigo)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--indigo)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--indigo)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-sm text-red-400 text-center max-w-lg mx-auto">
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div
              className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)]/90 backdrop-blur-md px-4 sm:px-6 lg:px-10 py-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="max-w-4xl mx-auto flex items-end gap-3">
                <textarea
                  ref={(el) => {
                    textareaRef.current = el;
                    applyTextareaGrowth(el);
                  }}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    applyTextareaGrowth(e.currentTarget);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    tier === 'free'
                      ? 'Upgrade to Pro to message the Analyst…'
                      : rateLimited
                        ? 'Daily message limit reached…'
                        : 'Ask the Analyst about trades, rebuilds, values…'
                  }
                  rows={1}
                  disabled={streaming || tier === 'free' || rateLimited}
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--indigo)]/50 rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none transition min-h-[44px] max-h-[120px] overflow-y-auto disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || streaming || tier === 'free' || rateLimited}
                  className="shrink-0 h-11 px-5 rounded-xl bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white text-sm font-semibold transition"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(100%,320px)] bg-[var(--bg-secondary)] border-r border-[var(--border)] shadow-2xl flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white">Conversations</span>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-2 text-[var(--text-muted)]">
                <PanelRightClose className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={newChat}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--indigo)] text-white font-semibold text-sm mb-4"
            >
              <MessageSquarePlus className="w-5 h-5" /> New Chat
            </button>
            {tier === 'free' ? (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Upgrade to Pro to unlock the Analyst.{' '}
                <Link href="/dashboard/settings?tab=billing" className="text-[var(--indigo-light)] underline">
                  Billing →
                </Link>
              </p>
            ) : tier === 'elite' ? (
              <p className="text-xs text-[var(--cyan)] mb-4">Unlimited</p>
            ) : typeof proUsedToday === 'number' ? (
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                {Math.min(proUsedToday, 10)} of 10 messages today
              </p>
            ) : null}
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectSession(s.id)}
                    className={clsx(
                      'w-full text-left rounded-lg px-3 py-2 text-xs',
                      activeId === s.id ? 'bg-[var(--indigo)]/20 border border-[var(--indigo)]/35' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    <span className="block truncate">{s.preview}</span>
                    <span className="block text-[10px] text-[var(--text-muted)]">{formatSessionTs(s.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Trade modal */}
      {tradeOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setTradeOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Trade check</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Describe what you give and get — the Analyst will evaluate.</p>
            <label className="block text-xs text-[var(--text-muted)] mb-1">You give</label>
            <textarea
              value={tradeGive}
              onChange={(e) => setTradeGive(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white mb-3 min-h-[72px]"
              placeholder="Players / picks…"
            />
            <label className="block text-xs text-[var(--text-muted)] mb-1">You get</label>
            <textarea
              value={tradeGet}
              onChange={(e) => setTradeGet(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white mb-4 min-h-[72px]"
              placeholder="Players / picks…"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setTradeOpen(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-muted)]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = `Should I accept this trade? I give: ${tradeGive.trim() || '(unspecified)'} — I get: ${tradeGet.trim() || '(unspecified)'}`;
                  setTradeGive('');
                  setTradeGet('');
                  send(q);
                }}
                className="px-4 py-2 rounded-lg text-sm bg-[var(--indigo)] text-white font-semibold"
              >
                Ask the Analyst
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player modal */}
      {modalPlayer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setModalPlayer(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setModalPlayer(null)}
              className="absolute top-3 right-3 text-[var(--text-muted)] text-sm"
            >
              Close
            </button>
            {modalData?.p ? (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <Image
                      src={`https://sleepercdn.com/content/nfl/players/${modalPlayer.id}.jpg`}
                      alt=""
                      width={64}
                      height={64}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{modalData.p.full_name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {modalData.p.position} · {modalData.p.team ?? 'FA'}
                      {modalData.p.age != null ? ` · age ${modalData.p.age}` : ''}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div className="rounded-lg bg-[var(--bg-secondary)] px-3 py-2 border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">KTC</span>
                    <span className="text-white font-semibold">{modalPlayer.ktc ? Math.round(modalPlayer.ktc) : '—'}</span>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] px-3 py-2 border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">BBV</span>
                    <span className="text-white font-semibold">
                      {modalData.bbv != null ? Math.round(modalData.bbv) : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/trade/finder?q=${encodeURIComponent(modalData.p.full_name ?? '')}`}
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-lg bg-[var(--indigo)]/20 text-[var(--indigo-light)] px-3 py-2 border border-[var(--indigo)]/30"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" /> Find trade target
                  </Link>
                  <a
                    href={`https://sleeper.com/nfl/players/${modalPlayer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium rounded-lg bg-white/[0.06] text-[var(--text-secondary)] hover:text-white px-3 py-2 border border-[var(--border)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Sleeper
                  </a>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>
            )}
          </div>
        </div>
      )}
    </AppBackground>
  );
}

function SparklesBanner() {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[var(--gold)] text-2xl">✦</span>
      <p className="text-[var(--text-secondary)] text-sm">Ask the Analyst — pick a prompt or type your own.</p>
    </div>
  );
}
