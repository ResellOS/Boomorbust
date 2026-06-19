export type FeedbackType = 'recommendation' | 'bug' | 'general';

export interface UserBadge {
  badgeType: string;
  badgeLabel: string;
  awardedAt: string;
}

export const FEEDBACK_BADGE: UserBadge = {
  badgeType: 'feedback_contributor',
  badgeLabel: 'Community Contributor',
  awardedAt: '',
};

export const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_ACTIVE_MS = 10 * 60 * 1000;
