'use client';

import { useState } from 'react';
import FeedbackPrompt from '@/components/feedback/FeedbackPrompt';

export default function FeedbackSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          Help Improve BOB
        </p>
        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          Share feedback on features, bugs, or ideas. Contributors earn the Community Contributor badge.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all"
          style={{ background: '#36E7A1', color: '#0a0d14' }}
        >
          Share Feedback
        </button>
      </div>
      <FeedbackPrompt open={open} onClose={() => setOpen(false)} />
    </>
  );
}
