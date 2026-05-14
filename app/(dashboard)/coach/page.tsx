'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import CoachContextHeader from '@/components/coach/CoachContextHeader';
import SuggestedPrompts from '@/components/coach/SuggestedPrompts';
import CoachSettings from '@/components/coach/CoachSettings';
import ChatMessages from '@/components/coach/ChatMessages';
import ChatInput from '@/components/coach/ChatInput';
import type {
  ChatMessage,
  CoachSettings as CoachSettingsType,
  LeagueContext,
  TradeAnalysisData,
} from '@/components/coach/types';
import { isTradeQuestion } from '@/components/coach/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Build a mock TradeAnalysisData for trade questions.
 * The AI handles the natural language analysis; this provides the structured UI.
 * In a full build, this would come from a dedicated /api/trades/analyze endpoint.
 */
function buildMockTradeCard(question: string): TradeAnalysisData | null {
  const lower = question.toLowerCase();

  // Only scaffold the card for explicit trade questions
  const forMatch = lower.match(/(.+)\s+for\s+(.+)/);
  if (!forMatch) return null;

  // Determine a confidence/verdict based on question sentiment
  const isSell = lower.includes('robinson') || lower.includes('henry') || lower.includes('kelce');
  const verdict: TradeAnalysisData['verdict'] = isSell ? 'DO IT' : 'COUNTER';
  const confidence = isSell ? 86 : 62;

  return {
    verdict,
    confidence,
    give: [
      { name: '1.10 Pick', position: 'PICK', team: '—', detail: '2024 1st Round Pick', value: 4200, isPick: true },
      { name: 'Nico Collins', position: 'WR', team: 'HOU', detail: 'Age 27 | WR2', value: 3650, isPick: false },
    ],
    receive: [
      { name: 'Bijan Robinson', position: 'RB', team: 'ATL', detail: 'Age 22 | Elite RB1', value: 9320, isPick: false },
    ],
    totalGive: 7850,
    totalReceive: 9320,
    valueEdge: 18.7,
    reasons: [
      'Bijan is 22, elite talent, and a top-3 dynasty asset at RB.',
      'Your team is in win-now mode and needs a difference maker.',
      'Nico Collins is great, but WR depth is easier to replace.',
      '1.10 is valuable, but not as valuable as a proven elite asset.',
    ],
    teamImpact: {
      winNow:      12,
      futureValue:  8,
      depthHit:    -5,
      flexibility: 'Neutral',
    },
  };
}

function generateFollowUp(userMsg: string): string | null {
  const lower = userMsg.toLowerCase();
  if (lower.includes('trade') || lower.includes('for '))
    return 'What about moving 2025 1st and JSN for Garrett Wilson?';
  if (lower.includes('start') || lower.includes('sit'))
    return 'Which of my bench players should I stash long-term?';
  if (lower.includes('rookie'))
    return 'Who are the best late-round sleepers in this class?';
  if (lower.includes('waiver') || lower.includes('add'))
    return 'What should I drop to make room?';
  return 'What else should I be doing with my roster this week?';
}

function buildPersonalityNote(settings: CoachSettingsType): string {
  const tones: Record<string, string> = {
    Competitive: 'Be direct, aggressive, and assume I want to win now.',
    Balanced:    'Balance short and long term in your recommendations.',
    Conservative: 'Be conservative and risk-aware in your recommendations.',
  };
  const details: Record<string, string> = {
    Detailed:  'Give detailed reasoning and context.',
    Brief:     'Keep it brief — bullet points or a few sentences max.',
    'Data-Only': 'Focus on data, scores, and value numbers. Minimal narrative.',
  };
  const parts = [tones[settings.personality], details[settings.detail]].filter(Boolean);
  const contextParts = [
    settings.tradeHistory  ? 'Include my recent trade history.' : '',
    settings.playerNews    ? 'Factor in recent player news.' : '',
    settings.injuryUpdates ? 'Factor in injury reports.' : '',
  ].filter(Boolean);
  if (contextParts.length) parts.push(contextParts.join(' '));
  return parts.join(' ');
}

// ─── Page ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: CoachSettingsType = {
  personality:      'Competitive',
  detail:           'Detailed',
  allLeagueContext: true,
  tradeHistory:     true,
  playerNews:       true,
  injuryUpdates:    true,
};

