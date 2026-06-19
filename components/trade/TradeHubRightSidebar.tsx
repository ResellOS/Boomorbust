'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlockPlayer, ManagerTradeCard, TradeOpportunity } from '@/lib/trade/types';
import TradeCalculator, { type CalculatorAsset } from '@/components/trade/TradeCalculator';
import type { OwnedPick } from '@/lib/trade/types';
import { acceptanceColor, bobBadgeStyle, calculatorAssetsFromOpportunity } from '@/lib/trade/tradeHubUi';
import { displayArchetypeLabel } from '@/lib/trade/opportunityEngine';

function PlayerThumb({ playerId, name, size = 32 }: { playerId: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-border bg-surface2"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={name}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full items-center justify-center font-mono text-[8px] text-muted">
          {name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

export default function TradeHubRightSidebar({
  managerCards,
  blockPlayers,
  givePicks,
  activeOpportunity,
  onSelectManager,
  baseChampionshipOdds = 0,
}: {
  managerCards: ManagerTradeCard[];
  blockPlayers: BlockPlayer[];
  givePicks: OwnedPick[];
  activeOpportunity: TradeOpportunity | null;
  onSelectManager: (m: ManagerTradeCard) => void;
  baseChampionshipOdds?: number;
}) {
  const [selectedManager, setSelectedManager] = useState<ManagerTradeCard | null>(null);

  const calcState = activeOpportunity
    ? calculatorAssetsFromOpportunity(activeOpportunity)
    : { give: [] as CalculatorAsset[], get: [] as CalculatorAsset[], leagueId: '' };

  const giveTfo = calcState.give.reduce((s, a) => s + (a.tfoScore ?? 0), 0);
  const getTfo = calcState.get.reduce((s, a) => s + (a.tfoScore ?? 0), 0);
  const tradeValue = Math.round((getTfo - giveTfo) * 10) / 10;
  const acceptPct = activeOpportunity?.acceptanceProbability ?? 0;

  let verdict = { label: 'Neutral', color: '#64748B' };
  if (activeOpportunity) {
    if (tradeValue > 5) verdict = { label: 'Accept', color: '#36E7A1' };
    else if (tradeValue < -5) verdict = { label: 'Decline', color: '#A78BFA' };
  }

  const mgr = selectedManager ?? managerCards[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[9px] overflow-y-auto border-l border-border bg-bg p-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Panel 1: Top Trade Partners */}
      <Panel title="Top Trade Partners">
        <p className="mb-2 font-mono text-[8px] text-[#6b7a99]">
          Most likely managers to complete a deal this week.
        </p>
        {managerCards.length === 0 ? (
          <p className="font-figtree text-[10px] text-muted">Manager profiles syncing…</p>
        ) : (
          managerCards.map((m) => (
            <button
              key={`${m.leagueId}-${m.sleeperRosterId}`}
              type="button"
              onClick={() => {
                setSelectedManager(m);
                onSelectManager(m);
              }}
              className="flex w-full items-center gap-2 border-b border-border/40 py-2 text-left last:border-b-0 hover:bg-white/[0.02]"
            >
              <PlayerThumb playerId={String(m.sleeperRosterId)} name={m.displayName} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-figtree text-[11px] text-text">{m.displayName}</div>
                <div className="font-mono text-[9px] text-muted">{m.leagueName}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11px] tabular-nums text-boom">{m.tradeLikelihood}%</div>
                <div className="font-mono text-[8px] text-muted">{m.confidenceLabel}</div>
              </div>
            </button>
          ))
        )}
      </Panel>

      {/* Manager DNA */}
      {mgr ? (
        <Panel title={`Manager DNA: ${mgr.displayName}`}>
          <div
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bust"
            style={{ textShadow: '0 0 8px rgba(167,139,250,0.35)' }}
          >
            {displayArchetypeLabel(mgr.profile)}
          </div>
          <DnaRow label="Trade Frequency" value={mgr.confidenceLabel} />
          <DnaRow label="Youth Preference" value={`${mgr.youthPreference}/100`} />
          {mgr.responseSpeed ? <DnaRow label="Response Time" value={mgr.responseSpeed} /> : null}
          <DnaRow label="Negotiation Style" value={mgr.negotiationStyle} />
          <DnaRow label="Overpay Tendency" value={mgr.overpayTendency} />
          <Link href="/dashboard/managers" className="mt-2 block font-mono text-[9px] text-boom hover:underline">
            View Full Profile →
          </Link>
        </Panel>
      ) : null}

      {/* Panel 2: Players on the Block */}
      <Panel title="Players on the Block">
        {blockPlayers.length === 0 ? (
          <p className="font-figtree text-[10px] text-muted">No block signals yet.</p>
        ) : (
          blockPlayers.slice(0, 6).map((p) => {
            const bob = bobBadgeStyle(p.bobOpportunityBadge);
            return (
            <div key={p.playerId} className="flex items-center gap-2 border-b border-border/40 py-2 last:border-b-0">
              <PlayerThumb playerId={p.playerId} name={p.playerName} />
              <div className="min-w-0 flex-1">
                <div className="font-figtree text-[11px] text-text">{p.playerName}</div>
                <div className="font-mono text-[9px] text-muted">
                  {p.position} · {p.team}
                </div>
                <div className="font-mono text-[8px] text-muted">
                  {p.ownerName} · {p.leagueName}
                </div>
              </div>
              <span
                className="shrink-0 rounded px-1 py-px font-mono text-[7px] uppercase"
                style={{ color: bob.color, background: bob.bg }}
              >
                {p.bobOpportunityBadge}
              </span>
            </div>
            );
          })
        )}
        <Link href="/trade?tab=blocks" className="mt-2 block font-mono text-[9px] text-boom hover:underline">
          View All →
        </Link>
      </Panel>

      {/* Panel 3: Smart Calculator */}
      <Panel title="Smart Calculator">
        {activeOpportunity ? (
          <>
            <div
              className="mb-3 rounded-[8px] border px-3 py-2 text-center"
              style={{ borderColor: `${verdict.color}55`, background: `${verdict.color}12` }}
            >
              <div className="font-mono text-[8px] uppercase text-muted">BOB Verdict</div>
              <div className="font-figtree text-2xl" style={{ color: verdict.color }}>
                {verdict.label}
              </div>
            </div>

            <div className="mb-3 rounded-[8px] border border-[#1e2640] bg-[#141929]/50 px-3 py-2">
              <div className="font-mono text-[8px] uppercase text-[#6b7a99]">Trade Summary</div>
              <div className="mt-1 font-mono text-[9px] text-[#6b7a99]">You Give:</div>
              {calcState.give.map((a) => (
                <div key={a.key} className="font-figtree text-[10px] text-[#e8ecf4]">
                  · {a.label}
                </div>
              ))}
              <div className="mt-1 font-mono text-[9px] text-[#6b7a99]">You Get:</div>
              {calcState.get.map((a) => (
                <div key={a.key} className="font-figtree text-[10px] text-boom">
                  · {a.label}
                </div>
              ))}
            </div>

            <div className="mb-3 space-y-1 font-mono text-[10px]">
              <div className="font-mono text-[8px] uppercase text-[#6b7a99]">Roster Impact</div>
              <div className="flex justify-between">
                <span className="text-muted">{activeOpportunity.position} Grade</span>
                <span className="tabular-nums text-text">
                  {Math.max(40, 60 - activeOpportunity.tfoDelta / 3).toFixed(0)} →{' '}
                  {Math.min(95, 60 + activeOpportunity.tfoDelta / 4).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Contender Score</span>
                <span className="tabular-nums text-text">
                  {Math.max(40, activeOpportunity.portfolioImpactScore - 8)} →{' '}
                  {activeOpportunity.portfolioImpactScore}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Championship Odds</span>
                <span className="tabular-nums text-boom">
                  {baseChampionshipOdds.toFixed(1)}% →{' '}
                  {(baseChampionshipOdds + activeOpportunity.championshipImpact).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trade Value</span>
                <span className="tabular-nums text-text">{tradeValue >= 0 ? '+' : ''}{tradeValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Acceptance Probability</span>
                <span className="tabular-nums" style={{ color: acceptanceColor(acceptPct) }}>
                  {acceptPct}%
                </span>
              </div>
              {mgr ? (
                <div className="border-t border-border/40 pt-2">
                  <div className="text-muted">Manager Reaction</div>
                  <div className="font-figtree text-[11px] font-medium text-boom">Likely Interested</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(activeOpportunity.reasonChips.length > 0
                      ? activeOpportunity.reasonChips
                      : activeOpportunity.whyReasons
                    )
                      .slice(0, 3)
                      .map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-[#1e2640] px-1.5 py-0.5 font-figtree text-[9px] text-[#e8ecf4]"
                        >
                          ✓ {c}
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mb-2 font-figtree text-[10px] text-muted">
            Select a trade opportunity to preview in the calculator.
          </p>
        )}
        <TradeCalculator
          key={activeOpportunity?.id ?? 'sidebar-calc'}
          givePicks={givePicks}
          initialGive={calcState.give}
          initialGet={calcState.get}
          embedded
        />
        <Link href="/trade?tab=calculator" className="mt-2 block font-mono text-[9px] text-boom hover:underline">
          View Full Breakdown →
        </Link>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-lg border border-border bg-[#0f1420]">
      <div className="border-b border-border bg-bg px-[13px] py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-text">{title}</span>
      </div>
      <div className="px-[13px] py-2.5">{children}</div>
    </div>
  );
}

function DnaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/30 py-1 font-mono text-[10px] last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-text">{value}</span>
    </div>
  );
}
