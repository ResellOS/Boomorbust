'use client';

/**
 * RecommendationFeedback — drop-in thumbs up / down for any BOB recommendation.
 *
 * Lightweight & optional: a single tap records the vote optimistically and never
 * blocks the UI. Thumbs-down reveals an *optional* reason selector (no required
 * survey). Tapping the active thumb again clears the vote.
 *
 * Usage:
 *   <RecommendationFeedback
 *     surface="player_verdict"
 *     subjectType="player"
 *     subjectId={player.id}
 *     context={{ verdict, leagueId }}
 *   />
 */

import { useCallback, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { clsx } from 'clsx';
import {
  DOWN_REASONS,
  type RecommendationRating,
  type RecommendationSurface,
  type RecommendationDownReason,
} from '@/lib/feedback/recommendation';

interface RecommendationFeedbackProps {
  surface: RecommendationSurface;
  subjectType: string;
  subjectId: string;
  /** Optional snapshot of what was on screen (verdict, league, week, score…). */
  context?: Record<string, unknown> | null;
  /** Tiny "Rate this" / "Helpful?" prompt label before the icons. */
  label?: string;
  /** sm = compact inline (default), md = roomier. */
  size?: 'sm' | 'md';
  className?: string;
}

export default function RecommendationFeedback({
  surface,
  subjectType,
  subjectId,
  context = null,
  label,
  size = 'sm',
  className,
}: RecommendationFeedbackProps) {
  const [rating, setRating] = useState<RecommendationRating | null>(null);
  const [reason, setReason] = useState<RecommendationDownReason | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [done, setDone] = useState(false);
  const reqId = useRef(0);

  const post = useCallback(
    async (nextRating: RecommendationRating, nextReason: RecommendationDownReason | null) => {
      const id = ++reqId.current;
      try {
        const res = await fetch('/api/feedback/recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            surface,
            subjectType,
            subjectId,
            rating: nextRating,
            reason: nextReason,
            context,
          }),
        });
        // Only surface a soft thank-you for the latest interaction.
        if (id === reqId.current && res.ok) setDone(true);
      } catch {
        /* non-blocking — feedback is best-effort */
      }
    },
    [surface, subjectType, subjectId, context],
  );

  const clear = useCallback(async () => {
    ++reqId.current;
    try {
      await fetch(
        `/api/feedback/recommendation?surface=${encodeURIComponent(surface)}&subjectId=${encodeURIComponent(subjectId)}`,
        { method: 'DELETE' },
      );
    } catch {
      /* non-blocking */
    }
  }, [surface, subjectId]);

  const onUp = useCallback(() => {
    if (rating === 'up') {
      setRating(null);
      setShowReasons(false);
      setDone(false);
      void clear();
      return;
    }
    setRating('up');
    setReason(null);
    setShowReasons(false);
    void post('up', null);
  }, [rating, post, clear]);

  const onDown = useCallback(() => {
    if (rating === 'down') {
      // Toggle the reason tray instead of clearing on a second tap.
      setShowReasons((v) => !v);
      return;
    }
    setRating('down');
    setReason(null);
    setDone(false);
    setShowReasons(true);
    void post('down', null);
  }, [rating, post]);

  const onPickReason = useCallback(
    (r: RecommendationDownReason) => {
      const next = reason === r ? null : r;
      setReason(next);
      setShowReasons(false);
      void post('down', next);
    },
    [reason, post],
  );

  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const btnBase =
    'flex items-center justify-center rounded-md border transition-colors touch-target ' +
    (size === 'md' ? 'h-8 w-8' : 'h-7 w-7 sm:h-6 sm:w-6');

  return (
    <div className={clsx('relative inline-flex flex-col items-start gap-1', className)}>
      <div className="flex items-center gap-1.5">
        {label ? (
          <span className="mr-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            {label}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onUp}
          aria-pressed={rating === 'up'}
          aria-label="Helpful"
          title="Helpful"
          className={clsx(
            btnBase,
            rating === 'up'
              ? 'border-boom/40 bg-boom/10 text-boom'
              : 'border-white/10 bg-white/[0.03] text-muted hover:border-boom/30 hover:text-boom',
          )}
        >
          <ThumbsUp className={iconSize} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onDown}
          aria-pressed={rating === 'down'}
          aria-label="Not helpful"
          title="Not helpful"
          className={clsx(
            btnBase,
            rating === 'down'
              ? 'border-[#A78BFA]/40 bg-[#A78BFA]/10 text-[#A78BFA]'
              : 'border-white/10 bg-white/[0.03] text-muted hover:border-[#A78BFA]/30 hover:text-[#A78BFA]',
          )}
        >
          <ThumbsDown className={iconSize} strokeWidth={2} />
        </button>

        {done && !showReasons ? (
          <span className="font-mono text-[10px] text-muted">Thanks</span>
        ) : null}
      </div>

      {/* Optional reason selector — only on thumbs-down, never blocking. */}
      {rating === 'down' && showReasons ? (
        <div className="z-20 mt-0.5 flex max-w-[240px] flex-wrap gap-1 rounded-lg border border-white/10 bg-[#0a0d14]/95 p-1.5 backdrop-blur-xl sm:max-w-[260px]">
          <span className="w-full px-0.5 pb-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
            What was off? (optional)
          </span>
          {DOWN_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onPickReason(r.value)}
              className={clsx(
                'rounded-md border px-2 py-1 text-left font-figtree text-[11px] leading-tight transition-colors',
                reason === r.value
                  ? 'border-[#A78BFA]/50 bg-[#A78BFA]/10 text-[#A78BFA]'
                  : 'border-white/10 bg-white/[0.03] text-text hover:border-[#A78BFA]/30',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
