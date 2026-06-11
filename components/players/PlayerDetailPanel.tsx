'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { HubPlayer } from '@/lib/players/types';
import { generateBobVerdict } from '@/lib/players/bobVerdict';
import {
  VERDICT_BADGE_CLASS,
  getDynastyTier,
  initials,
  ratingColorClass,
} from '@/lib/players/utils';
import PlayerRadar from './PlayerRadar';

const WATCHLIST_KEY = 'bb_watchlist';

interface PlayerDetailPanelProps {
  player: HubPlayer;
  leagueNames: string[];
}

function trendGlyph(trend: HubPlayer['trend']): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function trendColor(trend: HubPlayer['trend']): string {
  if (trend === 'up') return 'text-boom';
  if (trend === 'down') return 'text-bust';
  return 'text-muted';
}

const SIGNAL_ROWS: { key: keyof HubPlayer['subScores']; label: string }[] = [
  { key: 'opportunity', label: 'OPPORTUNITY' },
  { key: 'situation', label: 'SITUATION' },
  { key: 'iq', label: 'IQ' },
  { key: 'ageCurve', label: 'AGE CURVE' },
  { key: 'upside', label: 'UPSIDE' },
];

export default function PlayerDetailPanel({ player, leagueNames }: PlayerDetailPanelProps) {
  const [watching, setWatching] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const tier = getDynastyTier(player.tfoScore);
  const verdictClass = VERDICT_BADGE_CLASS[player.verdict];
  const bob = generateBobVerdict(
    player.fullName,
    player.position,
    player.tfoScore,
    player.subScores,
  );
  const ratingClass = ratingColorClass(player.tfoScore);
  const borderColor =
    player.verdict === 'STRONG BOOM' || player.verdict === 'BOOM'
      ? 'border-boom'
      : player.verdict === 'HOLD'
        ? 'border-hold'
        : 'border-bust';

  const handleWatch = useCallback(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(player.playerId)) {
        list.push(player.playerId);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      }
      setWatching(true);
    } catch {
      setWatching(true);
    }
  }, [player.playerId]);

  return (
    <div className="flex h-full flex-col bg-[#080d14] shadow-[inset_0_0_20px_rgba(54,231,161,0.03)]">
      <div className="flex shrink-0 items-stretch gap-4 border-b border-border p-[18px]">
        <div
          className={`relative flex h-[130px] w-[110px] shrink-0 items-center justify-center self-center overflow-hidden rounded-full border-[3px] bg-[radial-gradient(circle,rgba(54,231,161,0.18)_0%,transparent_68%)] ${borderColor}`}
        >
          {!imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://sleepercdn.com/content/nfl/players/thumb/${player.playerId}.jpg`}
              alt={player.fullName}
              className="absolute inset-0 h-full w-full rounded-full object-cover object-top"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="relative z-[1] font-mono text-[22px] text-boom">
              {initials(player.fullName)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between pl-2">
          <div>
            <div className="mb-[3px] font-figtree text-xl font-normal tracking-[0.5px] text-text">
              {player.fullName.toUpperCase()}
            </div>
            <div className="font-mono text-[9px] text-muted">
              {player.position} · {player.team}
              {player.age ? ` · Age ${player.age}` : ''}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-4">
            <div>
              <div className="mb-[3px] font-mono text-[8px] uppercase tracking-[2px] text-muted">
                Dynasty Rating
              </div>
              <div className={`font-figtree text-[52px] font-normal leading-none tracking-[-3px] ${ratingClass}`}>
                {player.tfoScore.toFixed(1)}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                {tier} Tier
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span
                className={`inline-block whitespace-nowrap rounded-[5px] px-[14px] py-[5px] font-figtree text-[11px] font-medium ${verdictClass}`}
              >
                {player.verdict}
              </span>
              <div className="text-center">
                <div className="mb-0.5 font-mono text-[8px] uppercase tracking-[2px] text-muted">
                  Trend
                </div>
                <div className={`font-figtree text-xl font-normal leading-none ${trendColor(player.trend)}`}>
                  {trendGlyph(player.trend)}
                </div>
                <div className="mt-0.5 font-mono text-[8px] text-muted">This Week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid shrink-0 border-b border-border"
        style={{ gridTemplateColumns: '190px 1fr 148px' }}
      >
        <div className="border-r border-border bg-[#060a10] px-2.5 py-3">
          <PlayerRadar subScores={player.subScores} />
        </div>
        <div className="border-r border-border px-3.5 py-[13px]">
          <div className="mb-2 font-mono text-[7.5px] uppercase tracking-[2px] text-muted">
            Signal Bars
          </div>
          {SIGNAL_ROWS.map(({ key, label }) => {
            const val = player.subScores[key];
            return (
              <div key={key} className="mb-2 flex items-center gap-2 last:mb-0">
                <div className="w-[88px] shrink-0 font-mono text-[8.5px] text-muted">{label}</div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-border">
                  <div
                    className="h-full rounded-[3px] bg-boom"
                    style={{ width: `${Math.min(100, val)}%` }}
                  />
                </div>
                <div className="w-6 shrink-0 text-right font-mono text-[10px] text-boom">{val}</div>
              </div>
            );
          })}
          <div className="mt-[13px]">
            <div className="mb-[5px] font-mono text-[7.5px] uppercase tracking-[2px] text-muted">
              BOB Verdict
            </div>
            <div className="mb-[5px] font-figtree text-lg font-normal text-boom">{bob.headline}</div>
            <p className="font-figtree text-[10px] italic leading-[1.55] text-[#9aa3b8]">
              {bob.description}
            </p>
          </div>
        </div>
        <div className="px-3 py-[13px]">
          <div className="mb-2 font-mono text-[7.5px] uppercase tracking-[2px] text-muted">
            League Presence
          </div>
          <p className="mb-1 font-figtree text-[11px] leading-snug text-muted">
            Rostered in your leagues
          </p>
          <span className="mb-2.5 block font-figtree text-xl font-normal leading-tight text-text">
            {leagueNames.length}
          </span>
          {leagueNames.length > 0 ? (
            leagueNames.map((name) => (
              <div key={name} className="mb-[7px] flex items-center gap-[7px]">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-boom" />
                <span className="font-figtree text-[11px] text-text">{name}</span>
              </div>
            ))
          ) : (
            <span className="font-mono text-[9px] text-muted">Not on your roster</span>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-border px-4 py-3">
        <Link
          href={`/trade?action=acquire&player=${player.playerId}`}
          className="rounded-md bg-boom py-2.5 text-center font-figtree text-[11px] font-medium tracking-wide text-bg no-underline"
        >
          TRADE FOR
        </Link>
        <Link
          href={`/trade?action=offer&player=${player.playerId}`}
          className="rounded-md border border-bust py-2.5 text-center font-figtree text-[11px] font-medium tracking-wide text-bust no-underline"
        >
          TRADE AWAY
        </Link>
        <button
          type="button"
          onClick={handleWatch}
          className={`rounded-md border py-2.5 font-figtree text-[11px] font-medium tracking-wide ${
            watching
              ? 'border-boom text-boom'
              : 'border-muted text-muted hover:text-text'
          }`}
        >
          {watching ? 'WATCHING' : 'WATCH'}
        </button>
      </div>

      <div className="shrink-0 px-5 py-3.5">
        <div className="font-mono text-[8px] uppercase tracking-[2px] text-text">Dynasty Timeline</div>
        <div className="mb-4 font-mono text-[8px] text-muted">Score progression across models</div>
        <div className="relative flex items-start">
          <div className="absolute left-2 right-2 top-2 z-0 h-px bg-border" />
          {[
            { key: 'BBB', value: '—', real: false },
            { key: 'RTS', value: '—', real: false },
            { key: 'F-FIG', value: '—', real: false },
            { key: 'TFO', value: player.tfoScore.toFixed(1), real: true },
          ].map((step) => (
            <div key={step.key} className="relative z-[1] flex flex-1 flex-col items-center gap-[7px]">
              <div
                className={`h-[17px] w-[17px] shrink-0 rounded-full ${
                  step.real
                    ? 'border-2 border-boom bg-boom'
                    : 'border-2 border-boom bg-[#080d14]'
                }`}
              />
              <div className="text-center font-mono text-[7px] uppercase leading-snug tracking-wide text-muted">
                {step.key}
              </div>
              <div className={`text-center font-figtree text-lg font-normal ${step.real ? 'text-boom' : 'text-muted'}`}>
                {step.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
