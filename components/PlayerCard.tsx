'use client';

import * as React from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import {
  getPlayerPhotoUrl,
  getPlayerInitials,
  POSITION_COLORS,
  normalizePosition,
} from '@/lib/sleeper/playerPhotos';
import SparklineGraph from '@/components/SparklineGraph';

export interface PlayerCardProps {
  player_id: string;
  player_name: string;
  position: string;
  team: string;
  age: number;
  ppg?: number;
  ktc_value?: number;
  bbv_value?: number;
  injury_status?: string | null;
  trend?: 'rising' | 'stable' | 'declining';
  size?: 'sm' | 'md' | 'lg';
  showGraph?: boolean;
  sparkData?: number[];
  priority?: boolean;
  onClick?: () => void;
}

const EDGE_INJ: Record<string, { dot: string; label: string }> = {
  Q: { dot: 'bg-amber-400', label: 'Q' },
  D: { dot: 'bg-orange-500', label: 'D' },
  O: { dot: 'bg-red-500', label: 'O' },
  IR: { dot: 'bg-red-600', label: 'IR' },
};

function PosBadge({ pos }: { pos: string }) {
  const k = normalizePosition(pos);
  const c = POSITION_COLORS[k] ?? POSITION_COLORS.WR;
  return (
    <span
      className="text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
      style={{ backgroundColor: `${c.bg}99`, color: c.text }}
    >
      {pos.toUpperCase()}
    </span>
  );
}

function TrendIcon({ trend }: { trend?: PlayerCardProps['trend'] }) {
  if (trend === 'rising') return <span className="text-green-400 text-xs">↑</span>;
  if (trend === 'declining') return <span className="text-red-400 text-xs">↓</span>;
  return <span className="text-slate-500 text-xs">→</span>;
}

