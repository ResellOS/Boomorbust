'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  initialValue?: string;
}

export default function ChatInput({ onSend, disabled, initialValue }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate from suggested prompts
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      textareaRef.current?.focus();
    }
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex-shrink-0 px-4 pt-3 border-t pb-safe"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'rgba(10,13,20,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className="flex items-end gap-3 rounded-2xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your dynasty question..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-[15px] text-white placeholder-slate-600 resize-none outline-none leading-relaxed"
          style={{ minHeight: '24px', maxHeight: '160px' }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: (!value.trim() || disabled) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #36E7A1, #22D3EE)',
            cursor: (!value.trim() || disabled) ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8H2M8 2l6 6-6 6" stroke={(!value.trim() || disabled) ? '#64748B' : '#0a0d14'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-slate-600 mt-2 text-center">
        Coach uses proprietary models, player data, news, and 10+ years of dynasty context.{' '}
        <span className="text-slate-500 underline cursor-pointer">Learn More</span>
      </p>
    </div>
  );
}
