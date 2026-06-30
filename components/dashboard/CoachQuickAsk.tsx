'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

export default function CoachQuickAsk({ className = '' }: { className?: string }) {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setReply('');

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: q }],
          includeContext: true,
        }),
      });

      if (res.status === 403) {
        setError('Dynasty Coach requires Pro or Elite.');
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        setError(t || 'Coach unavailable. Try again.');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('No response stream.');
        return;
      }

      const dec = new TextDecoder();
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const cut = acc.lastIndexOf('\n\x00');
        const visible = cut === -1 ? acc : acc.slice(0, cut);
        setReply(visible);
      }

      const cut = acc.lastIndexOf('\n\x00');
      const text = cut === -1 ? acc : acc.slice(0, cut);
      setReply(text.trimEnd());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={clsx(
        'glass-panel rounded-lg border border-[#22D3EE]/20 bg-[#22D3EE]/[0.04] p-2 flex flex-col gap-2 min-h-0',
        className,
      )}
    >
      <div className="px-0.5">
        <h4 className="font-bold uppercase tracking-[0.06em] text-white leading-tight" style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>
          Dynasty Coach Quick Ask
        </h4>
        <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#64748B]">
          Streams from /api/coach/chat · empire context
        </p>
      </div>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) void submit();
        }}
        placeholder="Ask the Analyst..."
        disabled={loading}
        className="w-full rounded-md border border-white/[0.08] bg-black/30 px-2 py-1.5 text-[11px] text-white placeholder:text-[#475569] outline-none focus:border-[#22D3EE]/40 font-mono"
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading || !question.trim()}
        className={clsx(
          'rounded-md py-1 text-[10px] font-mono font-black uppercase tracking-wide transition-colors',
          loading || !question.trim()
            ? 'bg-white/[0.06] text-[#475569] cursor-not-allowed'
            : 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/35 hover:bg-[#22D3EE]/28',
        )}
      >
        {loading ? 'Thinking…' : 'Ask Coach'}
      </button>

      {error ? <p className="text-[10px] text-[#EF4444] font-mono px-0.5">{error}</p> : null}

      {reply ? (
        <div className="max-h-[140px] overflow-y-auto slim-scroll rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
          <p className="text-[10px] text-[#CBD5E1] leading-relaxed whitespace-pre-wrap font-mono">{reply}</p>
        </div>
      ) : null}
    </div>
  );
}
