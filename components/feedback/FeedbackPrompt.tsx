'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import type { FeedbackType } from '@/lib/feedback/types';
import { MIN_ACTIVE_MS } from '@/lib/feedback/types';

const LOCAL_DISMISS_KEY = 'bob-feedback-local-dismiss-until';
const DASHBOARD_DELAY_MS = 25_000;

function isDismissedLocally(): boolean {
  try {
    const until = localStorage.getItem(LOCAL_DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
}

function setLocalDismiss(days = 7): void {
  try {
    localStorage.setItem(LOCAL_DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

/** Tracks session activity and opens the prompt when eligible. */
export function FeedbackPromptHost() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const checkedRef = useRef(false);
  const activeMsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  useEffect(() => {
    activeMsRef.current = 0;
    lastActivityRef.current = Date.now();
    checkedRef.current = false;
    setOpen(false);

    if (isDismissedLocally()) return;

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

    const minActive = isDashboard ? MIN_ACTIVE_MS + DASHBOARD_DELAY_MS : MIN_ACTIVE_MS;

    const timer = window.setInterval(async () => {
      bumpActivity();
      const activeMs = activeMsRef.current;
      if (activeMs < minActive || checkedRef.current) return;

      try {
        const res = await fetch(`/api/feedback/prompt?activeMs=${Math.floor(activeMs)}`);
        if (!res.ok) return;
        checkedRef.current = true;
        window.clearInterval(timer);
        const json = (await res.json()) as { shouldShow?: boolean };
        if (json.shouldShow && !isDismissedLocally()) setOpen(true);
      } catch {
        /* ignore */
      }
    }, 30_000);

    return () => {
      window.clearInterval(timer);
      for (const event of events) {
        window.removeEventListener(event, bumpActivity);
      }
    };
  }, [pathname, isDashboard]);

  return <FeedbackPrompt open={open} onClose={() => setOpen(false)} compact={isDashboard} />;
}

type Step = 'pick' | 'form' | 'thanks';

interface FeedbackPromptProps {
  open: boolean;
  onClose: () => void;
  compact?: boolean;
}

export default function FeedbackPrompt({ open, onClose, compact = false }: FeedbackPromptProps) {
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

  const handleClose = useCallback(async () => {
    setLocalDismiss(7);
    try {
      await fetch('/api/feedback/prompt', { method: 'PATCH' });
    } catch {
      /* non-blocking */
    }
    onClose();
  }, [onClose]);

  const handleSkip = useCallback(async () => {
    setLocalDismiss(7);
    try {
      await fetch('/api/feedback/prompt', { method: 'PATCH' });
    } catch {
      /* non-blocking */
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
      const json = (await res.json()) as { error?: string };
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

  useEffect(() => {
    if (!open) return;
    const onEsc = () => onClose();
    window.addEventListener('dashboard:escape', onEsc);
    return () => window.removeEventListener('dashboard:escape', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = compact ? 'w-[min(100vw-2rem,300px)]' : 'w-[min(100vw-2rem,380px)]';
  const positionClass = compact ? 'bottom-3 left-3 lg:left-[230px]' : 'bottom-3 right-3';

  return (
    <div
      className={`fixed ${positionClass} z-[120] ${widthClass} overflow-hidden rounded-xl border border-white/10 bg-[#0a0d14]/95 backdrop-blur-xl`}
      style={{ boxShadow: '0 0 24px rgba(54,231,161,0.08)' }}
      role="dialog"
      aria-labelledby="feedback-title"
    >
      <button
        type="button"
        onClick={() => void handleClose()}
        className="absolute right-2 top-2 z-10 rounded p-1 text-muted hover:text-text"
        aria-label="Close feedback"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
      {step === 'thanks' ? (
        <div className="px-4 py-5 text-center">
          <div className="mb-2 text-2xl">🏆</div>
          <p className="text-[15px] font-semibold text-text">
            Thanks! You&apos;ve earned the Community Contributor badge 🏆
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg border-none bg-boom py-2.5 text-[13px] font-bold text-bg"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="border-b border-white/10 px-4 py-3 pr-10">
            <p id="feedback-title" className="text-[14px] font-bold text-text">
              Help us improve BOB
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Your input shapes what we build next.</p>
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
                  className="w-full rounded-lg border border-boom/20 bg-boom/[0.06] p-2.5 text-left transition-colors hover:border-boom/35"
                >
                  <p className="text-[12px] font-semibold text-boom">Share a recommendation</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelected('bug');
                    setStep('form');
                  }}
                  className="w-full rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] p-2.5 text-left transition-colors hover:border-[rgba(239,68,68,0.35)]"
                >
                  <p className="text-[12px] font-semibold text-[#ef4444]">Report a bug</p>
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setStep('pick')}
                  className="mb-2 border-none bg-transparent p-0 text-[11px] text-muted hover:text-text"
                >
                  ← Back
                </button>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder="What would make BOB more useful?"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-figtree text-[13px] text-text outline-none placeholder:text-muted focus:border-boom/40"
                />
                {error && <p className="mt-1.5 text-[11px] text-[#ef4444]">{error}</p>}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-3 w-full rounded-lg border-none bg-boom py-2 text-[13px] font-bold text-bg disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </button>
              </div>
            )}
            {step === 'pick' && (
              <button
                type="button"
                onClick={() => void handleSkip()}
                className="mt-3 w-full border-none bg-transparent py-1 text-center text-[12px] text-muted hover:text-text"
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
