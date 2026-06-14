'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { deriveRadarVals, getCardBorderStyle, getGradeLabel, getTier, getVerdict } from '@/lib/verdict';
import { MARKET_VERDICT_DEFINITIONS } from '@/lib/verdict/marketVerdict';

export interface PlayerCardProps {
  playerName: string;
  position: string;
  team: string;
  playerId: string;
  tfoScore: number;
  radarVals: number[];
  tier: string;
  /** Override the position-default radar labels (used for real component axes). */
  axisLabels?: readonly string[];
  /** Market buy/sell signal vs KTC — rendered as a small colored pill. */
  marketVerdict?: {
    verdict: 'BOOM' | 'BUY' | 'HOLD' | 'SELL' | 'BUST';
    color: string;
    rankDelta: number | null;
    noMarketData: boolean;
  } | null;
}

const POSITION_AXES: Record<string, readonly string[]> = {
  QB: ['SCHEME', 'RUSH', 'MRQUAL', 'OLINE', 'PASS'],
  WR: ['RZTGT', 'TGTS', 'YAC', 'AIRYDS', 'SEPAR'],
  RB: ['RZTGT', 'TGTS', 'EXPLOS', 'OLINE', 'YAC'],
  TE: ['RZTGT', 'TGTS', 'YAC', 'AIRYDS', 'SEPAR'],
};
const DEFAULT_AXES = ['OPPORT', 'SITUAT', 'AGE', 'IQ', 'UPSIDE'] as const;

const POSITION_COLOR: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FBBF24',
  TE: '#A78BFA',
};

const GRID_STROKE = 'rgba(30,38,64,0.8)';

function axisLabelsFor(position: string): readonly string[] {
  return POSITION_AXES[(position ?? '').toUpperCase()] ?? DEFAULT_AXES;
}

function axisColorFor(position: string): string {
  return POSITION_COLOR[(position ?? '').toUpperCase()] ?? '#6b7a99';
}

function radarColors(verdictLabel: string): { fill: string; stroke: string } {
  if (verdictLabel.includes('BOOM')) {
    return { fill: 'rgba(54,231,161,0.25)', stroke: 'rgba(54,231,161,0.8)' };
  }
  if (verdictLabel === 'HOLD') {
    return { fill: 'rgba(251,191,36,0.25)', stroke: 'rgba(251,191,36,0.8)' };
  }
  return { fill: 'rgba(167,139,250,0.25)', stroke: 'rgba(167,139,250,0.8)' };
}

const N = 5;
const VB = 200;
const CX = 100;
const CY = 100;
const MAX_R = 58;
const LABEL_R = 82;

