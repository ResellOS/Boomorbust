import { getTrackRecordConsensus } from '@/lib/engine/client';
import type { TrackRecordConsensusData, TrackRecordConsensusRow } from './types';

function mapRow(raw: Record<string, unknown>): TrackRecordConsensusRow | null {
  const playerId = String(raw.player_id ?? '');
  const playerName = String(raw.player_name ?? '—');
  if (!playerId && playerName === '—') return null;

  return {
    playerId,
    playerName,
    position: String(raw.position ?? '—'),
    verdict: String(raw.verdict ?? '—'),
    bobRank: Number(raw.bob_rank) || 0,
    consensusRank: Number(raw.consensus_rank) || 0,
    consensusRankDelta: Number(raw.consensus_rank_delta) || 0,
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
