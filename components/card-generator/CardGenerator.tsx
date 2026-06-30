'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { CardData } from './CardCanvas';

const CardCanvas = dynamic(() => import('./CardCanvas'), { ssr: false });

interface PlayerSearchResult {
  player_id: string;
  full_name: string;
  position: string;
  team: string;
}

async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  if (query.length < 2) return [];
  const res = await fetch(
    `/api/players/search?q=${encodeURIComponent(query)}&limit=8`,
  );
  if (!res.ok) return [];
  const data = await res.json() as unknown;
  if (!Array.isArray(data)) return [];
  return data as PlayerSearchResult[];
}

async function fetchCardData(
  playerId: string,
  scoringType: string,
  year: number,
): Promise<CardData | null> {
  const res = await fetch(
    `/api/card-generator/${playerId}?scoringType=${scoringType}&year=${year}`,
  );
  if (!res.ok) return null;
  return res.json() as Promise<CardData>;
}

async function downloadCard(
  el: HTMLElement,
  playerName: string,
  year: number,
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, {
    width: 800,
    height: 1200,
    scale: 2,
    useCORS: true,
    backgroundColor: '#0a0d14',
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `BOB-${playerName.replace(/\s+/g, '-')}-${year}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

async function copyToClipboard(el: HTMLElement): Promise<boolean> {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, {
      width: 800,
      height: 1200,
      scale: 2,
      useCORS: true,
      backgroundColor: '#0a0d14',
      logging: false,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function buildTweetText(data: CardData): string {
  const proj = data.projections;
  const pos = data.player.position.toUpperCase();
  let oneLiner = '';
  if (pos === 'QB') {
    oneLiner = `Projecting ${(proj.passingYards ?? 0).toLocaleString()} yards and ${proj.passingTDs ?? 0} TDs — ${data.verdict.label === 'BOOM' ? 'elite setup' : 'monitor the situation'}.`;
  } else if (pos === 'RB') {
    oneLiner = `${proj.carries ?? 0} carries projected — ${data.verdict.label === 'BOOM' ? 'bell cow workload incoming' : 'volume may fluctuate'}.`;
  } else {
    oneLiner = `${proj.targets ?? 0} targets projected — ${data.verdict.label === 'BOOM' ? 'prime target share locked in' : 'upside there, consistency uncertain'}.`;
  }
  return encodeURIComponent(
    `${data.player.full_name} ${data.projections.year} Dynasty Projection\n\n${data.verdict.label} — Verdict Score: ${data.verdict.score}\n\n${oneLiner}\n\n#DynastyFootball #FantasyFootball #BoomOrBust\nboomorbust.app`,
  );
}

const SCORING_OPTIONS = ['PPR', 'Half PPR', 'Standard', 'Superflex'] as const;
type ScoringOption = typeof SCORING_OPTIONS[number];
const YEAR_OPTIONS = [2025, 2026, 2027] as const;

const scoringMap: Record<ScoringOption, string> = {
  'PPR': 'ppr',
  'Half PPR': 'half_ppr',
  'Standard': 'standard',
  'Superflex': 'superflex',
};

