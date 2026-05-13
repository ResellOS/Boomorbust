/**
 * Per-league scoring context layer — re-exports context helpers
 * and adds per-player scoring-type score adjustment.
 */

export {
  getLeagueScoringContext,
  positionValueMultipliers,
  positionalScarcityDepth,
  applyLeagueContextToScore,
  type ScoringContext,
  type PositionValueMultiplier,
} from '@/lib/scoring/context';
