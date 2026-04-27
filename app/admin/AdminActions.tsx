'use client';

import { useState } from 'react';
import { clsx } from 'clsx';

const ACTIONS = [
  { label: 'Force KTC sync',     endpoint: '/api/admin/sync-ktc',      color: 'border-[#6366F1]/30 text-[#6366F1] hover:bg-[#6366F1]/10' },
  { label: 'Force player DB sync', endpoint: '/api/admin/sync-players', color: 'border-[#6366F1]/30 text-[#6366F1] hover:bg-[#6366F1]/10' },
  { label: 'Clear all Redis cache', endpoint: '/api/admin/clear-cache', color: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' },
  { label: 'Send test digest to me', endpoint: '/api/admin/test-digest', color: 'border-green-500/30 text-green-400 hover:bg-green-500/10' },
];

export default function AdminActions() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function run(endpoint: string) {
    setLoading((p) => ({ ...p, [endpoint]: true }));
    setResults((p) => ({ ...p, [endpoint]: '' }));
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setResults((p) => ({ ...p, [endpoint]: data.message ?? (res.ok ? '✓ Done' : '✗ Failed') }));
    } catch {
      setResults((p) => ({ ...p, [endpoint]: '✗ Network error' }));
    }
    setLoading((p) => ({ ...p, [endpoint]: false }));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ACTIONS.map(({ label, endpoint, color }) => (
        <div key={endpoint} className="flex items-center gap-3">
          <button
            onClick={() => run(endpoint)}
            disabled={loading[endpoint]}
            className={clsx(
              'flex-1 text-sm font-medium px-4 py-3 rounded-xl border transition disabled:opacity-50',
              color
            )}
          >
            {loading[endpoint] ? 'Running…' : label}
          </button>
          {results[endpoint] && (
            <span className={clsx('text-xs', results[endpoint].startsWith('✓') ? 'text-green-400' : 'text-red-400')}>
              {results[endpoint]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
