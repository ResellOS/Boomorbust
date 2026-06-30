'use client';

import type { TradeOffer } from '@/lib/trade/types';
import PlayerAvatar from '@/components/trade/PlayerAvatar';

interface TradeOfferCardProps {
  offer: TradeOffer;
  active?: boolean;
  onSelect?: () => void;
}

export default function TradeOfferCard({ offer, active, onSelect }: TradeOfferCardProps) {
  const leagueClass =
    offer.leagueType === 'dynasty'
      ? 'text-bust'
      : offer.leagueType === 'redraft'
        ? 'text-boom'
        : 'text-text';

  const primaryGive = offer.givePlayers[0];
  const borderGive =
    offer.verdict === 'BOOM' ? '#36E7A1' : offer.verdict === 'MISS' ? '#A78BFA' : '#FBBF24';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
      className={`mb-2 cursor-pointer rounded-lg border bg-surface px-4 py-3.5 transition-colors hover:border-boom/20 ${
        active ? 'border-boom/30 bg-boom/[0.02]' : 'border-border'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`font-figtree text-xs font-bold ${leagueClass}`}>{offer.leagueName}</span>
        <span className="font-mono text-[10px] text-muted">· {offer.timeAgo}</span>
        {offer.isNew ? (
          <span className="rounded border border-boom/25 bg-boom/10 px-[7px] py-0.5 font-mono text-[9px] font-bold text-boom">
            NEW
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted">{offer.managerHandle} vs You</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[320px] items-center gap-3.5"
          style={{ gridTemplateColumns: '1fr auto 1fr auto auto' }}
        >
        <div className="flex items-center gap-2.5">
          {primaryGive ? (
            <>
              <PlayerAvatar
                playerId={primaryGive.playerId}
                name={primaryGive.name}
                size={48}
                borderColor={borderGive}
                textColor={borderGive}
              />
              <div>
                <div className="font-figtree text-[14px] font-semibold text-text">
                  {primaryGive.name}
                </div>
                <div className="font-mono text-[10px] text-muted">
                  {primaryGive.position} · {primaryGive.team}
                </div>
              </div>
            </>
          ) : (
            <span className="font-figtree text-xs text-muted">Picks only</span>
          )}
        </div>
        <div className="text-[22px] text-muted opacity-50">⇄</div>
        <div className="flex flex-col gap-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted">You Receive</div>
          {offer.receivePlayers.map((p) => (
            <div key={p.playerId} className="flex items-center gap-[7px]">
              <PlayerAvatar
                playerId={p.playerId}
                name={p.name}
                size={36}
                borderColor="#A78BFA"
                textColor="#A78BFA"
              />
              <div>
                <div className="font-figtree text-xs font-semibold text-text">{p.name}</div>
                <div className="font-mono text-[10px] text-muted">
                  {p.position} · {p.team}
                </div>
              </div>
            </div>
          ))}
          {offer.receivePicks.map((pick, i) => (
            <div
              key={`rp-${i}`}
              className="flex items-center gap-1.5 rounded border border-border bg-surface2 px-2 py-0.5"
            >
              <span className="rounded bg-boom/10 px-1.5 py-px font-mono text-[9px] font-bold text-boom">
                {pick.label}
              </span>
              <span className="font-mono text-[9.5px] text-muted">{pick.season} Round Pick</span>
            </div>
          ))}
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted">Offer Value</div>
          <div className="font-figtree text-[26px] font-bold leading-none tracking-[-0.5px] text-boom">
            {offer.offerValue > 0 ? '+' : ''}
            {offer.offerValue.toFixed(1)}
          </div>
          <div className="font-mono text-[9px] text-muted">Dynasty Edge</div>
        </div>
        </div>
      </div>
    </div>
  );
}
