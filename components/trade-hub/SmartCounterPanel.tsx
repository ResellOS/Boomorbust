'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { TradeHubOffer } from './types';

// ─── Counter card data ────────────────────────────────────────────────────────

interface CounterCard {
  label:       string;
  strategy:    'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  title:       string;
  description: string;
  modification: string; // "Add: 2nd Round Pick"
  treScore:    number;
  borderColor: string;
  labelColor:  string;
}

function deriveCounters(offer: TradeHubOffer): CounterCard[] {
  const giveKtc    = offer.give.reduce((s, a) => s + (a.ktc_value ?? 3000), 0) || 3000;
  const receiveKtc = offer.receive.reduce((s, a) => s + (a.ktc_value ?? 3000), 0) || 3000;
  const delta      = (receiveKtc - giveKtc) / 100;

  const givePlayer  = offer.give[0]?.name ?? 'your player';
  const recvPlayer  = offer.receive[0]?.name ?? 'their player';

  return [
    {
      label:        'RESPONSE 1 - AGGRESSIVE',
      strategy:     'AGGRESSIVE',
      title:        'Counter with Confidence',
      description:  'Keep your stars, add value',
      modification: 'Add: 2nd Round Pick',
      treScore:     parseFloat((delta + 8).toFixed(1)),
      borderColor:  '#36E7A1',
      labelColor:   '#36E7A1',
    },
    {
      label:        'RESPONSE 2 - BALANCED',
      strategy:     'BALANCED',
      title:        'Fair Counter',
      description:  'Adjust value slightly',
      modification: `Remove: ${recvPlayer.split(' ').pop() ?? '2nd Pick'}`,
      treScore:     parseFloat((delta + 3).toFixed(1)),
      borderColor:  '#FBBF24',
      labelColor:   '#FBBF24',
    },
    {
      label:        'RESPONSE 3 - CONSERVATIVE',
      strategy:     'CONSERVATIVE',
      title:        'Protect Assets',
      description:  'Minimize risk, maintain depth',
      modification: `Remove: ${givePlayer}`,
      treScore:     parseFloat((delta + 0.5).toFixed(1)),
      borderColor:  '#64748B',
      labelColor:   '#64748B',
    },
  ];
}

// ─── Individual counter response card ────────────────────────────────────────

function CounterResponseCard({ card }: { card: CounterCard }) {
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1200);
  };

  const positive = card.treScore >= 0;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background:  'rgba(255,255,255,0.03)',
        border:      '1px solid rgba(255,255,255,0.08)',
        borderLeft:  `3px solid ${card.borderColor}`,
      }}
    >
      {/* Label */}
      <span
        className="block mb-1 uppercase"
        style={{
          fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:      9,
          color:         card.labelColor,
          letterSpacing: '0.08em',
        }}
      >
        {card.label}
      </span>

      {/* Title */}
      <span
        className="block font-semibold mb-1"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize:   15,
          color:      '#ffffff',
        }}
      >
        {card.title}
      </span>

      {/* Description */}
      <span
        className="block mb-2"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize:   12,
          color:      '#94a3b8',
        }}
      >
        {card.description}
      </span>

      {/* Modification hint */}
      <div
        className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <span style={{ fontSize: 10, color: '#475569' }}>◆</span>
        <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#94a3b8' }}>
          {card.modification}
        </span>
      </div>

      {/* TRE Score + button row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span
            style={{
              fontFamily:    'var(--font-body), Inter, sans-serif',
              fontSize:      9,
              color:         '#64748B',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            TRE Score
          </span>
          <span
            style={{
              fontFamily:  'var(--font-mono), "JetBrains Mono", monospace',
              fontSize:    20,
              fontWeight:  700,
              color:       positive ? '#36E7A1' : '#EF4444',
              fontVariant: 'tabular-nums',
            }}
          >
            {positive ? '+' : ''}{card.treScore}
          </span>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || sent}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-150"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   13,
            background: sent ? 'rgba(54,231,161,0.15)' : '#36E7A1',
            color:      sent ? '#36E7A1' : '#0a0d14',
            border:     sent ? '1px solid rgba(54,231,161,0.4)' : 'none',
            opacity:    sending ? 0.7 : 1,
            cursor:     sending || sent ? 'default' : 'pointer',
          }}
        >
          {sent ? '✓ Sent' : sending ? 'Sending…' : 'Send Counter'}
        </button>
      </div>
    </div>
  );
}

// ─── Locked overlay ───────────────────────────────────────────────────────────

function LockedOverlay() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-10"
      style={{
        background:     'rgba(10,13,20,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Lock size={28} color="#64748B" />
      <p className="mt-3 font-semibold" style={{ fontSize: 15, color: '#ffffff' }}>
        Smart Counter
      </p>
      <p className="mt-1 text-center px-6" style={{ fontSize: 13, color: '#64748B', maxWidth: 240 }}>
        Requires Veteran or All-Pro Terminal tier to unlock AI-generated counter offers.
      </p>
      <a
        href="/dashboard/settings?tab=billing"
        className="mt-4 px-5 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
        style={{ background: '#36E7A1', color: '#0a0d14' }}
      >
        Upgrade
      </a>
    </div>
  );
}

// ─── SmartCounterPanel ────────────────────────────────────────────────────────

export interface SmartCounterPanelProps {
  selectedOffer: TradeHubOffer | null;
  isLocked:      boolean;
}

export default function SmartCounterPanel({ selectedOffer, isLocked }: SmartCounterPanelProps) {
  const counters = selectedOffer ? deriveCounters(selectedOffer) : null;

  return (
    <div
      className="relative rounded-xl overflow-hidden h-full"
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {isLocked && <LockedOverlay />}

      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <span
            className="block uppercase"
            style={{
              fontFamily:    'var(--font-body), Inter, sans-serif',
              fontSize:      12,
              color:         '#64748B',
              letterSpacing: '0.1em',
            }}
          >
            {counters ? `Smart Counter (3 Responses)` : 'Smart Counter'}
          </span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] uppercase font-medium"
          style={{
            background:    'rgba(54,231,161,0.12)',
            color:         '#36E7A1',
            border:        '1px solid rgba(54,231,161,0.25)',
            fontFamily:    'var(--font-mono), monospace',
            letterSpacing: '0.04em',
          }}
        >
          Powered by TRE Engine
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {!selectedOffer ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span style={{ fontSize: 32 }} aria-hidden>↖</span>
            <p className="mt-2" style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#64748B' }}>
              Select an incoming offer to generate counter responses.
            </p>
          </div>
        ) : (
          counters!.map((card) => (
            <CounterResponseCard key={card.strategy} card={card} />
          ))
        )}

        {selectedOffer && (
          <div className="text-center pt-1">
            <a
              href="#"
              className="hover:underline"
              style={{
                fontFamily: 'var(--font-body), Inter, sans-serif',
                fontSize:   12,
                color:      '#22D3EE',
              }}
            >
              View All Smart Counters →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
