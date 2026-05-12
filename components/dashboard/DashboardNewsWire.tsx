'use client';

import { useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import type { DashboardSnapshot, SnapshotOffer } from '@/app/api/dashboard/snapshot/route';
import type { TFOVerdict } from '@/lib/tfo/formula';

const POS_HEX: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FBBF24',
  TE: '#A78BFA',
};

const WIRE_STORAGE = 'bb-dashboard-wire-tfo-v1';

function tradeOfferGroupKey(offerId: string): string {
  const i = offerId.lastIndexOf('-');
  return i > 0 ? offerId.slice(0, i) : offerId;
}

type Seg = { k: 't'; s: string } | { k: 'p'; name: string; pos: string };

export type WireAccent = 'neutral' | 'boom' | 'bust';

export interface WireLine {
  id: string;
  accent: WireAccent;
  parts: Seg[];
}

function readWireMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(WIRE_STORAGE);
    const o = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function writeWireMap(m: Record<string, string>) {
  try {
    sessionStorage.setItem(WIRE_STORAGE, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function posHex(pos: string) {
  return POS_HEX[pos.toUpperCase()] ?? '#94A3B8';
}

function waiverAccent(verdict: string): WireAccent {
  const u = verdict.toUpperCase();
  if (u.includes('BUST')) return 'bust';
  if (u.includes('BOOM')) return 'boom';
  return 'neutral';
}

function buildWireLines(
  data: DashboardSnapshot | null,
  resolvedLeagueId: string | null,
  dynastyByName: Record<string, TFOVerdict>,
  prevByPid: Record<string, string>,
): { lines: WireLine[]; nextByPid: Record<string, string> } {
  const lines: WireLine[] = [];
  const nextByPid: Record<string, string> = { ...prevByPid };

  if (!data) {
    return {
      lines: [
        {
          id: 'load',
          accent: 'neutral',
          parts: [{ k: 't', s: 'Uplink pending · standby for live sleeper wire' }],
        },
      ],
      nextByPid,
    };
  }

  const tradeGroups = new Map<string, SnapshotOffer[]>();
  for (const o of data.latestOffers) {
    const k = tradeOfferGroupKey(o.id);
    if (!tradeGroups.has(k)) tradeGroups.set(k, []);
    tradeGroups.get(k)!.push(o);
  }

  for (const [k, rows] of Array.from(tradeGroups.entries())) {
    if (!rows.length) continue;
    const league = rows[0]!.league;
    const parts: Seg[] = [
      { k: 't', s: 'Tx ' },
      { k: 't', s: `${league} ` },
      { k: 't', s: '· ' },
    ];
    if (rows.length >= 2) {
      parts.push({ k: 'p', name: rows[0]!.player, pos: rows[0]!.position });
      parts.push({ k: 't', s: ' ⇄ ' });
      parts.push({ k: 'p', name: rows[1]!.player, pos: rows[1]!.position });
      if (rows.length > 2) parts.push({ k: 't', s: ` +${rows.length - 2} legs` });
    } else if (rows[0]) {
      parts.push({ k: 'p', name: rows[0].player, pos: rows[0].position });
    }
    lines.push({ id: `tr-${k}`, accent: 'neutral', parts });
  }

  const rh = data.rosterHealth;
  lines.push({
    id: 'inj-desk',
    accent: rh.injured + rh.suspended > 4 ? 'bust' : 'neutral',
    parts: [
      { k: 't', s: 'Inj desk ' },
      { k: 't', s: '· ' },
      { k: 't', s: `${rh.headline} ` },
      { k: 't', s: '· ' },
      { k: 't', s: `pulse ${rh.score}% ` },
      { k: 't', s: '· ' },
      { k: 't', s: `${rh.injured} out ` },
      { k: 't', s: '· ' },
      { k: 't', s: `${rh.questionable} q ` },
      { k: 't', s: '· ' },
      { k: 't', s: `${rh.suspended} res` },
    ],
  });

  for (let i = 0; i < Math.min(4, data.leagueHealthRotation.length); i++) {
    const h = data.leagueHealthRotation[i]!;
    lines.push({
      id: `inj-${i}-${h.leagueName}`,
      accent: h.injured > 0 ? 'bust' : 'neutral',
      parts: [
        { k: 't', s: 'Lg ' },
        { k: 't', s: `${h.leagueName} ` },
        { k: 't', s: '· ' },
        { k: 't', s: `${h.injured} out ` },
        { k: 't', s: '· ' },
        { k: 't', s: `${h.questionable} q ` },
        { k: 't', s: '· ' },
        { k: 't', s: `avail ${h.readinessScore}%` },
      ],
    });
  }

  const hid = resolvedLeagueId ?? data.leagues[0]?.id ?? null;
  const hub = hid ? data.hubSpotlightByLeague[hid] : null;

  if (hub?.boom) {
    const v = hub.boom.tfoVerdict ?? '—';
    const prev = nextByPid[hub.boom.player_id];
    if (prev && prev !== v) {
      lines.push({
        id: `tfo-flip-${hub.boom.player_id}`,
        accent: 'neutral',
        parts: [
          { k: 't', s: 'Tfo chg ' },
          { k: 't', s: '· ' },
          { k: 'p', name: hub.boom.name, pos: hub.boom.position },
          { k: 't', s: ` ${prev} → ${v}` },
        ],
      });
    }
    nextByPid[hub.boom.player_id] = v;
    lines.push({
      id: 'spot-boom',
      accent: 'boom',
      parts: [
        { k: 't', s: 'Boom ' },
        { k: 't', s: '· ' },
        { k: 'p', name: hub.boom.name, pos: hub.boom.position },
        { k: 't', s: ` · ${hub.boom.tfoGrade} · ` },
        { k: 't', s: v },
      ],
    });
  }

  if (hub?.bust) {
    const v = hub.bust.tfoVerdict ?? '—';
    const prev = nextByPid[hub.bust.player_id];
    if (prev && prev !== v) {
      lines.push({
        id: `tfo-flip-bust-${hub.bust.player_id}`,
        accent: 'neutral',
        parts: [
          { k: 't', s: 'Tfo chg ' },
          { k: 't', s: '· ' },
          { k: 'p', name: hub.bust.name, pos: hub.bust.position },
          { k: 't', s: ` ${prev} → ${v}` },
        ],
      });
    }
    nextByPid[hub.bust.player_id] = v;
    lines.push({
      id: 'spot-bust',
      accent: 'bust',
      parts: [
        { k: 't', s: 'Bust ' },
        { k: 't', s: '· ' },
        { k: 'p', name: hub.bust.name, pos: hub.bust.position },
        { k: 't', s: ` · ${hub.bust.tfoGrade} · ` },
        { k: 't', s: v },
      ],
    });
  }

  if (hub?.boom?.tfoVerdict) {
    const dv = dynastyByName[hub.boom.name.toLowerCase()];
    if (dv) {
      const cache = hub.boom.tfoVerdict.replace(/_/g, ' ');
      const board = String(dv).replace(/_/g, ' ');
      if (board !== cache) {
        lines.push({
          id: 'tfo-spread',
          accent: 'neutral',
          parts: [
            { k: 't', s: 'Tfo x-check ' },
            { k: 't', s: '· ' },
            { k: 'p', name: hub.boom.name, pos: hub.boom.position },
            { k: 't', s: ` · brd ${board} · cch ${cache}` },
          ],
        });
      }
    }
  }

  for (const w of data.waivers.slice(0, 4)) {
    if (!w.verdict) continue;
    lines.push({
      id: `add-${w.player_id}`,
      accent: waiverAccent(w.verdict),
      parts: [
        { k: 't', s: 'Adds ' },
        { k: 't', s: '· ' },
        { k: 'p', name: w.name, pos: w.position },
        { k: 't', s: ` · ${w.verdict}` },
      ],
    });
  }

  const tn = data.tradeNote;
  if (tn?.body) {
    const short = tn.body.length > 120 ? `${tn.body.slice(0, 117)}…` : tn.body;
    lines.push({
      id: 'desk',
      accent: tn.verdict === 'BOOM' ? 'boom' : tn.verdict === 'BUST' ? 'bust' : 'neutral',
      parts: [
        { k: 't', s: 'Ax ' },
        { k: 't', s: '· ' },
        { k: 't', s: short },
      ],
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: 'idle',
      accent: 'neutral',
      parts: [{ k: 't', s: 'Idle · sync leagues for sleeper tx + injury desk + tfo cache' }],
    });
  }

  return { lines, nextByPid };
}

function WireLineView({ line }: { line: WireLine }) {
  const accent =
    line.accent === 'boom'
      ? 'border-l-[#36E7A1]'
      : line.accent === 'bust'
        ? 'border-l-[#EF4444]'
        : 'border-l-[rgba(100,116,139,0.35)]';

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-baseline gap-[0.15em] border-l-[2px] pl-2 pr-6',
        accent,
      )}
    >
      {line.parts.map((p, i) =>
        p.k === 'p' ? (
          <span
            key={i}
            className="font-mono-tactical text-[10px] font-semibold leading-none tracking-[-0.02em] [font-variant:small-caps]"
            style={{ color: posHex(p.pos) }}
          >
            {p.name}
          </span>
        ) : (
          <span
            key={i}
            className="font-mono-tactical text-[10px] font-medium leading-none tracking-[0.04em] text-[#64748B] [font-variant:small-caps]"
          >
            {p.s}
          </span>
        ),
      )}
    </span>
  );
}