export default function CoachPage() {
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [settings,        setSettings]        = useState<CoachSettingsType>(DEFAULT_SETTINGS);
  const [leagues,         setLeagues]         = useState<LeagueContext[]>([]);
  const [leaguesLoading,  setLeaguesLoading]  = useState(true);
  const [streaming,       setStreaming]        = useState(false);
  const [suggestedInput,  setSuggestedInput]  = useState('');
  const [activeLeagueId,  setActiveLeagueId]  = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch leagues for context header
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/leagues', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const all = [
          ...(data.myLeagues ?? []),
          ...(data.otherLeagues ?? []),
        ];
        const mapped: LeagueContext[] = all.slice(0, 8).map((l: { id: string; name: string; totalRosters?: number }) => ({
          id:     l.id,
          name:   l.name,
          format: `${l.totalRosters ?? 12}-Team SF PPR`,
          status: 'Your Team',
        }));
        setLeagues(mapped);
        if (mapped.length > 0 && !activeLeagueId) setActiveLeagueId(mapped[0].id);
      })
      .catch(() => {/* ignore */})
      .finally(() => setLeaguesLoading(false));
    return () => controller.abort();
  }, [activeLeagueId]);

  const sendMessage = useCallback(async (userText: string) => {
    if (streaming) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: userText };
    const assistantId = uid();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Abort any prior stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Build conversation history for API
    const history = [
      ...messages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: `${userText}\n\n[Settings: ${buildPersonalityNote(settings)}]` },
    ];

    try {
      const resp = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:       history,
          includeContext: settings.allLeagueContext,
          league_id:      activeLeagueId,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        const errCode = (err as { code?: string }).code;
        let errMsg = 'Something went wrong. Please try again.';
        if (resp.status === 403 && errCode === 'TIER_REQUIRED')
          errMsg = 'Dynasty Coach requires a Pro or Elite subscription. Upgrade to unlock full AI analysis.';
        else if (resp.status === 429)
          errMsg = 'Daily message limit reached. Resets at midnight UTC.';
        else if (resp.status === 503)
          errMsg = 'AI service temporarily unavailable — monthly budget reached. Check back on the 1st.';

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: errMsg, streaming: false } : m
          )
        );
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let full = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          // Strip metadata blob appended at end: \n\x00{...}
          const metaSplit = chunk.indexOf('\x00');
          const textChunk = metaSplit >= 0 ? chunk.slice(0, metaSplit).replace(/\n$/, '') : chunk;
          full += textChunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: full } : m
            )
          );
        }
      }

      // After streaming, attach trade card and follow-up
      const tradeCard = isTradeQuestion(userText) ? buildMockTradeCard(userText) : null;
      const followUp  = generateFollowUp(userText);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: full, streaming: false, tradeCard, followUp }
            : m
        )
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Connection error. Please check your internet and try again.', streaming: false }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [messages, settings, streaming, activeLeagueId]);

  return (
    <div className="flex flex-col bg-[#0a0d14]" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      {/* Top header area */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Page title + Full Context Active */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <h1 className="text-[22px] font-bold text-white">Dynasty Coach</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.08] text-slate-400 border border-white/[0.1]">AI</span>
            </div>
            <p className="text-[13px] text-slate-500">Ask anything about your roster, trades, or strategy.</p>
          </div>
        </div>

        {/* Context header (badges + league cards) */}
        <CoachContextHeader leagues={leagues} loading={leaguesLoading} />
      </div>

      {/* Body: sidebar + chat */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <div
          className="hidden md:flex flex-col w-56 flex-shrink-0 border-r overflow-y-auto"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
        >
          <div className="p-3 space-y-3 flex-1">
            <SuggestedPrompts
              onSelect={(p) => {
                setSuggestedInput(p);
                // Clear after a tick so it can re-trigger
                setTimeout(() => setSuggestedInput(''), 50);
              }}
            />
            <CoachSettings settings={settings} onChange={setSettings} />
          </div>
        </div>

        {/* Chat area — pb-14 on mobile accounts for the fixed bottom nav */}
        <div className="flex flex-col flex-1 min-h-0 pb-14 lg:pb-0">
          {/* Messages */}
          <ChatMessages
            messages={messages}
            onFollowUp={(p) => sendMessage(p)}
          />

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            disabled={streaming}
            initialValue={suggestedInput}
          />
        </div>
      </div>
    </div>
  );
}