function vertexPoint(i: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

export default function PlayerCard({
  playerName,
  position,
  team,
  playerId,
  tfoScore,
  radarVals,
  tier,
  axisLabels: axisLabelsProp,
  marketVerdict,
}: PlayerCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const verdict = getVerdict(tfoScore);
  const displayTier = tier || getTier(tfoScore);
  const axisLabels = axisLabelsProp ?? axisLabelsFor(position);
  const axisColor = axisColorFor(position);
  const borderStyle = getCardBorderStyle(verdict.label);
  const radarStyle = radarColors(verdict.label);

  const radar = useMemo(() => {
    const vals = radarVals.length === N ? radarVals : deriveRadarVals(playerId, tfoScore);
    const rings = [1, 0.75, 0.5, 0.25].map((scale) => {
      const pts = Array.from({ length: N }, (_, i) => {
        const p = vertexPoint(i, MAX_R * scale);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });
      return pts.join(' ');
    });
    const dataPts = vals
      .map((v, i) => {
        const p = vertexPoint(i, MAX_R * v);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');
    const axisLines = Array.from({ length: N }, (_, i) => {
      const p = vertexPoint(i, MAX_R);
      return { x2: p.x, y2: p.y };
    });
    const labels = axisLabels.map((label, i) => {
      const p = vertexPoint(i, LABEL_R);
      return { label, x: p.x, y: p.y };
    });
    return { rings, dataPts, axisLines, labels, vals };
  }, [playerId, radarVals, tfoScore, axisLabels]);

  return (
    <div
      className="relative flex h-full min-h-[280px] flex-col overflow-visible rounded-[9px] bg-surface transition-transform duration-100 hover:-translate-y-px"
      style={borderStyle}
    >
      <div className="flex items-stretch px-3 pb-3 pt-3">
        <div
          className="relative w-[64px] shrink-0 overflow-hidden rounded-[7px] border border-border/60 bg-surface2"
          style={{ minHeight: 78 }}
        >
          {!imgFailed ? (
            <Image
              src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
              alt={playerName}
              width={64}
              height={78}
              unoptimized
              className="block h-full w-full object-cover object-top"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-figtree text-[15px] font-bold"
              style={{ color: verdict.color, background: '#141929' }}
            >
              {initials(playerName)}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-2.5">
          <div className="mb-1 font-figtree text-[13px] font-bold leading-tight text-text">
            {playerName}
          </div>
          <div className="mb-2 font-mono text-[12px] text-muted">
            {position} · {team}
          </div>
          <div
            className="font-figtree text-[32px] font-normal leading-none tracking-[-1.5px]"
            style={{ color: verdict.color }}
          >
            {tfoScore.toFixed(1)}
          </div>
          <div className="mt-1.5 font-mono text-[10px] text-muted">{displayTier}</div>
        </div>
      </div>
      {marketVerdict === undefined ? (
        // Surface doesn't supply a market verdict (landing / league cards):
        // show the descriptive performance grade, not an action signal.
        <div
          className="mx-3 mb-2.5 rounded-[5px] border border-border bg-white/[0.03] py-2 text-center font-figtree text-[11px] font-semibold tracking-wide text-text"
          title="Performance grade — descriptive quality"
        >
          {getGradeLabel(tfoScore)}
        </div>
      ) : marketVerdict && !marketVerdict.noMarketData ? (
        <div
          className="mx-3 mb-2.5 cursor-help rounded-[5px] py-2 text-center font-figtree text-[11px] font-semibold tracking-wide"
          style={{
            color: marketVerdict.color,
            background: `${marketVerdict.color}1f`,
            border: `1px solid ${marketVerdict.color}55`,
          }}
          title={MARKET_VERDICT_DEFINITIONS[marketVerdict.verdict]}
        >
          {marketVerdict.verdict}
        </div>
      ) : (
        <div
          className="mx-3 mb-2.5 flex cursor-help items-center justify-center gap-1.5 rounded-[5px] border border-border py-2 text-center font-figtree text-[11px] font-semibold tracking-wide text-muted"
          title="No market data — held by default"
        >
          HOLD <span className="font-mono text-[9px] text-muted/60">N/A</span>
        </div>
      )}
      <div className="flex flex-1 items-center justify-center px-1 pb-3 pt-1">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="block w-full"
          style={{ minHeight: 140, maxHeight: 160 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform={`translate(${CX},${CY})`}>
            {radar.rings.map((pts) => (
              <polygon
                key={pts}
                points={pts}
                fill="none"
                stroke={GRID_STROKE}
                strokeWidth={1}
              />
            ))}
            {radar.axisLines.map((line, i) => (
              <line
                key={`axis-${i}`}
                x1={0}
                y1={0}
                x2={line.x2}
                y2={line.y2}
                stroke={GRID_STROKE}
                strokeWidth={1}
              />
            ))}
            <polygon
              points={radar.dataPts}
              fill={radarStyle.fill}
              stroke={radarStyle.stroke}
              strokeWidth={2}
            />
            {radar.labels.map((l) => (
              <text
                key={l.label}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono"
                fill={axisColor}
                fillOpacity={0.95}
                fontSize={9}
              >
                {l.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