export default function PlayerCard({
  player_id,
  player_name,
  position,
  team,
  age,
  ppg,
  ktc_value,
  bbv_value,
  injury_status,
  trend,
  size = 'md',
  showGraph = false,
  sparkData,
  priority = false,
  onClick,
}: PlayerCardProps) {
  const [imgErr, setImgErr] = React.useState(false);
  const k = normalizePosition(position);
  const borderCol = POSITION_COLORS[k]?.border ?? '#64748F';
  const photo = getPlayerPhotoUrl(player_id);

  const valueLabel = bbv_value != null ? Math.round(bbv_value) : ktc_value != null ? Math.round(ktc_value) : '—';

  const demoSpark =
    sparkData && sparkData.length >= 2
      ? sparkData
      : [4800, 4900, 4850, 5100, 5050, 5200, 5150, 5300];

  const sm = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!imgErr ? (
        <Image
          src={photo}
          alt=""
          width={32}
          height={32}
          className="rounded-full object-cover shrink-0"
          style={{ border: `2px solid ${borderCol}` }}
          onError={() => setImgErr(true)}
          unoptimized
          priority={priority}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{
            border: `2px solid ${borderCol}`,
            background: POSITION_COLORS[k]?.bg ?? '#1F2937',
            color: POSITION_COLORS[k]?.text ?? '#fff',
          }}
        >
          {getPlayerInitials(player_name)}
        </div>
      )}
      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{player_name}</span>
      <PosBadge pos={position} />
      <span className="text-xs text-[var(--text-muted)] hidden sm:inline">{age}</span>
      {ppg != null && <span className="text-xs text-[var(--text-secondary)]">{ppg.toFixed(1)} PPG</span>}
    </>
  );

  const mdContent = (
    <>
      {!imgErr ? (
        <Image
          src={photo}
          alt=""
          width={56}
          height={56}
          className="rounded-full object-cover mx-auto"
          style={{ border: `2px solid ${borderCol}` }}
          onError={() => setImgErr(true)}
          unoptimized
          priority={priority}
        />
      ) : (
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center font-bold text-sm"
          style={{
            border: `2px solid ${borderCol}`,
            background: POSITION_COLORS[k]?.bg ?? '#1F2937',
            color: POSITION_COLORS[k]?.text ?? '#fff',
          }}
        >
          {getPlayerInitials(player_name)}
        </div>
      )}
      <p className="text-white font-semibold text-center truncate mt-2">{player_name}</p>
      <div className="flex items-center justify-center gap-2 mt-1">
        <PosBadge pos={position} />
        <span className="text-xs text-[var(--text-secondary)]">{team}</span>
      </div>
      <p className="text-center text-xs text-[var(--text-muted)] mt-1">
        Age {age}
        {ppg != null && ` · ${ppg.toFixed(1)} PPG`}
      </p>
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{valueLabel}</span>
        <TrendIcon trend={trend} />
      </div>
      {injury_status && EDGE_INJ[injury_status.toUpperCase()] && (
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className={clsx('w-2 h-2 rounded-full', EDGE_INJ[injury_status.toUpperCase()]!.dot)} />
          <span className="text-xs text-[var(--text-secondary)]">{EDGE_INJ[injury_status.toUpperCase()]!.label}</span>
        </div>
      )}
      {showGraph && (
        <div className="mt-3">
          <SparklineGraph data={demoSpark} width={200} height={40} />
        </div>
      )}
    </>
  );

  const lgContent = (
    <>
      {!imgErr ? (
        <Image
          src={photo}
          alt=""
          width={80}
          height={80}
          className="rounded-xl object-cover"
          style={{ border: `2px solid ${borderCol}` }}
          onError={() => setImgErr(true)}
          unoptimized
          priority={priority}
        />
      ) : (
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center text-lg font-black"
          style={{
            border: `2px solid ${borderCol}`,
            background: POSITION_COLORS[k]?.bg ?? '#1F2937',
            color: POSITION_COLORS[k]?.text ?? '#fff',
          }}
        >
          {getPlayerInitials(player_name)}
        </div>
      )}
      <h4 className="display text-3xl mt-3 text-[var(--text-primary)]">{player_name}</h4>
      <div className="flex gap-2 items-center mt-1">
        <PosBadge pos={position} />
        <span className="text-[var(--text-secondary)]">{team}</span>
        <span className="text-[var(--text-muted)]">·</span>
        <span className="text-[var(--text-muted)]">{age}</span>
      </div>
      {ppg != null && (
        <p className="text-[var(--text-secondary)] mt-2 text-sm">{ppg.toFixed(1)} PPG projected</p>
      )}
      <div className="flex items-baseline gap-3 mt-3">
        <span className="display text-4xl gradient-text">{valueLabel}</span>
        <TrendIcon trend={trend} />
      </div>
      {injury_status && EDGE_INJ[injury_status.toUpperCase()] && (
        <div className="flex items-center gap-2 mt-2">
          <span className={clsx('w-2 h-2 rounded-full', EDGE_INJ[injury_status.toUpperCase()]!.dot)} />
          <span className="text-sm text-orange-300">{injury_status}</span>
        </div>
      )}
      {showGraph && (
        <div className="mt-4">
          <SparklineGraph data={demoSpark} width={280} height={48} />
        </div>
      )}
    </>
  );

  const Wrapper = onClick ? 'button' : 'div';

  if (size === 'sm') {
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={clsx(
          'flex items-center gap-2 min-w-0 w-full text-left',
          onClick && 'hover:opacity-90 cursor-pointer'
        )}
      >
        {sm}
      </Wrapper>
    );
  }

  if (size === 'lg') {
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={clsx('card card-lg p-5 text-left w-full', onClick && 'cursor-pointer hover:border-[var(--border-hover)]')}
      >
        {lgContent}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx('card p-4 w-full', onClick && 'cursor-pointer hover:border-[var(--border-hover)]')}
    >
      {mdContent}
    </Wrapper>
  );
}
