'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'Who is my most tradeable asset right now?',
  'Which of my starters should I be worried about long-term?',
  'What position should I target in the next trade window?',
  'Rank my rosters from strongest to weakest.',
  'Which players on my bench have the best breakout potential?',
  'Should I be rebuilding or competing this season?',
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center">
          <span className="text-[#6366F1] text-sm">✦</span>
        </div>
      )}
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-[#6366F1] text-white rounded-tr-sm'
            : 'bg-[#1E293B] text-[#CBD5E1] border border-white/5 rounded-tl-sm'
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 justify-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center">
        <span className="text-[#6366F1] text-sm">✦</span>
      </div>
      <div className="max-w-[80%] bg-[#1E293B] text-[#CBD5E1] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {text || <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>}
      </div>
    </div>
  );
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstMessage = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  async function send(question?: string) {
    const text = (question ?? input).trim();
    if (!text || streaming) return;

    setInput('');
    setError('');
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setStreaming(true);
    setStreamText('');

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          includeContext: isFirstMessage,
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error ?? 'Daily limit reached.');
        setStreaming(false);
        setMessages(messages); // revert optimistic user message
        return;
      }

      if (!res.ok || !res.body) {
        setError('Something went wrong. Try again.');
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Check for terminal sentinel with rate-limit info
        const sentinelIdx = chunk.indexOf('\x00');
        if (sentinelIdx !== -1) {
          const before = chunk.slice(0, sentinelIdx);
          accumulated += before;
          setStreamText(accumulated);
          try {
            const meta = JSON.parse(chunk.slice(sentinelIdx + 1));
            if (typeof meta.remaining === 'number') setRemaining(meta.remaining);
          } catch {}
        } else {
          accumulated += chunk;
          setStreamText(accumulated);
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
      setStreamText('');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center">
            <span className="text-[#6366F1]">✦</span>
          </div>
          <div>
            <h1 className="text-white font-bold">Dynasty Coach</h1>
            <p className="text-[#94A3B8] text-xs">AI-powered dynasty advice, tuned to your rosters</p>
          </div>
        </div>
        {remaining !== null && (
          <div className={clsx(
            'text-xs px-3 py-1 rounded-full border',
            remaining <= 3
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-white/5 border-white/10 text-[#94A3B8]'
          )}>
            {remaining} / 20 messages left today
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-4xl w-full mx-auto">
        {showEmpty && (
          <div className="flex flex-col items-center gap-8 pt-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#6366F1] text-2xl">✦</span>
              </div>
              <h2 className="text-white font-semibold text-lg mb-1">Ask me anything about your dynasties</h2>
              <p className="text-[#94A3B8] text-sm max-w-sm">
                I know your full roster across every league. Ask about trades, starts, rebuilds, or player values.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={streaming}
                  className="text-left text-sm text-[#CBD5E1] bg-[#1E293B] hover:bg-[#263347] border border-white/5 hover:border-[#6366F1]/30 rounded-xl px-4 py-3 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streaming && <StreamingBubble text={streamText} />}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 border-t border-white/5 bg-[#0F172A] px-4 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about trades, roster moves, draft strategy…"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-[#1E293B] border border-white/10 focus:border-[#6366F1]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-[#475569] resize-none outline-none transition min-h-[44px] max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="shrink-0 w-11 h-11 rounded-xl bg-[#6366F1] hover:bg-[#5254cc] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-center text-xs text-[#475569] mt-2">
          First message loads your full roster context · Press Enter to send
        </p>
      </div>
    </div>
  );
}
