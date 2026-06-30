// Shared types + constants for per-recommendation thumbs up/down feedback.
// Used by the API route and the <RecommendationFeedback> component.

export type RecommendationRating = 'up' | 'down';

export type RecommendationSurface =
  | 'trade'
  | 'player_verdict'
  | 'lineup'
  | 'draft_pick';

export type RecommendationDownReason =
  | 'not_enough_explanation'
  | 'doesnt_make_sense'
  | 'data_looks_wrong'
  | 'disagree';

export const DOWN_REASONS: { value: RecommendationDownReason; label: string }[] = [
  { value: 'not_enough_explanation', label: 'Not enough explanation' },
  { value: 'doesnt_make_sense', label: "Recommendation doesn't make sense" },
  { value: 'data_looks_wrong', label: 'Data looks wrong' },
  { value: 'disagree', label: 'I disagree with the evaluation' },
];

export const RECOMMENDATION_SURFACES: ReadonlySet<RecommendationSurface> =
  new Set<RecommendationSurface>(['trade', 'player_verdict', 'lineup', 'draft_pick']);

export const DOWN_REASON_VALUES: ReadonlySet<RecommendationDownReason> =
  new Set<RecommendationDownReason>(DOWN_REASONS.map((r) => r.value));

export interface RecommendationFeedbackPayload {
  surface: RecommendationSurface;
  subjectType: string;
  subjectId: string;
  rating: RecommendationRating;
  reason?: RecommendationDownReason | null;
  context?: Record<string, unknown> | null;
}
