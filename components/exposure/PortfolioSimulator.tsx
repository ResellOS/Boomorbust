'use client';

import { useMemo, useState } from 'react';
import type { PortfolioOverview, SimulatorPlayer } from '@/lib/exposure/types';
import { POSITION_BAR_COLORS } from '@/lib/exposure/portfolioEngine';

interface PortfolioSimulatorProps {
  overview: PortfolioOverview;
  ownedPool: SimulatorPlayer[];
  acquirePool: SimulatorPlayer[];
}

export default function PortfolioSimulator({
  overview,
  ownedPool,
  acquirePool,
}: PortfolioSimulatorProps) {
  const [tradeAwayId, setTradeAwayId] = useState('');
  const [acquireId, setAcquireId] = useState('');
  const [simulated, setSimulated] = useState(false);

  const away = ownedPool.find((p) => p.playerId === tradeAwayId);
  const acquire = acquirePool.find((p) => p.playerId === acquireId);

  const result = useMemo(() => {
    if (!away || !acquire) return null;
    const awayVal = away.tfoScore * 100 * Math.max(1, away.leagueCount);
    const acquireVal = acquire.tfoScore * 100;
    const beforeVal = overview.totalAssetValue;
    const afterVal = beforeVal - awayVal + acquireVal;
    const beforeOdds = overview.championshipOdds;
    const delta = Math.round((acquire.tfoScore - away.tfoScore) / 15 * 10) / 10;
    const afterOdds = Math.min(45, Math.round((beforeOdds + delta) * 10) / 10);

    const pos = acquire.position.toUpperCase();
    const beforeRow = overview.positionBreakdown.find((r) => r.position === pos);
    const beforePct = beforeRow?.pct ?? 0;
    const totalTfoBefore = beforeVal / 100;
    const awayPosTfo = away.position.toUpperCase() === pos ? away.tfoScore * away.leagueCount : 0;
    const afterPosTfo =
      (beforePct / 100) * totalTfoBefore - awayPosTfo + (pos === acquire.position.toUpperCase() ? acquire.tfoScore : 0);
    const afterPct =
      totalTfoBefore - away.tfoScore * away.leagueCount + acquire.tfoScore > 0
        ? Math.round(
            (afterPosTfo / (totalTfoBefore - away.tfoScore * away.leagueCount + acquire.tfoScore)) *
              1000,
          ) / 10
        : beforePct;

    return {
      beforeVal,
      afterVal,
      beforeOdds,
      afterOdds,
      position: pos,
      beforePct,
      afterPct,
    };
  }, [away, acquire, overview]);

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-text">
          Portfolio Simulator
        </span>
        <span className="rounded border border-hold/30 bg-hold/10 px-1.5 py-px font-mono text-[8px] uppercase text-hold">
          Beta
        </span>
      </div>
      <p className="mt-1 font-mono text-[9px] text-muted">
        Estimated impact based on BOB dynasty ratings — no trade is sent.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[9px] uppercase text-muted">Trade Away</span>
          <select
            value={tradeAwayId}
            onChange={(e) => {
              setTradeAwayId(e.target.value);
              setSimulated(false);
            }}
            className="mt-1 w-full rounded border border-border bg-bg px-2 py-2 font-mono text-[10px] text-text outline-none"
          >
            <option value="">Select player…</option>
            {ownedPool.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.fullName} ({p.tfoScore.toFixed(1)})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[9px] uppercase text-muted">Acquire</span>
          <select
            value={acquireId}
            onChange={(e) => {
              setAcquireId(e.target.value);
              setSimulated(false);
            }}
            className="mt-1 w-full rounded border border-border bg-bg px-2 py-2 font-mono text-[10px] text-text outline-none"
          >
            <option value="">Select player…</option>
            {acquirePool.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.fullName} ({p.tfoScore.toFixed(1)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={!tradeAwayId || !acquireId}
        onClick={() => setSimulated(true)}
        className="mt-3 w-full rounded border-none bg-boom py-2.5 font-mono text-[10px] uppercase tracking-wide text-bg disabled:opacity-40 md:w-auto md:px-8"
      >
        Simulate
      </button>

      {simulated && result && (
        <div className="mt-4 space-y-2 border-t border-[#1e2640] pt-3 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted">Portfolio Value</span>
            <span className="text-text">
              {result.beforeVal.toLocaleString()} →{' '}
              <span className="text-boom">{result.afterVal.toLocaleString()}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Championship Odds</span>
            <span className="text-text">
              {result.beforeOdds}% → <span className="text-boom">{result.afterOdds}%</span>
              <span className="ml-1 text-[8px] text-muted">Estimated</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted" style={{ color: POSITION_BAR_COLORS[result.position] }}>
              {result.position} Exposure
            </span>
            <span className="text-text">
              {result.beforePct}% → <span className="text-boom">{result.afterPct}%</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
