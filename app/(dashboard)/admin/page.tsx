'use client';

import { useCallback, useState } from 'react';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const CYAN = '#22D3EE';

interface ButtonState {
  loading: boolean;
  result: string | null;
  ok: boolean | null;
}

const INIT: ButtonState = { loading: false, result: null, ok: null };

function AdminButton({
  label,
  color,
  state,
  onClick,
}: {
  label: string;
  color: string;
  state: ButtonState;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={state.loading}
        className="flex items-center gap-2 rounded-lg border px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
        style={{
          fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
          background: state.loading ? `${color}14` : 'transparent',
          borderColor: `${color}40`,
          color,
          boxShadow: state.loading ? `0 0 16px ${color}25` : 'none',
        }}
      >
        {state.loading ? (
          <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <span aria-hidden style={{ fontSize: 16 }}>▶</span>
        )}
        {state.loading ? 'Running…' : label}
      </button>

      {state.result !== null ? (
        <pre
          className="rounded-lg border p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all"
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            borderColor: state.ok ? `${BOOM}30` : '#EF444430',
            background: state.ok ? `${BOOM}08` : '#EF444408',
            color: state.ok ? BOOM : '#EF4444',
          }}
        >
          {state.result}
        </pre>
      ) : null}
    </div>
  );
}

async function runGet(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' });
  const body: unknown = await res.json().catch(() => ({ status: res.status }));
  return JSON.stringify(body, null, 2);
}

async function runPost(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  const body: unknown = await res.json().catch(() => ({ status: res.status }));
  return JSON.stringify(body, null, 2);
}

export default function AdminPage() {
  const [seed, setSeed] = useState<ButtonState>(INIT);
  const [sync, setSync] = useState<ButtonState>(INIT);
  const [tfo, setTfo] = useState<ButtonState>(INIT);
  const [engines, setEngines] = useState<ButtonState>(INIT);

  const run = useCallback(
    async (
      setter: React.Dispatch<React.SetStateAction<ButtonState>>,
      fn: () => Promise<string>,
    ) => {
      setter({ loading: true, result: null, ok: null });
      try {
        const result = await fn();
        setter({ loading: false, result, ok: true });
      } catch (err) {
        setter({ loading: false, result: String(err), ok: false });
      }
    },
    [],
  );

  return (
    <div className="min-h-screen pt-14 pb-20" style={{ background: BG }}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-[#64748B]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            Admin Panel
          </p>
          <h1
            className="mt-1 text-[28px] font-bold leading-tight text-white"
            style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
          >
            ENGINE CONTROL
          </h1>
          <p
            className="mt-1 text-[12px] text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            Admin-only. Runs sequentially against the logged-in user.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-[24px]">
          <AdminButton
            label="Seed Players"
            color={CYAN}
            state={seed}
            onClick={() => run(setSeed, () => runGet('/api/admin/sync-players'))}
          />
          <AdminButton
            label="Sync Sleeper"
            color={CYAN}
            state={sync}
            onClick={() => run(setSync, () => runGet('/api/sync/trigger'))}
          />
          <AdminButton
            label="Calculate TFO"
            color={BOOM}
            state={tfo}
            onClick={() => run(setTfo, () => runPost('/api/onboarding/calculate-tfo'))}
          />
          <AdminButton
            label="Run All Engines"
            color="#A78BFA"
            state={engines}
            onClick={() => run(setEngines, () => runGet('/api/admin/run-engines'))}
          />
        </div>

        <p
          className="mt-4 text-center text-[10px] text-[#475569]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          Non-admin users are redirected at the API layer. Results shown as raw JSON.
        </p>
      </div>
    </div>
  );
}
