'use client';

import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from '@/components/dashboard/PlayerBhsActions';
import type { OvervaluedPlayer } from '@/app/api/dashboard/snapshot/route';

interface Props {
  players: OvervaluedPlayer[];
  /** League context for trade finder links. */
  contextLeagueId?: string | null;
  className?: string;
}

function formatKtc(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function OvervaluedAssets({ players, contextLeagueId = null, className = '' }: Props) {
  return (
    <div className={`glass-panel p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
          Top 3 Overvalued
        </h3>
        <span className="text-[8px] font-mono-tactical text-slate-600 uppercase">MO · PPG</span>
      </div>

      {players.length === 0 ? (
        <p className="text-[10px] text-slate-600 font-mono-tactical py-4 text-center">
          No sell signals — market aligned with production.
        </p>
      ) : (
        <ul className="slim-scroll space-y-2 max-h-[min(280px,40vh)] overflow-y-auto pr-1">
          {players.map((p) => (
            <li
              key={p.player_id}
              className="glass-panel flex flex-col gap-2 px-2.5 py-2 !rounded-lg"
            >
              <div className="flex items-center gap-2.5">
              <PlayerAvatar
                playerId={p.player_id}
                playerName={p.name}
                position={p.position}
                size={36}
                className="border border-white/15"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-white truncate">{p.name}</span>
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 tracking-[0.12em]"
                    style={{
                      color: '#0b0e14',
                      background: 'linear-gradient(180deg, #FF6B6B 0%, #EF4444 100%)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      textShadow: '0 0 8px rgba(239,68,68,0.35)',
                      boxShadow:
                        '0 0 12px rgba(239,68,68,0.65), 0 0 24px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    SELL
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono-tactical">
                  {p.position} · {p.team} · {p.seasonAvgPpg?.toFixed(1) ?? '—'} PPG roll ·{' '}
                  {p.weeklyPts.toFixed(1)} wk
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-mono-tactical font-black text-[#36E7A1]">
                  {formatKtc(p.ktcValue)}
                </div>
                <div className="text-[8px] text-[#EF4444] font-mono-tactical font-bold">
                  MO {p.moPts >= 0 ? '+' : ''}
                  {p.moPts?.toFixed(1) ?? '—'}
                </div>
                <div className="text-[8px] text-slate-600">KTC</div>
              </div>
              </div>
              <PlayerBhsActions
                tfoVerdict={p.tfoVerdict ?? null}
                playerId={p.player_id}
                playerName={p.name}
                leagueId={contextLeagueId}
                compact
                className="justify-center"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
