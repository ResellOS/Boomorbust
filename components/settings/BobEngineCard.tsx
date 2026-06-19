'use client';

import { useCallback, useEffect, useState } from 'react';

interface EngineStatus {
  online: boolean;
  lastRun: string | null;
  dynastyCount: number;
}

const WEIGHTS = [
  { label: 'Opportunity', value: '35%' },
  { label: 'Scheme Fit', value: '25%' },
  { label: 'Profile', value: '25%' },
  { label: 'Situation', value: '15%' },
];

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BobEngineCard() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/engine/status', { cache: 'no-store' });
      if (res.ok) {
        setStatus((await res.json()) as EngineStatus);
      } else {
        setStatus({ online: false, lastRun: null, dynastyCount: 0 });
      }
    } catch {
      setStatus({ online: false, lastRun: null, dynastyCount: 0 });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const rescore = useCallback(async () => {
    setRescoring(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/rescore-all', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json?.ok !== false) {
        const scored = json?.scored ?? 0;
        setResult({
          ok: true,
          message: `Rescore complete — ${scored.toLocaleString()} players scored.`,
        });
        loadStatus();
      } else {
        setResult({
          ok: false,
          message: json?.error ?? 'Rescore failed. Admin access required.',
        });
      }
    } catch {
      setResult({ ok: false, message: 'Rescore request failed.' });
    } finally {
      setRescoring(false);
    }
  }, [loadStatus]);

  const online = status?.online ?? false;

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1">BOB Engine</p>
      <p className="text-[12px] text-slate-500 mb-5">
        Proprietary scoring engine. Trigger a full rescore of every player across dynasty contexts.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Engine Status</p>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: loadingStatus ? '#64748b' : online ? '#36E7A1' : '#EF4444',
                boxShadow: !loadingStatus && online ? '0 0 8px #36E7A1' : undefined,
              }}
            />
            <span className="text-[14px] font-semibold" style={{ color: loadingStatus ? '#94a3b8' : online ? '#36E7A1' : '#EF4444' }}>
              {loadingStatus ? 'Checking…' : online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Rescore</p>
          <p className="font-mono text-[13px] text-white">{loadingStatus ? '…' : fmtTime(status?.lastRun ?? null)}</p>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Players Scored</p>
          <p className="font-mono text-[16px] font-semibold text-[#36E7A1]">
            {loadingStatus ? '…' : (status?.dynastyCount ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">TFO Weights</p>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map((w) => (
            <div key={w.label} className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="font-mono text-[11px] text-slate-400">{w.label}</span>
              <span className="font-mono text-[13px] font-semibold text-white">{w.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={rescore}
          disabled={rescoring}
          className="px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-60"
          style={{ background: '#36E7A1', color: '#0a0d14' }}
        >
          {rescoring ? 'Rescoring…' : 'Rescore All Players'}
        </button>
        {result && (
          <span className="text-[12px] font-medium" style={{ color: result.ok ? '#36E7A1' : '#EF4444' }}>
            {result.message}
          </span>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-600">
        Admin-only. Reads bbv_values, writes formula_scores (dynasty / PPR).
      </p>
    </div>
  );
}
