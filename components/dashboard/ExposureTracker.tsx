'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from '@/components/dashboard/PlayerBhsActions';

export interface ExposureTrackerProps {
  ownedPlayerIds: string[];
  allPlayers: Record<
    string,
    {
      full_name?: string;
      position?: string;
      leagueExposure?: number;
    }
  >;
  leagues: ReadonlyArray<{ id?: string; name?: string }>;
  verdictByPlayerId?: Record<string, string>;
  contextLeagueId?: string | null;
  className?: string;
}

export default function ExposureTracker({
  ownedPlayerIds: _ownedPlayerIds, // eslint-disable-line @typescript-eslint/no-unused-vars
  allPlayers,
  leagues,
  verdictByPlayerId = {},
  contextLeagueId = null,
  className = '',
}: ExposureTrackerProps) {
  const totalLeagues = Math.max(1, leagues?.length ?? 1);

  const rows = useMemo(() => {
    return Object.entries(allPlayers ?? {})
      .map(([player_id, meta]) => ({
        player_id,
        name: typeof meta.full_name === 'string' ? meta.full_name : player_id,
        position: typeof meta.position === 'string' ? meta.position.toUpperCase() : '—',
        leagueCount: typeof meta.leagueExposure === 'number' ? meta.leagueExposure : 0,
      }))
      .filter((r) => r.leagueCount >= 2)
      .sort((a, b) => b.leagueCount - a.leagueCount)
      .slice(0, 5);
  }, [allPlayers]);

  const highRisk = rows.some((r) => r.leagueCount / totalLeagues > 0.6);

  if (!rows.length) return null;

  return (
    <div className={clsx('glass-panel p-3', className)}>
      <h3 className="text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>
        EXPOSURE TRACKER
      </h3>
      <p
        className="font-mono-tactical mb-3 uppercase font-semibold"
        style={{ fontSize: '8px', color: '#EF4444', letterSpacing: '0.15em' }}
      >
        PORTFOLIO CONCENTRATION RISK
      </p>

      {highRisk ? (
        <div
          className="font-mono-tactical font-bold uppercase mb-3 rounded border"
          style={{
            fontSize: '8px',
            padding: '6px 10px',
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
            color: '#EF4444',
          }}
        >
          ⚠ HIGH EXPOSURE RISK
        </div>
      ) : null}

      <ul className="space-y-3">
        {rows.map((r) => {
          const pct = (r.leagueCount / totalLeagues) * 100;
          const barColor = pct > 60 ? '#EF4444' : pct > 40 ? '#FBBF24' : '#36E7A1';
          const labelColor = barColor;

          return (
            <li key={r.player_id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
              <PlayerAvatar playerId={r.player_id} playerName={r.name} position={r.position} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-white truncate">{r.name}</span>
                  <span className="text-[8px] font-bold uppercase px-1 py-px rounded border border-white/12 text-[#94A3B8] shrink-0">
                    {r.position}
                  </span>
                </div>
                <div
                  className="w-full rounded-sm overflow-hidden"
                  style={{ height: '4px', background: 'rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
              <span
                className="shrink-0 font-mono-tactical font-bold tabular-nums"
                style={{ fontSize: '8px', color: labelColor }}
              >
                {r.leagueCount}/{totalLeagues} lgs
              </span>
              </div>
              <PlayerBhsActions
                tfoVerdict={verdictByPlayerId[r.player_id] ?? null}
                playerId={r.player_id}
                playerName={r.name}
                leagueId={contextLeagueId}
                compact
                className="pl-9"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
