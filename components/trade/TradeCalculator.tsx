'use client';

import { useEffect, useRef, useState } from 'react';
import type { CalculatorSearchHit } from '@/app/api/trade/calculator-search/route';

interface Asset {
  key: string;
  label: string;
  isPick: boolean;
  tfoScore: number | null;
  ktcValue: number | null;
}

const PICK_TFO = 55; // nominal TFO weight for a draft pick
const PICK_KTC = 2500;

function SideColumn({
  title,
  assets,
  onAdd,
  onRemove,
}: {
  title: string;
  assets: Asset[];
  onAdd: (a: Asset) => void;
  onRemove: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalculatorSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState('2027 1st Round');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trade/calculator-search?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as { results: CalculatorSearchHit[] };
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const tfoSum = assets.reduce((s, a) => s + (a.tfoScore ?? 0), 0);
  const ktcSum = assets.reduce((s, a) => s + (a.ktcValue ?? 0), 0);

  return (
    <div className="flex min-w-0 flex-col rounded-[8px] border border-border bg-surface">
      <div className="border-b border-border px-3 py-2 font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
        {title}
      </div>

      <div className="relative p-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search player…"
          className="w-full rounded-[6px] border border-border bg-bg px-2.5 py-1.5 font-figtree text-[11px] text-text outline-none placeholder:text-muted focus:border-boom/50"
        />
        {open && results.length > 0 && (
          <div className="absolute left-2.5 right-2.5 top-[40px] z-20 max-h-[220px] overflow-y-auto rounded-[6px] border border-border bg-surface2 shadow-lg">
            {results.map((r) => (
              <button
                key={r.playerId}
                type="button"
                onClick={() => {
                  onAdd({
                    key: r.playerId,
                    label: `${r.name} (${r.position})`,
                    isPick: false,
                    tfoScore: r.tfoScore,
                    ktcValue: r.ktcValue,
                  });
                  setQuery('');
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-white/[0.04]"
              >
                <span className="truncate font-figtree text-[11px] text-text">
                  {r.name} <span className="font-mono text-[8px] text-muted">{r.position} · {r.team ?? 'FA'}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-boom">
                  {r.tfoScore != null ? r.tfoScore.toFixed(1) : '—'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pick entry */}
      <div className="flex items-center gap-1.5 px-2.5 pb-2">
        <input
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          placeholder="2027 1st Round"
          className="min-w-0 flex-1 rounded-[6px] border border-border bg-bg px-2 py-1 font-figtree text-[10px] text-text outline-none placeholder:text-muted focus:border-boom/50"
        />
        <button
          type="button"
          onClick={() => {
            const label = pick.trim();
            if (!label) return;
            onAdd({ key: `pick-${label}-${Date.now()}`, label, isPick: true, tfoScore: PICK_TFO, ktcValue: PICK_KTC });
          }}
          className="shrink-0 rounded-[6px] border border-border px-2 py-1 font-figtree text-[10px] text-muted hover:text-text"
        >
          + Pick
        </button>
      </div>

      {/* Assets */}
      <div className="flex-1 px-2.5">
        {assets.length === 0 ? (
          <div className="py-3 text-center font-figtree text-[10px] text-muted">No assets yet.</div>
        ) : (
          assets.map((a) => (
            <div
              key={a.key}
              className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5"
            >
              <span className="min-w-0 truncate font-figtree text-[11px] text-text">
                {a.isPick ? '🎟 ' : ''}{a.label}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-boom">
                  {a.tfoScore != null ? a.tfoScore.toFixed(1) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(a.key)}
                  className="font-mono text-[11px] text-muted hover:text-bust"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side totals */}
      <div className="mt-1 border-t border-border px-2.5 py-2">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted">TFO total</span>
          <span className="text-text">{tfoSum.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted">KTC total</span>
          <span className="text-text">{ktcSum.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function TradeCalculator() {
  const [give, setGive] = useState<Asset[]>([]);
  const [get, setGet] = useState<Asset[]>([]);

  const giveTfo = give.reduce((s, a) => s + (a.tfoScore ?? 0), 0);
  const getTfo = get.reduce((s, a) => s + (a.tfoScore ?? 0), 0);

  // Fairness verdict based on TFO totals (the always-present metric).
  let verdict: { label: string; color: string } = { label: 'Add players to compare', color: '#6b7a99' };
  if (give.length > 0 && get.length > 0) {
    const base = Math.max(giveTfo, getTfo, 1);
    const diffPct = ((getTfo - giveTfo) / base) * 100;
    if (Math.abs(diffPct) <= 10) verdict = { label: 'Fair Trade', color: '#6b7a99' };
    else if (diffPct > 10) verdict = { label: "You're Winning", color: '#36E7A1' };
    else verdict = { label: "You're Losing", color: '#A78BFA' };
  }

  const delta = Math.round((getTfo - giveTfo) * 10) / 10;

  return (
    <div className="rounded-[8px] border border-border bg-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
          Trade Calculator
        </span>
        <span className="font-mono text-[8px] text-muted">Roster-agnostic · any players or picks</span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <SideColumn
          title="You Give"
          assets={give}
          onAdd={(a) => setGive((p) => [...p, a])}
          onRemove={(k) => setGive((p) => p.filter((x) => x.key !== k))}
        />
        <SideColumn
          title="You Get"
          assets={get}
          onAdd={(a) => setGet((p) => [...p, a])}
          onRemove={(k) => setGet((p) => p.filter((x) => x.key !== k))}
        />
      </div>

      {/* Verdict bar */}
      <div
        className="mt-3 flex items-center justify-between rounded-[8px] border px-4 py-2.5"
        style={{ borderColor: `${verdict.color}66`, background: `${verdict.color}12` }}
      >
        <div className="font-figtree text-[13px] font-bold" style={{ color: verdict.color }}>
          {verdict.label}
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted">TFO Delta</div>
          <div className="font-mono text-[15px] font-bold" style={{ color: verdict.color }}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
