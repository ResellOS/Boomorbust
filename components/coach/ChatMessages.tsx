'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from './types';
import TradeAnalysisCard from './TradeAnalysisCard';

interface Props {
  messages: ChatMessage[];
  onFollowUp: (prompt: string) => void;
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[75%] rounded-2xl rounded-br-none px-4 py-3 text-[15px] text-white leading-relaxed"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)' }}
      >
        {content}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: '#36E7A1',
            animation: `bobPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bobPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function AssistantBubble({ msg, onFollowUp }: { msg: ChatMessage; onFollowUp: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-2 max-w-[90%]">
      {/* Label */}
      <div className="flex items-center gap-2 ml-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: '#36E7A1',
            boxShadow: '0 0 6px #36E7A1',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <span className="text-[12px] font-bold tracking-wider" style={{ color: '#36E7A1' }}>BOB COACH</span>
      </div>

      {/* Bubble */}
      <div
        className="rounded-2xl rounded-bl-none px-4 py-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}
      >
        {msg.streaming && !msg.content ? (
          <TypingDots />
        ) : (
          <>
            <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            {msg.tradeCard && <TradeAnalysisCard data={msg.tradeCard} />}
          </>
        )}
      </div>

      {/* Follow-up */}
      {msg.followUp && !msg.streaming && (
        <button
          onClick={() => onFollowUp(msg.followUp!)}
          className="self-start flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-slate-300 border border-white/[0.12] hover:border-white/[0.25] hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {msg.followUp}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ChatMessages({ messages, onFollowUp }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-4">
        {/* BOB logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.25)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#36E7A1" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 26c-5.5 0-10-4.5-10-10" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="3" fill="#36E7A1"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[17px] font-semibold text-white mb-1">Dynasty Coach is ready</p>
          <p className="text-[14px] text-slate-500 max-w-xs leading-relaxed">Ask anything about your roster, trades, or strategy. I have full context of your leagues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.role === 'user' ? (
            <UserBubble content={msg.content} />
          ) : (
            <AssistantBubble msg={msg} onFollowUp={onFollowUp} />
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
