'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedbackType } from '@/lib/feedback/types';
import { MIN_ACTIVE_MS } from '@/lib/feedback/types';

/** Tracks session activity and opens the prompt when eligible. */
export function FeedbackPromptHost() {
  const [open, setOpen] = useState(false);
  const checkedRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    activeMsRef.current = 0;
    lastActivityRef.current = Date.now();

    const bumpActivity = () => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed > 0 && elapsed < 120_000) {
        activeMsRef.current += elapsed;
      }
      lastActivityRef.current = now;
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    for (const event of events) {
      window.addEventListener(event, bumpActivity, { passive: true });
    }

    const timer = window.setInterval(async () => {
      bumpActivity();
      const activeMs = activeMsRef.current;
      if (activeMs < MIN_ACTIVE_MS || checkedRef.current) return;

      try {
        const res = await fetch(`/api/feedback/prompt?activeMs=${Math.floor(activeMs)}`);
        if (!res.ok) return;
        checkedRef.current = true;
        window.clearInterval(timer);
        const json = (await res.json()) as { shouldShow?: boolean };
        if (json.shouldShow) setOpen(true);
      } catch {
        // ignore — user may be logged out on public pages
      }
    }, 30_000);

    return () => {
      window.clearInterval(timer);
      for (const event of events) {
        window.removeEventListener(event, bumpActivity);
      }
    };
  }, []);

  return <FeedbackPrompt open={open} onClose={() => setOpen(false)} />;
}

type Step = 'pick' | 'form' | 'thanks';

interface FeedbackPromptProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackPrompt({ open, onClose }: FeedbackPromptProps) {
  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('pick');
      setSelected(null);
      setContent('');
      setError(null);
    }
  }, [open]);

  const handleSkip = useCallback(async () => {
    try {
      await fetch('/api/feedback/prompt', { method: 'PATCH' });
    } catch {
      // non-blocking
    }
    onClose();
  }, [onClose]);

  const handleSubmit = async () => {
    if (!selected || content.trim().length < 3) {
      setError('Please add a few words before sending.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_type: selected, content: content.trim() }),
      });
      const json = (await res.json()) as {
        error?: string;
        badgeAwarded?: boolean;
        badgeLabel?: string;
      };
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.');
        return;
      }
      setStep('thanks');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-white/10 bg-[#0a0d14]/95 shadow-[0_0_32px_rgba(54,231,161,0.08)] backdrop-blur-xl"
      role="dialog"
      aria-labelledby="feedback-title"
    >
      {step === 'thanks' ? (
        <div className="px-5 py-6 text-center">
          <div className="mb-2 text-2xl">🏆</div>
          <p className="text-[15px] font-semibold text-text">
            Thanks! You&apos;ve earned the Community Contributor badge 🏆
          </p>
          <p className="mt-2 text-[11px] text-muted">
            Find it on your profile under Settings → Dynasty Title.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg border-none bg-boom py-2.5 text-[12px] font-bold text-bg"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="border-b border-white/10 px-4 py-3">
            <p id="feedback-title" className="text-[14px] font-bold text-text">
              Help us improve BOB
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              Your input shapes what we build next.
            </p>
          </div>

          <div className="px-4 py-3">
            {step === 'pick' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelected('recommendation');
                    setStep('form');
                  }}
                  className="w-full rounded-lg border border-boom/20 bg-boom/[0.06] p-3 text-left transition-colors hover:border-boom/35"
                >
                  <p className="text-[12px] font-semibold text-boom">Share a recommendation</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Feature ideas, workflow wins, or what would make BOB better.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected('bug');
                    setStep('form');
                  }}
                  className="w-full rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] p-3 text-left transition-colors hover:border-[rgba(239,68,68,0.35)]"
                >
                  <p className="text-[12px] font-semibold text-[#ef4444]">Report a bug or issue</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Something broken, confusing, or not working as expected.
                  </p>
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="mb-2 border-none bg-transparent p-0 text-[10px] text-muted hover:text-text"
                >
                  ← Back
                </button>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder={
                    selected === 'bug'
                      ? 'What happened? Which page or feature?'
                      : 'What would make BOB more useful for your dynasty?'
                  }
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-figtree text-[12px] text-text outline-none placeholder:text-muted focus:border-boom/40"
                />
                {error && (
                  <p className="mt-1.5 text-[10px] text-[#ef4444]">{error}</p>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-3 w-full rounded-lg border-none bg-boom py-2.5 text-[12px] font-bold text-bg disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </button>
              </div>
            )}

            {step === 'pick' && (
              <button
                type="button"
                onClick={handleSkip}
                className="mt-3 w-full border-none bg-transparent py-1 text-center text-[11px] text-muted hover:text-text"
              >
                Maybe later
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

