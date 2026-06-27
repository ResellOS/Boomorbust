'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import TradePlayerHeadshot from '@/components/trade/TradePlayerHeadshot';
import type { BlockPlayer, ManagerTradeCard, TradeHistoryRow } from '@/lib/trade/types';
import { displayArchetypeLabel } from '@/lib/trade/opportunityEngine';
import { bobBadgeStyle } from '@/lib/trade/tradeHubUi';

export default function TradeHubRightSidebar({
  selectedManager,
  blockPlayers,
  history,
  onSelectBlock,
}: {
  selectedManager: ManagerTradeCard | null;
  blockPlayers: BlockPlayer[];
  history: TradeHistoryRow[];
  onSelectBlock: (p: BlockPlayer) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto border-l border-[#1e2640] bg-[#0a0d14] p-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {selectedManager ? (
        <Panel title="League Intel Spotlight">
          <div className="font-figtree text-[13px] font-semibold text-[#e8ecf4]">
            {selectedManager.displayName}
            <span className="font-normal text-[#8b9bb8]"> — {selectedManager.leagueName}</span>
          </div>
          <div className="mt-1 font-figtree text-[11px] text-[#A78BFA]">
            {displayArchetypeLabel(selectedManager.profile)}
          </div>
          <div className="mt-2">
            <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Signals</div>
            <ul className="mt-0.5 space-y-0.5">
              {(selectedManager.profile.needs ?? []).slice(0, 2).map((n) => (
                <li key={n} className="font-figtree text-[10px] text-[#9aa8c4]">· Thin at {n}</li>
              ))}
              <li className="font-figtree text-[10px] text-[#9aa8c4]">
                · {selectedManager.negotiationStyle}
              </li>
              <li className="font-figtree text-[10px] text-[#9aa8c4]">
                · {selectedManager.overpayTendency}
              </li>
            </ul>
          </div>
          <div className="mt-2">
            <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Best Approach</div>
            <div className="font-figtree text-[10px] text-boom">
              {(selectedManager.profile.pitch_angle ?? 'Lead with a fair, value-based offer.').slice(0, 80)}
              {(selectedManager.profile.pitch_angle?.length ?? 0) > 80 ? '…' : ''}
            </div>
          </div>
          <div className="mt-1 font-mono text-[9px] text-[#8b9bb8]">
            Trade Likelihood: <span className="text-boom">{selectedManager.tradeLikelihood}%</span>
          </div>
          <Link
            href={`/leagues/${selectedManager.leagueId}`}
            className="mt-2 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline"
          >
            View Full Intel <ChevronRight className="h-3 w-3" />
          </Link>
        </Panel>
      ) : (
        <Panel title="League Intel Spotlight">
          <p className="font-figtree text-[10px] text-[#6b7a99]">Building league intelligence…</p>
        </Panel>
      )}

      <Panel title="Players on the Block">
        {blockPlayers.length === 0 ? (
          <p className="font-figtree text-[10px] text-[#6b7a99]">No block signals yet.</p>
        ) : (
          blockPlayers.slice(0, 6).map((p) => {
            const bob = bobBadgeStyle(p.bobOpportunityBadge);
            return (
              <button
                key={p.playerId}
                type="button"
                onClick={() => onSelectBlock(p)}
                className="dash-clickable-row flex w-full items-center gap-2 border-b border-[#1e2640]/40 py-2 text-left last:border-b-0"
              >
                <TradePlayerHeadshot playerId={p.playerId} name={p.playerName} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="font-figtree text-[11px] text-[#e8ecf4]">{p.playerName}</div>
                  <div className="font-mono text-[8px] text-[#6b7a99]">
                    {p.position} · {p.team}
                  </div>
                  <div className="font-mono text-[7px] text-[#8b9bb8]">
                    {p.ownerName} · {p.leagueName}
                  </div>
                  {p.verdictLabel ? (
                    <div className="mt-0.5 font-figtree text-[8px] text-[#9aa8c4]">{p.verdictLabel}</div>
                  ) : null}
                </div>
                <span
                  className="shrink-0 rounded px-1 py-px font-mono text-[7px] uppercase"
                  style={{ color: bob.color, background: bob.bg }}
                >
                  {p.bobOpportunityBadge}
                </span>
              </button>
            );
          })
        )}
        <Link href="/players" className="mt-2 block font-mono text-[9px] text-boom no-underline">
          View All →
        </Link>
      </Panel>

      {history.length > 0 ? (
        <Panel title="Recent Trade Activity">
          {history.slice(0, 5).map((row) => (
            <div
              key={row.id}
              className="border-b border-[#1e2640]/40 py-1.5 font-figtree text-[10px] last:border-b-0"
            >
              <div className="text-[#e8ecf4]">
                <span className="font-semibold">{row.gaveName}</span>
                <span className="mx-1 text-[#6b7a99]">→</span>
                {row.receivedDisplay}
              </div>
              <div className="font-mono text-[8px] text-[#6b7a99]">{row.timeAgo}</div>
            </div>
          ))}
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-lg border border-[#1e2640] bg-[#0f1420]">
      <div className="border-b border-[#1e2640]/80 bg-[#0a0d14] px-3 py-1.5">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">{title}</span>
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}