export default function DashboardNewsWire({
  data,
  resolvedLeagueId,
  dynastyVerdictByName = {},
}: {
  data: DashboardSnapshot | null;
  resolvedLeagueId: string | null;
  dynastyVerdictByName?: Record<string, TFOVerdict>;
}) {
  const { lines, nextByPid, persistSig } = useMemo(() => {
    const prev = readWireMap();
    const out = buildWireLines(data, resolvedLeagueId, dynastyVerdictByName, prev);
    const persistSig = JSON.stringify(
      Object.keys(out.nextByPid)
        .sort()
        .map((k) => [k, out.nextByPid[k]]),
    );
    return { ...out, persistSig };
  }, [data, resolvedLeagueId, dynastyVerdictByName]);

  useEffect(() => {
    if (!data) return;
    writeWireMap(nextByPid);
  }, [data, persistSig]);

  return (
    <div className="dashboard-news-wire relative flex h-9 min-h-9 w-full shrink-0 items-stretch overflow-hidden border-b border-white/[0.05] bg-[rgba(0,0,0,0.42)]">
      <div
        className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-10 bg-gradient-to-r from-[#060910] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-10 bg-gradient-to-l from-[#060910] to-transparent"
        aria-hidden
      />
      <div className="flex h-full w-11 shrink-0 items-center justify-center border-r border-white/[0.07] bg-white/[0.03]">
        <span className="font-mono-tactical text-[8px] font-bold leading-none tracking-[0.22em] text-[#475569] [font-variant:small-caps]">
          Wire
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="dashboard-news-wire__track flex h-full items-center">
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className="flex shrink-0 items-center pr-10"
              aria-hidden={dup === 1 ? true : undefined}
            >
              {lines.map((line) => (
                <span key={`${dup}-${line.id}`} className="inline-flex items-center">
                  <WireLineView line={line} />
                  <span className="mx-1 shrink-0 text-[9px] font-light text-[#475569]/80" aria-hidden>
                    ·
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
