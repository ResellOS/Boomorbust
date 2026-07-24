import { getTrackRecordConsensus } from '@/lib/engine/client';
import type { TrackRecordConsensusData, TrackRecordConsensusRow } from './types';

// Derive the BOB Verdict from the BOB-vs-expert rank gap, using the app's standard
// STRONG BUY/BUY/HOLD/SELL/STRONG SELL taxonomy. consensus_rank_delta = bob_rank −
// consensus_rank, so a NEGATIVE gap means BOB ranks the player better than experts
// (bullish → BUY side) and a POSITIVE gap means BOB ranks them worse (bearish → SELL
// side) — matching the gapLabel hints in BobVsConsensusTrackRecord. The engine's own
// `verdict` field is ignored here because it returns HOLD for every row.
export function verdictFromConsensusDelta(delta: number): string {
  if (!Number.isFinite(delta)) return 'HOLD';
  if (delta <= -40) return 'STRONG BUY';
  if (delta <= -15) return 'BUY';
  if (delta >= 40) return 'STRONG SELL';
  if (delta >= 15) return 'SELL';
  return 'HOLD';
}

function mapRow(raw: Record<string, unknown>): TrackRecordConsensusRow | null {
  const playerId = String(raw.player_id ?? '');
  const playerName = String(raw.player_name ?? '—');
  if (!playerId && playerName === '—') return null;

  const consensusRankDelta = Number(raw.consensus_rank_delta) || 0;

  return {
    playerId,
    playerName,
    position: String(raw.position ?? '—'),
    // Wired to the gap direction/magnitude (not the engine's all-HOLD passthrough).
    verdict: verdictFromConsensusDelta(consensusRankDelta),
    bobRank: Number(raw.bob_rank) || 0,
    consensusRank: Number(raw.consensus_rank) || 0,
    consensusRankDelta,
    ktcRankDelta: Number(raw.ktc_rank_delta) || 0,
  };
}

export async function fetchTrackRecordConsensus(): Promise<TrackRecordConsensusData | null> {
  try {
    const res = await getTrackRecordConsensus({
      season: 2026,
      limit: 50,
      min_abs_delta: 20,
      source: 'fantasypros',
    });

    if (!res?.ok || !res.data) {
      console.error('[performance] track-record consensus unavailable:', res?.error);
      return null;
    }

    const data = res.data as Record<string, unknown>;
    const rowsRaw = Array.isArray(data.rows) ? data.rows : [];
    const rows = rowsRaw
      .map((r) => mapRow(r as Record<string, unknown>))
      .filter((r): r is TrackRecordConsensusRow => r != null);

    const biggestDivergences = [...rows]
      .filter((r) => Math.abs(r.consensusRankDelta) >= 20)
      .sort((a, b) => Math.abs(b.consensusRankDelta) - Math.abs(a.consensusRankDelta))
      .slice(0, 10);

    const byPos = (data.by_position ?? {}) as Record<string, number>;

    return {
      season: Number(data.season) || 2026,
      source: String(data.source ?? 'fantasypros'),
      snapshotDate: String(data.snapshot_date ?? '—'),
      playersCompared: Number(data.players_compared) || 0,
      meanAbsDelta: Number(data.mean_abs_delta) || 0,
      pctWithin5: Number(data.pct_within_5) || 0,
      byPosition: {
        QB: byPos.QB ?? 0,
        RB: byPos.RB ?? 0,
        WR: byPos.WR ?? 0,
        TE: byPos.TE ?? 0,
      },
      biggestDivergences,
    };
  } catch (err) {
    console.error('[performance] fetchTrackRecordConsensus failed:', err);
    return null;
  }
}
