'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import SparklineGraph from '@/components/SparklineGraph';
import type { AdminDashboardPayload, ErrorLogRow, PipelineRow } from '@/lib/admin/dashboard-data';

type BuildMeta = {
  sha: string;
  node: string;
  next: string;
  vercelUrl: string | null;
  deployedAt: string;
};

function sourceColor(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('stripe')) return 'text-red-400';
  if (s.includes('cron') || s.includes('sync')) return 'text-amber-400';
  if (s.includes('coach') || s.includes('anthropic') || s.includes('openai')) return 'text-purple-400';
  return 'text-[var(--cyan)]';
}

function formatIso(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span className={clsx('inline-block h-2 w-2 rounded-full', ok ? 'bg-[var(--green)]' : 'bg-amber-500')} title={ok ? 'Healthy' : 'Stale'} />
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-5', className)}>{children}</div>;
}

export default function AdminDashboardClient({
  initial,
  buildMeta,
}: {
  initial: AdminDashboardPayload;
  buildMeta: BuildMeta;
}) {
  const [data, setData] = useState(initial);
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [profileModal, setProfileModal] = useState<{ id: string; json: Record<string, unknown> | null; email?: string | null } | null>(null);

  const errorSectionRef = useRef<HTMLElement | null>(null);

  const logLine = useCallback((line: string) => {
    setActionLogs((p) => {
      const t = new Date().toISOString().slice(11, 19);
      return [`[${t}] ${line}`, ...p].slice(0, 25);
    });
  }, []);

  const supabase = createClient();

  useEffect(() => {
    const ch = supabase
      .channel('admin-dash-profiles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => setData((d) => ({ ...d, totalUsers: d.totalUsers + 1 }))
      )
      .subscribe();

    return () => {
      try {
        void supabase.removeChannel(ch);
      } catch {}
    };
  }, [supabase]);

  async function runAction(key: string, fn: () => Promise<void>) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const clearRedis = () =>
    runAction('redis', async () => {
      const res = await fetch('/api/admin/clear-cache');
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.error(body.error ?? 'Failed');
        logLine(`Clear Redis: ✗ ${body.error}`);
        return;
      }
      toast.success(body.message ?? 'Redis cleared');
      logLine(`Clear Redis: ${body.message}`);
    });

  const triggerCron =
    (key: keyof { 'sync-ktc': ''; 'sync-sleeper': ''; 'calculate-bbv': '' }, label: string) =>
    () =>
      runAction(key, async () => {
        const res = await fetch('/api/admin/cron', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: key }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error((body as { error?: string }).error ?? label + ' failed');
          logLine(`${label}: ✗ ${(body as { error?: string }).error}`);
          return;
        }
        toast.success(`${label} ran`);
        logLine(`${label}: ${JSON.stringify(body)}`);
      });

  const digestTest = () =>
    runAction('digest', async () => {
      const res = await fetch('/api/admin/test-digest', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        toast.error(String((body as { message?: string }).message ?? 'Digest failed'));
        logLine(`Test digest: ✗`);
        return;
      }
      toast.success(String((body as { message?: string }).message ?? 'Sent'));
      logLine(`Test digest: OK`);
    });

  const seedFfig = () =>
    runAction('ffig', async () => {
      const res = await fetch('/api/admin/seed-ffig', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(String((body as { error?: string }).error ?? 'Seed failed'));
        logLine(`Seed FFIG: ✗`);
        return;
      }
      toast.success(String((body as { message?: string }).message ?? 'Seeded'));
      logLine(`Seed FFIG: OK`);
    });

  async function openProfile(id: string) {
    try {
      const res = await fetch(`/api/admin/user-profile?id=${encodeURIComponent(id)}`);
      const body = await res.json();
      if (!res.ok) {
        toast.error((body as { error?: string }).error ?? 'Could not load user');
        return;
      }
      setProfileModal({
        id,
        email: body.email ?? null,
        json: body.profile ?? null,
      });
    } catch {
      toast.error('Network error loading profile');
    }
  }

  const scrollToErrors = () => errorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const errs24 = data.errors24h;
  const errorHigh = errs24 > 10;

  return (
    <AppBackground intensity="minimal">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:gap-14">
        <div>
          <h1 className="display text-[48px] leading-none tracking-wide text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Operational overview · Realtime listens for new profiles (Realtime must be enabled in Supabase)
          </p>
        </div>

        {/* System health */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Total Users</p>
            <p className="display mt-3 text-4xl text-white">{data.totalUsers}</p>
            <p className="mt-2 text-xs font-semibold text-[var(--green)]">+{data.signupsThisWeek} this week</p>
            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase text-[var(--text-muted)]">Signups · last 30 days</p>
              <SparklineGraph data={data.signupSparkline} height={56} />
            </div>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Active Subscribers</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
              <span>
                <span className="font-semibold text-white">{data.proCount}</span> Pro
              </span>
              <span>
                <span className="font-semibold text-amber-200">{data.eliteCount}</span> Elite
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase text-[var(--text-muted)]">MRR (Stripe)</p>
              <p className="display mt-1 text-2xl text-[var(--gold)]">
                {data.mrrUsd != null ? `$${data.mrrUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </p>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase text-[var(--text-muted)]">Churn (30d vs active)</p>
              <p
                className={clsx(
                  'mt-1 text-lg font-bold',
                  data.churnPct != null && data.churnPct > 5 ? 'text-[var(--red)]' : 'text-[var(--text-secondary)]'
                )}
              >
                {data.churnPct != null ? `${data.churnPct}%` : '—'}
              </p>
            </div>
          </Card>

          <Card className="sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Data Pipeline</p>
            <ul className="mt-5 space-y-4 text-xs text-[var(--text-secondary)]">
              <PipelineLine row={data.pipeline.ktc} />
              <PipelineLine row={data.pipeline.bbv} />
              <PipelineLine row={data.pipeline.sleeper} />
              <PipelineLine row={data.pipeline.injuries} />
            </ul>
          </Card>

          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Errors (24h)</p>
            <p className={clsx('display mt-3 text-4xl', errorHigh ? 'text-[var(--red)]' : 'text-white')}>{errs24}</p>
            <button
              type="button"
              onClick={() => scrollToErrors()}
              className="mt-6 w-full rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-[var(--indigo-light)] transition hover:bg-white/[0.04]"
            >
              View Logs ↓
            </button>
          </Card>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction
              title="Clear Redis Cache"
              desc="DELETE ktc cache keys + sleeper_players blob"
              busy={busy['redis']}
              onClick={clearRedis}
            />
            <QuickAction title="Force KTC Sync" desc="Cron: warm scraped values cache" busy={busy['sync-ktc']} onClick={triggerCron('sync-ktc', 'KTC sync')} />
            <QuickAction title="Force Sleeper Sync" desc="Batch sync Sleeper leagues" busy={busy['sync-sleeper']} onClick={triggerCron('sync-sleeper', 'Sleeper sync')} />
            <QuickAction title="Test Weekly Digest" desc="Emails admin via Resend" busy={busy['digest']} onClick={digestTest} />
            <QuickAction
              title="Recalculate All BBV"
              desc="Full bbv_values pass"
              busy={busy['calculate-bbv']}
              onClick={triggerCron('calculate-bbv', 'BBV')}
            />
            <QuickAction title="Seed F-FIG Data" desc="Historical prospect rows" busy={busy['ffig']} onClick={seedFfig} />
          </div>
        </section>

        {/* Action log */}
        <section className="rounded-xl border border-[var(--border)] bg-black/25 p-4 font-mono text-[11px] text-[var(--text-secondary)]">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Action log</div>
          {actionLogs.length === 0 ? (
            <p>No actions yet.</p>
          ) : (
            actionLogs.map((l, i) => (
              <div key={`${l}-${i}`}>{l}</div>
            ))
          )}
        </section>

        {/* Tables */}
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent users (latest signups)</h2>
            <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/90">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 pl-4 pr-2 font-semibold">Email</th>
                    <th className="py-3 pr-2 font-semibold">Sleeper</th>
                    <th className="py-3 pr-2 font-semibold">Tier</th>
                    <th className="py-3 pr-4 font-semibold">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b border-[var(--border)]/70 hover:bg-white/[0.03]"
                      onClick={() => openProfile(u.id)}
                    >
                      <td className="max-w-[200px] truncate py-2.5 pl-4 pr-2 text-[var(--text-secondary)]">{u.email ?? '—'}</td>
                      <td className="py-2.5 pr-2 text-[var(--text-primary)]">@{u.username ?? '—'}</td>
                      <td className="py-2.5 pr-2 capitalize text-[var(--text-secondary)]">{u.tier}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-[var(--text-muted)]">{formatIso(u.signedUpAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section ref={errorSectionRef}>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Recent errors · last {data.errorLogs.length}</h2>
            <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/90">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-3 pl-4 pr-2 font-semibold">Source</th>
                    <th className="py-3 pr-2 font-semibold">Message</th>
                    <th className="py-3 pr-4 font-semibold whitespace-nowrap">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errorLogs.map((e) => (
                    <ExpandedErrorRow
                      key={e.id}
                      expanded={expandedRow === e.id}
                      row={e}
                      onToggle={() => setExpandedRow((x) => (x === e.id ? null : e.id))}
                      color={sourceColor(e.source)}
                    />
                  ))}
                  {data.errorLogs.length === 0 && (
                    <tr>
                      <td className="p-8 text-[var(--text-muted)]" colSpan={3}>
                        Clean slate — nothing logged recently.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap gap-x-8 gap-y-2 border-t border-[var(--border)] pt-8 text-[11px] text-[var(--text-muted)]">
          <span>
            SHA <span className="font-mono text-[var(--text-secondary)]">{buildMeta.sha}</span>
          </span>
          <span>Fetched · {formatIso(buildMeta.deployedAt)}</span>
          <span>Vercel {buildMeta.vercelUrl ? <span className="font-mono text-[var(--text-secondary)]">{buildMeta.vercelUrl}</span> : 'local'}</span>
          <span>Node {buildMeta.node}</span>
          <span>Next {buildMeta.next}</span>
        </footer>
      </div>

      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={() => setProfileModal(null)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="display text-xl text-white">Profile</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{profileModal.email}</p>
              </div>
              <button type="button" className="text-[var(--text-muted)] hover:text-white" onClick={() => setProfileModal(null)}>
                Close
              </button>
            </div>
            <pre className="mt-6 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-4 text-[11px] text-emerald-200/95">
              {profileModal.json ? JSON.stringify(profileModal.json, null, 2) : '{}'}
            </pre>
          </div>
        </div>
      )}
    </AppBackground>
  );
}

function PipelineLine({ row }: { row: PipelineRow }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2">
        <HealthDot ok={row.ok} />
        <span className="text-[var(--text-primary)]">{row.label}</span>
      </span>
      <span className="max-w-[60%] text-right text-[var(--text-muted)]">{formatIso(row.lastIso)}</span>
    </li>
  );
}

function QuickAction({
  title,
  desc,
  busy,
  onClick,
}: {
  title: string;
  desc: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="flex flex-col">
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={clsx(
          'group flex flex-1 flex-col text-left outline-none ring-offset-2 ring-offset-[var(--bg-primary)] disabled:opacity-60',
          busy && 'cursor-wait'
        )}
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
          {busy ? <Spinner /> : null}
          {title}
        </span>
        <span className="mt-2 text-[12px] text-[var(--text-muted)]">{desc}</span>
      </button>
    </Card>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--indigo-light)] border-t-transparent" />
  );
}

function ExpandedErrorRow({
  row,
  expanded,
  onToggle,
  color,
}: {
  row: ErrorLogRow;
  expanded: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <>
      <tr className={clsx('cursor-pointer border-b border-[var(--border)]/70 hover:bg-white/[0.03]', expanded && 'bg-white/[0.04]')} onClick={onToggle}>
        <td className={clsx('py-3 pl-4 pr-2 font-mono text-[11px]', color)}>{row.source}</td>
        <td className="max-w-[200px] truncate py-3 pr-2 font-mono text-[11px] text-[var(--text-secondary)] sm:max-w-md">{row.message}</td>
        <td className="py-3 pr-4 whitespace-nowrap text-[10px] text-[var(--text-muted)]">{formatIso(row.created_at)}</td>
      </tr>
      {expanded && (
        <tr className="bg-black/35">
          <td colSpan={3} className="px-4 pb-6 pt-0">
            <p className="mb-3 text-[10px] font-bold uppercase text-[var(--text-muted)]">Full message</p>
            <pre className="mb-6 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 p-3 font-mono text-[11px] text-[var(--text-secondary)]">{row.message}</pre>
            {row.metadata != null ? (
              <>
                <p className="mb-3 text-[10px] font-bold uppercase text-[var(--text-muted)]">Metadata</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 p-3 font-mono text-[11px] text-amber-200/95">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)]">No metadata</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
