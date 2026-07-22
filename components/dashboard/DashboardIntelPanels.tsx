'use client';

import { useEffect, useState } from 'react';

// Intelligence panels backed by the shared engine tables via the app API routes:
//   /api/sell-windows  /api/regime-alerts  /api/breakout
//   /api/championship  /api/managers/profiles
//
// Contract from the spec: each panel is HIDDEN when its data is empty and VISIBLE
// when rows exist. Most of these tables are engine-populated and currently empty,
// so those panels self-hide until the engine fills them; manager_profiles has data
// so the GM panel renders today.

interface SellAlert {
  player_id?: string;
  player_name?: string;
  reason?: string;
  recommendation?: string;
  urgency?: string;
  alert_type?: string;
}
interface RegimeAlert {
  player_id?: string;
  player_name?: string;
  change_type?: string;
  change_description?: string;
}
interface BreakoutCandidate {
  player_id?: string;
  player_name?: string;
  position?: string;
  match_score?: number;
  breakout_probability?: number;
  matched_signals?: { label: string }[];
}
interface GmProfile {
  display_name?: string;
  archetype?: string;
  trade_frequency?: string | number;
  transaction_count?: number;
}

const card = 'rounded-lg border border-border bg-surface p-3';
const head = 'mb-2 font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px]';

export default function DashboardIntelPanels({ leagueId }: { leagueId?: string }) {
  const [sell, setSell] = useState<SellAlert[]>([]);
  const [regime, setRegime] = useState<RegimeAlert[]>([]);
  const [breakout, setBreakout] = useState<BreakoutCandidate[]>([]);
  const [champ, setChamp] = useState<Record<string, unknown>[]>([]);
  const [gm, setGm] = useState<GmProfile[]>([]);

  useEffect(() => {
    const lg = leagueId ? `?leagueId=${encodeURIComponent(leagueId)}` : '';
    const asJson = (r: Response) => (r.ok ? r.json() : null);
    fetch(`/api/sell-windows${lg}`).then(asJson).then((d) => setSell(d?.alerts ?? [])).catch(() => {});
    fetch(`/api/regime-alerts${lg}`).then(asJson).then((d) => setRegime(d?.alerts ?? [])).catch(() => {});
    fetch(`/api/breakout?minScore=5`).then(asJson).then((d) => setBreakout(d?.candidates ?? [])).catch(() => {});
    fetch(`/api/championship${lg}`).then(asJson).then((d) => setChamp(d?.odds ?? [])).catch(() => {});
    fetch(`/api/managers/profiles${lg}`).then(asJson).then((d) => setGm(d?.profiles ?? [])).catch(() => {});
  }, [leagueId]);

  const nothing =
    sell.length === 0 && regime.length === 0 && breakout.length === 0 && champ.length === 0 && gm.length === 0;
  if (nothing) return null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {sell.length > 0 && (
        <div className={card}>
          <div className={`${head} text-hold`}>Sell Windows</div>
          <div className="flex flex-col gap-1.5">
            {sell.slice(0, 3).map((a, i) => (
              <div key={a.player_id ?? i} className="text-[12px]">
                <span className="font-figtree text-text">{a.player_name ?? 'Player'}</span>
                <span className="ml-1.5 font-mono text-[10px] uppercase text-hold">{a.urgency ?? a.alert_type}</span>
                {a.reason ? <div className="text-[11px] text-muted">{a.reason}</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {regime.length > 0 && (
        <div className={card}>
          <div className={`${head} text-boom`}>Regime Alerts</div>
          <div className="flex flex-col gap-1.5">
            {regime.slice(0, 3).map((a, i) => (
              <div key={a.player_id ?? i} className="text-[12px]">
                <span className="font-figtree text-text">{a.player_name ?? 'Player'}</span>
                <span className="ml-1.5 font-mono text-[10px] uppercase text-boom">{a.change_type}</span>
                {a.change_description ? <div className="text-[11px] text-muted">{a.change_description}</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {breakout.length > 0 && (
        <div className={card}>
          <div className={`${head} text-boom`}>Breakout Radar</div>
          <div className="flex flex-col gap-1.5">
            {breakout.slice(0, 4).map((b, i) => (
              <div key={b.player_id ?? i} className="flex items-center justify-between text-[12px]">
                <span className="font-figtree text-text">
                  {b.player_name ?? 'Player'}{' '}
                  <span className="text-[10px] text-muted">{b.position}</span>
                </span>
                <span className="font-mono text-[11px] text-boom">
                  {(b.matched_signals?.length ?? 0)}/9 · {Math.round((b.breakout_probability ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {champ.length > 0 && (
        <div className={card}>
          <div className={`${head} text-boom`}>Championship Odds</div>
          <div className="text-[11px] text-muted">{champ.length} teams ranked</div>
        </div>
      )}

      {gm.length > 0 && (
        <div className={card}>
          <div className={`${head} text-bust`}>GM Profiles</div>
          <div className="flex flex-col gap-1.5">
            {gm.slice(0, 4).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <span className="font-figtree text-text">{p.display_name ?? 'Manager'}</span>
                <span className="font-mono text-[10px] uppercase text-bust">{p.archetype ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