export default function CardGenerator() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlayerSearchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [scoring, setScoring] = useState<ScoringOption>('PPR');
  const [year, setYear] = useState<number>(2026);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      const results = await searchPlayers(query);
      setSuggestions(results);
      setLoadingSuggestions(false);
    }, 280);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectPlayer = useCallback((p: PlayerSearchResult) => {
    setSelectedPlayer(p);
    setQuery(p.full_name);
    setSuggestions([]);
  }, []);

  const generate = useCallback(async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    setError(null);
    const data = await fetchCardData(selectedPlayer.player_id, scoringMap[scoring], year);
    if (data) {
      setCardData(data);
    } else {
      setError('Could not load player data. Try again.');
    }
    setLoading(false);
  }, [selectedPlayer, scoring, year]);

  const handleDownload = async () => {
    if (!cardRef.current || !cardData) return;
    setDownloading(true);
    await downloadCard(cardRef.current, cardData.player.full_name, year);
    setDownloading(false);
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    const ok = await copyToClipboard(cardRef.current);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTweet = () => {
    if (!cardData) return;
    const text = buildTweetText(cardData);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const posColors: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const posColor = selectedPlayer ? (posColors[selectedPlayer.position] ?? '#22D3EE') : '#22D3EE';

  return (
    <div className="min-h-screen bg-[#060910] px-4 py-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[#36E7A1] text-2xl">⚡</span>
            <h1
              className="text-white font-black text-2xl uppercase tracking-[0.08em]"
              style={{ fontFamily: 'var(--font-display, sans-serif)' }}
            >
              Card Generator
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-mono">
            Generate shareable dynasty prediction cards for any NFL player.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
          {/* ── Left: Controls ─────────────────────────────────────────── */}
          <div className="glass-panel rounded-xl p-6 space-y-6 border border-white/[0.08]">
            {/* Player search */}
            <div ref={searchRef} className="relative">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Player
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedPlayer(null); }}
                  placeholder="Search NFL players..."
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#22D3EE]/50 font-mono"
                />
                {loadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#22D3EE]/40 border-t-[#22D3EE] rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1117] border border-white/[0.1] rounded-xl z-50 overflow-hidden shadow-2xl">
                  {suggestions.map((p) => (
                    <button
                      key={p.player_id}
                      type="button"
                      onClick={() => selectPlayer(p)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] text-left transition-colors"
                    >
                      <span
                        className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{
                          color: posColors[p.position] ?? '#94A3B8',
                          background: `${posColors[p.position] ?? '#94A3B8'}18`,
                        }}
                      >
                        {p.position}
                      </span>
                      <span className="text-white text-sm flex-1">{p.full_name}</span>
                      <span className="text-slate-500 text-xs font-mono">{p.team}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Year */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Year
              </label>
              <div className="flex gap-2">
                {YEAR_OPTIONS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className="flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-all"
                    style={
                      year === y
                        ? { background: `${posColor}22`, border: `1px solid ${posColor}55`, color: posColor }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }
                    }
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Scoring format */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Scoring Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SCORING_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScoring(s)}
                    className="py-2 rounded-lg font-mono text-xs font-bold transition-all"
                    style={
                      scoring === s
                        ? { background: `${posColor}22`, border: `1px solid ${posColor}55`, color: posColor }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={generate}
              disabled={!selectedPlayer || loading}
              className="w-full py-3 rounded-xl font-mono font-black text-sm uppercase tracking-[0.1em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selectedPlayer && !loading
                  ? 'linear-gradient(135deg, #36E7A1 0%, #22D3EE 100%)'
                  : 'rgba(255,255,255,0.06)',
                color: selectedPlayer && !loading ? '#050709' : '#475569',
                boxShadow: selectedPlayer && !loading ? '0 0 24px rgba(54,231,161,0.4)' : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#050709]/40 border-t-[#050709] rounded-full animate-spin" />
                  Generating…
                </span>
              ) : '⚡ Generate Card'}
            </button>

            {cardData && (
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-[0.1em] border border-white/[0.1] text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
              >
                ↺ Regenerate
              </button>
            )}

            {error && (
              <p className="text-[#EF4444] text-xs font-mono text-center">{error}</p>
            )}

            {/* Action buttons — only when card is ready */}
            {cardData && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full py-2.5 rounded-xl font-mono font-bold text-sm uppercase tracking-[0.08em] transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #36E7A1 0%, #22D3EE 100%)',
                    color: '#050709',
                    boxShadow: '0 0 20px rgba(54,231,161,0.3)',
                  }}
                >
                  {downloading ? 'Rendering…' : '⬇ Download PNG'}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2.5 rounded-xl font-mono font-bold text-sm uppercase tracking-[0.08em] border border-white/[0.12] text-slate-300 hover:text-white hover:border-white/25 transition-all"
                >
                  {copied ? '✓ Copied!' : '⧉ Copy to Clipboard'}
                </button>
                <button
                  type="button"
                  onClick={handleTweet}
                  className="w-full py-2.5 rounded-xl font-mono font-bold text-sm uppercase tracking-[0.08em] transition-all"
                  style={{
                    background: 'rgba(29,161,242,0.15)',
                    border: '1px solid rgba(29,161,242,0.35)',
                    color: '#1DA1F2',
                  }}
                >
                  𝕏 Share to Twitter
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Preview ──────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4">
            {cardData ? (
              <>
                {/* Scale-to-fit wrapper */}
                <div
                  className="overflow-hidden rounded-2xl shadow-2xl"
                  style={{
                    maxWidth: '100%',
                    width: 'min(800px, 100%)',
                    boxShadow: '0 0 60px rgba(54,231,161,0.12), 0 0 120px rgba(167,139,250,0.08)',
                  }}
                >
                  <div
                    style={{
                      transformOrigin: 'top left',
                      width: 800,
                      transform: 'scale(var(--card-scale, 1))',
                    }}
                    className="card-scale-wrapper"
                  >
                    <CardCanvas ref={cardRef} data={cardData} />
                  </div>
                </div>
                <p className="text-slate-600 text-xs font-mono text-center">
                  800 × 1200px · Twitter optimized · 2× retina download
                </p>
              </>
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-center"
                style={{ width: 'min(800px, 100%)', aspectRatio: '800/1200' }}
              >
                <div className="text-5xl mb-4 opacity-30">⚡</div>
                <p className="text-slate-600 text-sm font-mono uppercase tracking-widest">
                  Search a player and generate your card
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card scale CSS */}
      <style>{`
        @media (max-width: 899px) {
          .card-scale-wrapper {
            --card-scale: 0.5;
            height: 600px;
          }
        }
        @media (min-width: 900px) and (max-width: 1199px) {
          .card-scale-wrapper {
            --card-scale: 0.65;
            height: 780px;
          }
        }
        @media (min-width: 1200px) {
          .card-scale-wrapper {
            --card-scale: 1;
            height: 1200px;
          }
        }
      `}</style>
    </div>
  );
}
