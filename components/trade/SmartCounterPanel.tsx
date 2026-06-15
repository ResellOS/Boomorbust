'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SmartCounterResponse } from '@/lib/trade/types';

interface SmartCounterPanelProps {
  offeredPlayerIds: string[];
  yourPlayerIds: string[];
  leagueId: string;
  offerId: string | null;
}

const TIER_STYLES = {
  aggressive: {
    card: 'bg-boom/[0.04] border-boom/20',
    type: 'text-boom',
    icon: '⚡',
    iconBg: 'bg-boom/[0.08] border-boom/15',
    btn: 'bg-boom text-bg',
  },
  balanced: {
    card: 'bg-muted/[0.02] border-border',
    type: 'text-muted',
    icon: '⚖️',
    iconBg: 'bg-muted/[0.06] border-border',
    btn: 'border border-border bg-transparent text-text',
  },
  conservative: {
    card: 'bg-bust/[0.03] border-bust/15',
    type: 'text-bust',
    icon: '🛡️',
    iconBg: 'bg-bust/[0.06] border-bust/15',
    btn: 'border border-bust/30 bg-transparent text-bust',
  },
} as const;

export default function SmartCounterPanel({
  offeredPlayerIds,
  yourPlayerIds,
  leagueId,
  offerId,
}: SmartCounterPanelProps) {
  const [counters, setCounters] = useState<SmartCounterResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCounters = useCallback(async () => {
    if (!leagueId || (!offeredPlayerIds.length && !yourPlayerIds.length)) {
      setCounters([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/trades/counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          offered_players: offeredPlayerIds,
          your_players: yourPlayerIds,
          league_id: leagueId,
          offer_id: offerId,
        }),
      });
      if (!res.ok) throw new Error('counter failed');
      const json = (await res.json()) as { counters: SmartCounterResponse[] };
      setCounters(json.counters ?? []);
    } catch (err) {
      console.error('[SmartCounterPanel] load failed:', err);
      setCounters([]);
    } finally {
      setLoading(false);
    }
  }, [offeredPlayerIds, yourPlayerIds, leagueId, offerId]);

  useEffect(() => {
    void loadCounters();
  }, [loadCounters]);

  const copyCounter = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Counter copied — paste and send on Sleeper');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto border-l border-border bg-bg p-3.5">
      <div className="mb-1">
        <div className="font-figtree text-[11px] font-bold uppercase tracking-wide text-text">
          Smart Counter
        </div>
        <div className="mt-0.5 font-mono text-[8.5px] text-muted">
          Aggressive · Balanced · Conservative
        </div>
      </div>

      {loading ? (
        <div className="font-mono text-[9px] text-muted">Generating counters…</div>
      ) : counters.length === 0 ? (
        <div className="font-figtree text-[11px] text-muted">
          Select an offer to generate Smart Counter responses.
        </div>
      ) : (
        counters.map((c) => {
          const style = TIER_STYLES[c.tier];
          const edgeColor =
            c.tier === 'aggressive' ? 'text-boom' : c.tier === 'conservative' ? 'text-bust' : 'text-muted';
          return (
            <div key={c.tier} className={`rounded-lg border p-3 ${style.card}`}>
              <div className="mb-1 flex items-start justify-between">
                <div>
                  <div className={`mb-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[1.5px] ${style.type}`}>
                    {c.tier}
                  </div>
                  <div className="font-figtree text-sm font-bold text-text">{c.title}</div>
                  <div className="font-mono text-[8.5px] text-muted">{c.description}</div>
                </div>
                <div
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border text-lg ${style.iconBg}`}
                >
                  {style.icon}
                </div>
              </div>
              <div className="mb-2 font-mono text-[8.5px] text-muted">
                Suggested adjustment:{' '}
                <span className={c.adjustmentType === 'add' ? 'font-bold text-boom' : c.adjustmentType === 'remove' ? 'font-bold text-bust' : ''}>
                  {c.adjustment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-figtree text-[19px] font-bold ${edgeColor}`}>
                    {c.edgeScore > 0 ? '+' : ''}
                    {c.edgeScore.toFixed(1)}
                  </div>
                  <div className="font-mono text-[8px] text-muted">Dynasty Edge</div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyCounter(c.copyText)}
                  className={`rounded px-3.5 py-[7px] font-figtree text-[11px] font-bold tracking-wide ${style.btn}`}
                >
                  Send Counter
                </button>
              </div>
            </div>
          );
        })
      )}

      <span className="block cursor-pointer py-1.5 text-center font-mono text-[9px] text-boom">
        View All Smart Counters →
      </span>

      <div className="mt-auto rounded-[7px] border border-muted/15 bg-boom/[0.018] p-2.5 text-center">
        <div className="mb-1 font-mono text-[7px] uppercase tracking-[2px] text-muted/40">Sponsored</div>
        <div className="font-figtree text-lg font-extrabold tracking-wide text-boom/50">UNDERDOG</div>
        <div className="mt-0.5 font-mono text-[7px] text-muted/40">Best Ball Fantasy · Sign Up Free</div>
      </div>
    </div>
  );
}
