'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Clock } from 'lucide-react';

// Global command palette: a search icon in the top nav that opens a full-screen
// overlay. Searches players (via /api/players/search) and offers quick actions.
// Opens on click or the "/" shortcut; closes on ESC or click-outside. Recent
// searches persist in localStorage.

interface PlayerHit {
  playerId: string;
  full_name: string;
  position: string | null;
  team: string | null;
}

const ACTIONS: { label: string; href: string }[] = [
  { label: 'Connect Leagues', href: '/onboarding' },
  { label: 'Trade Hub', href: '/trade' },
  { label: 'Player Hub', href: '/players' },
  { label: 'BOB Record', href: '/performance' },
  { label: 'Settings', href: '/settings' },
];

const RECENT_KEY = 'bob_recent_searches';

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string): void {
  try {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...getRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [players, setPlayers] = useState<PlayerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPalette = useCallback(() => {
    setRecent(getRecent());
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setPlayers([]);
  }, []);

  // "/" opens the palette (unless typing in a field); ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === '/' && !typing && !open) {
        e.preventDefault();
        openPalette();
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, openPalette, close]);

  // Autofocus the input when opened.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced player search (min 2 chars).
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(term)}`);
        const d = (res.ok ? await res.json() : { results: [] }) as { results?: PlayerHit[] };
        setPlayers(d.results ?? []);
      } catch {
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  const go = useCallback(
    (href: string, term?: string) => {
      if (term) pushRecent(term);
      close();
      router.push(href);
    },
    [close, router],
  );

  const term = q.trim();
  const filteredActions = term
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(term.toLowerCase()))
    : ACTIONS;

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-white/[0.14] hover:text-white"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (!panelRef.current?.contains(e.target as Node)) close();
          }}
        >
          <div
            ref={panelRef}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#1e2640] bg-[#0a0d14] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-2 border-b border-[#1e2640] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search players, leagues..."
                className="w-full border-none bg-transparent font-figtree text-[15px] text-white outline-none placeholder:text-slate-600"
              />
              <button type="button" onClick={close} aria-label="Close search" className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {/* Recent (no query) */}
              {term.length < 2 && recent.length > 0 ? (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        try { window.localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
                        setRecent([]);
                      }}
                      className="font-mono text-[10px] uppercase text-slate-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQ(r)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] text-slate-300 hover:bg-white/[0.04]"
                    >
                      <Clock className="h-3.5 w-3.5 text-slate-600" strokeWidth={2} />
                      {r}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Players */}
              {term.length >= 2 ? (
                <div className="mb-2">
                  <div className="px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500">
                    Players
                  </div>
                  {loading && players.length === 0 ? (
                    <div className="px-2 py-3 font-mono text-[12px] text-slate-500">Searching…</div>
                  ) : players.length === 0 ? (
                    <div className="px-2 py-3 font-mono text-[12px] text-slate-500">No results for &ldquo;{term}&rdquo;</div>
                  ) : (
                    players.map((p) => (
                      <button
                        key={p.playerId}
                        type="button"
                        onClick={() => go(`/players?player=${encodeURIComponent(p.playerId)}`, term)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"
                      >
                        <span className="text-[13px] font-medium text-white">{p.full_name}</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {p.position ?? '—'} · {p.team ?? 'FA'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}

              {/* Actions */}
              {filteredActions.length > 0 ? (
                <div>
                  <div className="px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500">
                    Actions
                  </div>
                  {filteredActions.map((a) => (
                    <button
                      key={a.href}
                      type="button"
                      onClick={() => go(a.href)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"
                    >
                      <span className="text-[13px] text-slate-200">{a.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600" strokeWidth={2} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
