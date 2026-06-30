'use client';

import { useCallback, useState } from 'react';
import { clsx } from 'clsx';

export type LeagueSearchHit = {
  league_id: string;
  name: string;
  total_rosters: number;
  season: string;
  scoring_settings: Record<string, number>;
  scoring_label?: string;
  status: string;
};

type Props = {
  existingLeagueIds?: string[];
  onAppendLeagueId: (leagueId: string) => void;
  /** Hint when global search missed — account-only matches */
  sourceNote?: boolean;
  className?: string;
};

const glassInput =
  'min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder:text-[#475569] outline-none focus:border-[var(--indigo)] focus:ring-1 focus:ring-[var(--indigo)] font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

export default function LeagueNameSearch({
  existingLeagueIds = [],
  onAppendLeagueId,
  sourceNote = true,
  className,
}: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LeagueSearchHit[]>([]);
  const [source, setSource] = useState<'global' | 'account' | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const existing = new Set(existingLeagueIds.map((id) => id.trim()).filter(Boolean));

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError('Enter at least 2 characters');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setSource(null);
    setHasSearched(false);
    try {
      const res = await fetch(`/api/leagues/search?name=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        leagues?: LeagueSearchHit[];
        source?: 'global' | 'account';
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Search failed');
        return;
      }
      setResults(data.leagues ?? []);
      setSource(data.source ?? null);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [query]);

  return (
    <div className={clsx('space-y-3', className)}>
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2 font-mono">
          SEARCH BY LEAGUE NAME
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Enter league name..."
            className={glassInput}
            autoComplete="off"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runSearch()}
            className="shrink-0 rounded-xl bg-[var(--indigo)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5254cc] disabled:opacity-50 font-mono"
          >
            {loading ? '…' : 'SEARCH'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{error}</p>
      ) : null}

      {sourceNote && source === 'account' && results.length > 0 ? (
        <p className="text-[12px] text-[var(--text-muted)] font-mono leading-snug">
          Showing leagues on your Sleeper account that match this name.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="space-y-2 max-h-[280px] overflow-y-auto slim-scroll pr-1">
          {results.map((lg) => {
            const already = existing.has(lg.league_id);
            const scoring =
              lg.scoring_label ??
              (lg.scoring_settings?.rec != null
                ? `${lg.scoring_settings.rec} rec`
                : 'See Sleeper');
            return (
              <li
                key={lg.league_id}
                className="rounded-xl border border-white/[0.08] bg-[var(--bg-secondary)]/80 px-3 py-3 flex flex-col gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate font-mono">{lg.name}</p>
                  <p className="mt-1 text-[12px] text-[var(--text-secondary)] font-mono">
                    {lg.total_rosters} teams · Season {lg.season} · {scoring}
                    {lg.status ? ` · ${lg.status}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => onAppendLeagueId(lg.league_id)}
                  className={clsx(
                    'self-start rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide font-mono transition',
                    already
                      ? 'border border-white/10 text-[var(--text-muted)] cursor-not-allowed'
                      : 'bg-[#22D3EE]/15 border border-[#22D3EE]/35 text-[#22D3EE] hover:bg-[#22D3EE]/25',
                  )}
                >
                  {already ? 'Already in list' : 'Add this league'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasSearched && !loading && results.length === 0 && !error ? (
        <p className="text-[12px] text-[var(--text-muted)] font-mono">No leagues matched. Try another name.</p>
      ) : null}
    </div>
  );
}
