'use client';

import Link from 'next/link';
import type { TrackRecordConsensusData, TrackRecordConsensusRow } from '@/lib/performance/types';

interface BobVsConsensusTrackRecordProps {
  data: TrackRecordConsensusData | null;
}

function marketsSplit(row: TrackRecordConsensusRow): boolean {
  const c = row.consensusRankDelta;
  const k = row.ktcRankDelta;
  if (c === 0 || k === 0) return false;
  return (c > 0 && k < 0) || (c < 0 && k > 0);
}

function gapLabel(delta: number): { text: string; color: string; hint: string } {
  if (delta > 0) {
    return {
      text: `+${delta}`,
      color: '#A78BFA',
      hint: 'Experts rank higher',
    };
  }
  if (delta < 0) {
    return {
      text: String(delta),
      color: '#36E7A1',
      hint: 'BOB rates higher than experts',
    };
  }
  return { text: '0', color: '#64748B', hint: 'Aligned' };
}

function formatKtcGap(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function PositionBars({ byPosition }: { byPosition: TrackRecordConsensusData['byPosition'] }) {
  const entries = [
    { key: 'QB', label: 'QB', count: byPosition.QB, color: '#A78BFA' },
    { key: 'RB', label: 'RB', count: byPosition.RB, color: '#36E7A1' },
    { key: 'WR', label: 'WR', count: byPosition.WR, color: '#22D3EE' },
    { key: 'TE', label: 'TE', count: byPosition.TE, color: '#FBBF24' },
  ];
  const max = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {entries.map((e) => (
        <div key={e.key}>
          <div className="mb-1 flex items-baseline justify-between font-mono text-[9px]">
            <span className="text-muted">{e.label}</span>
            <span className="tabular-nums text-text">{e.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg/80">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(e.count / max) * 100}%`,
                background: e.color,
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BobVsConsensusTrackRecord({ data }: BobVsConsensusTrackRecordProps) {
  if (!data) {
    return (
      <section className="mb-6 rounded-[10px] border border-border bg-surface/50 p-4 backdrop-blur-xl md:p-5">
        <div className="mb-1 font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
          BOB vs Consensus
        </div>
        <p className="font-figtree text-[11px] text-muted">
          Expert consensus comparison is syncing. Check back shortly.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-[10px] border border-border bg-surface/50 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-1 font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
        BOB vs Consensus
      </div>
      <p className="mb-4 font-figtree text-[11px] text-muted">
        Snapshot vs {data.source === 'fantasypros' ? 'FantasyPros' : data.source} expert ranks —{' '}
        {data.season} season.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Players Compared', value: String(data.playersCompared) },
          { label: 'Mean Divergence', value: `${data.meanAbsDelta.toFixed(1)} spots` },
          { label: 'Close Agreement', value: `${data.pctWithin5}% within 5` },
          { label: 'Snapshot', value: data.snapshotDate },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[8px] border border-border bg-[#0f1420] px-3 py-2.5">
            <div className="font-mono text-[8px] uppercase tracking-wide text-muted">{stat.label}</div>
            <div className="mt-0.5 font-mono text-[13px] tabular-nums text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
          Position Breakdown
        </div>
        <PositionBars byPosition={data.byPosition} />
      </div>

      <div className="mb-3">
        <div className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
          Biggest Divergences
        </div>
        <p className="mt-1 font-figtree text-[10px] leading-relaxed text-muted">
          When FantasyPros experts and the KTC trade market disagree with each other, that&apos;s often
          the most interesting divergence to watch.
        </p>
      </div>

      {data.biggestDivergences.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-border/60 bg-bg/40 px-4 py-8 text-center font-mono text-[11px] text-muted">
          No divergences ≥ 20 spots in this snapshot.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
                <th className="px-2 py-2 text-left font-normal">Player</th>
                <th className="px-2 py-2 text-left font-normal">Pos</th>
                <th className="px-2 py-2 text-left font-normal">BOB Verdict</th>
                <th className="px-2 py-2 text-right font-normal">BOB Rank</th>
                <th className="px-2 py-2 text-right font-normal">Expert Rank</th>
                <th className="px-2 py-2 text-right font-normal">Gap</th>
                <th className="px-2 py-2 text-right font-normal">Market (KTC) Gap</th>
              </tr>
            </thead>
            <tbody>
              {data.biggestDivergences.map((row) => {
                const gap = gapLabel(row.consensusRankDelta);
                const split = marketsSplit(row);
                return (
                  <tr
                    key={`${row.playerId}-${row.playerName}`}
                    className="border-b border-border/40 hover:bg-white/[0.02]"
                  >
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.playerId ? (
                          <Link
                            href={`/players?player=${row.playerId}`}
                            className="font-figtree text-[12px] text-text no-underline hover:text-boom"
                          >
                            {row.playerName}
                          </Link>
                        ) : (
                          <span className="font-figtree text-[12px] text-text">{row.playerName}</span>
                        )}
                        {split ? (
                          <span className="rounded border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-1.5 py-0.5 font-mono text-[7px] uppercase text-[#FBBF24]">
                            Markets Split
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[10px] text-muted">{row.position}</td>
                    <td className="px-2 py-2.5 font-mono text-[10px] text-text">{row.verdict}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] tabular-nums text-text">
                      {row.bobRank || '—'}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] tabular-nums text-text">
                      {row.consensusRank || '—'}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="font-mono text-[11px] tabular-nums" style={{ color: gap.color }}>
                        {gap.text}
                      </div>
                      <div className="font-mono text-[8px] text-muted">{gap.hint}</div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] tabular-nums text-[#22D3EE]">
                      {formatKtcGap(row.ktcRankDelta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
