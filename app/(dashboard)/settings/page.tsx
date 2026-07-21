'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppTopNav from '@/components/nav/AppTopNav';
import { SyncButton } from '@/components/dashboard/SyncButton';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  getDisplayPrefs,
  saveDisplayPrefs,
  getHiddenLeagues,
  setHiddenLeagues,
  type NotificationPrefs,
  type DisplayPrefs,
} from '@/lib/settings/prefs';
import type { ProfileData } from '@/app/api/settings/profile/route';

const CARD = 'rounded-xl p-5 md:p-6';
const CARD_STYLE = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const;

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="font-figtree text-[13px] font-bold uppercase tracking-[1.5px] text-slate-400">{title}</p>
      {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
    >
      <span className="font-figtree text-[13px] text-white">{label}</span>
      <span
        className="relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors"
        style={{ background: checked ? '#36E7A1' : 'rgba(255,255,255,0.12)' }}
      >
        <span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? '21px' : '3px' }}
        />
      </span>
    </button>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-lg px-4 py-2 font-figtree text-[13px] font-bold transition-all"
      style={{ background: saved ? 'rgba(54,231,161,0.15)' : '#36E7A1', color: saved ? '#36E7A1' : '#0a0d14', border: '1px solid rgba(54,231,161,0.3)' }}
    >
      {saved ? '✓ Saved' : 'Save Preferences'}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) return;
      setData((await res.json()) as ProfileData);
    } catch {
      /* handled by the error card below */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0d14]">
      <AppTopNav username={data?.username} avatarUrl={data?.avatarUrl} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 md:px-6">
        <div className="mb-6">
          <h1 className="font-figtree text-[24px] font-bold text-white">Settings</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Manage your account, leagues, and preferences.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl" style={CARD_STYLE} />
            ))}
          </div>
        ) : !data ? (
          <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-[15px] font-semibold text-red-400">Could not load your settings</p>
            <p className="mt-2 text-[13px] text-slate-500">Check your connection and try again.</p>
            <button onClick={() => { setLoading(true); fetchProfile(); }} className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ background: '#36E7A1', color: '#0a0d14' }}>
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <AccountSection data={data} onSaved={fetchProfile} />
            <LeaguesSection data={data} />
            <NotificationsSection />
            <DisplaySection />
            <DataSection data={data} />
            <AboutSection />
            <DangerZone onDeleted={handleLogout} />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Section 1 — Account ──────────────────────────────────────────────────────

function AccountSection({ data, onSaved }: { data: ProfileData; onSaved: () => void }) {
  const [name, setName] = useState(data.teamName);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== data.teamName && name.trim().length > 0;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: name.trim() }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={CARD} style={CARD_STYLE}>
      <SectionHeader title="Account" />
      <label className="mb-1 block text-[12px] text-slate-500">Display Name</label>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-figtree text-[14px] text-white outline-none focus:border-boom/50"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="shrink-0 rounded-lg px-4 py-2 font-figtree text-[13px] font-bold transition-all disabled:opacity-40"
          style={{ background: '#36E7A1', color: '#0a0d14' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <label className="mb-1 mt-4 block text-[12px] text-slate-500">Sleeper Username</label>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-[13px] text-slate-400">
        @{data.username}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className="rounded-full px-3 py-1 font-mono text-[11px] font-bold"
          style={{ color: '#36E7A1', background: 'rgba(54,231,161,0.12)', border: '1px solid rgba(54,231,161,0.3)' }}
        >
          {data.subscription.label} Plan
        </span>
        {data.subscription.isPaid && (
          <span className="font-mono text-[10px] text-boom">🏆 Founding Member</span>
        )}
        <span className="text-[12px] text-slate-500">Member since {data.memberSince}</span>
      </div>
    </section>
  );
}

// ─── Section 2 — Connected Leagues ────────────────────────────────────────────

function LeaguesSection({ data }: { data: ProfileData }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { setHidden(getHiddenLeagues()); }, []);

  const disconnect = (id: string) => {
    const next = hidden.includes(id) ? hidden : [...hidden, id];
    setHidden(next);
    setHiddenLeagues(next);
    setConfirmId(null);
  };
  const reconnect = (id: string) => {
    const next = hidden.filter((x) => x !== id);
    setHidden(next);
    setHiddenLeagues(next);
  };

  const visible = data.leagues.filter((l) => !hidden.includes(l.id));

  return (
    <section className={CARD} style={CARD_STYLE}>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader title={`Connected Leagues (${visible.length})`} />
        <Link
          href="/leagues/connect"
          className="shrink-0 rounded-lg px-3 py-1.5 font-figtree text-[12px] font-bold no-underline"
          style={{ background: 'rgba(54,231,161,0.12)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.25)' }}
        >
          + Add More Leagues
        </Link>
      </div>

      {data.leagues.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-slate-500">
          No leagues connected yet. Connect your Sleeper account to get started.
        </p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {data.leagues.map((lg) => {
            const isHidden = hidden.includes(lg.id);
            return (
              <div key={lg.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-figtree text-[14px] font-semibold ${isHidden ? 'text-slate-600 line-through' : 'text-white'}`}>
                    {lg.name}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">{lg.format} · {lg.role} · since {lg.since}</p>
                </div>
                {isHidden ? (
                  <button type="button" onClick={() => reconnect(lg.id)} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 hover:text-white">
                    Restore
                  </button>
                ) : confirmId === lg.id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-slate-400">Sure?</span>
                    <button type="button" onClick={() => disconnect(lg.id)} className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                      Disconnect
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-[12px] text-slate-500 hover:text-white">Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmId(lg.id)} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-400">
                    Disconnect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {hidden.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          Disconnected leagues are hidden on this device. Restore them above or re-sync from Connect Leagues.
        </p>
      )}
    </section>
  );
}

// ─── Section 3 — Notifications ────────────────────────────────────────────────

const NOTIF_ROWS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'regimeChange', label: 'Regime change alerts' },
  { key: 'sellWindow', label: 'Sell window alerts' },
  { key: 'breakoutSignals', label: 'Breakout signals' },
  { key: 'championshipChanges', label: 'Championship odds changes > 5%' },
  { key: 'tradeOpportunities', label: 'New trade opportunities' },
  { key: 'weeklyReport', label: 'Weekly dynasty report' },
];

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPrefs(getNotificationPrefs()); }, []);
  if (!prefs) return null;

  const set = (key: keyof NotificationPrefs, v: boolean) => {
    setPrefs({ ...prefs, [key]: v });
    setSaved(false);
  };
  const save = () => { saveNotificationPrefs(prefs); setSaved(true); };

  return (
    <section className={CARD} style={CARD_STYLE}>
      <SectionHeader title="Notifications" sub="Choose what BOB alerts you about." />
      <div className="divide-y divide-white/[0.05]">
        {NOTIF_ROWS.map((r) => (
          <Toggle key={r.key} label={r.label} checked={prefs[r.key]} onChange={(v) => set(r.key, v)} />
        ))}
      </div>
      <SaveButton onClick={save} saved={saved} />
    </section>
  );
}

// ─── Section 4 — Display ──────────────────────────────────────────────────────

const DISPLAY_ROWS: { key: keyof DisplayPrefs; label: string }[] = [
  { key: 'showKtc', label: 'Show KTC values alongside BOB' },
  { key: 'showConfidence', label: 'Show confidence percentages' },
  { key: 'compactMode', label: 'Compact mode' },
  { key: 'showReasoning', label: 'Show BOB reasoning on cards' },
];

function DisplaySection() {
  const [prefs, setPrefs] = useState<DisplayPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPrefs(getDisplayPrefs()); }, []);
  if (!prefs) return null;

  const set = (key: keyof DisplayPrefs, v: boolean) => {
    setPrefs({ ...prefs, [key]: v });
    setSaved(false);
  };
  const save = () => { saveDisplayPrefs(prefs); setSaved(true); };

  return (
    <section className={CARD} style={CARD_STYLE}>
      <SectionHeader title="Display" sub="Tune how information shows across the app." />
      <div className="divide-y divide-white/[0.05]">
        {DISPLAY_ROWS.map((r) => (
          <Toggle key={r.key} label={r.label} checked={prefs[r.key]} onChange={(v) => set(r.key, v)} />
        ))}
      </div>
      <SaveButton onClick={save} saved={saved} />
    </section>
  );
}

// ─── Section 5 — Data ─────────────────────────────────────────────────────────

function DataSection({ data }: { data: ProfileData }) {
  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { username: data.username, teamName: data.teamName, memberSince: data.memberSince, plan: data.subscription.label },
      leagues: data.leagues,
      preferences: { notifications: getNotificationPrefs(), display: getDisplayPrefs() },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boom-or-bust-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={CARD} style={CARD_STYLE}>
      <SectionHeader title="Data" sub="Sync your leagues or export a copy of your data." />
      <div className="flex flex-wrap items-center gap-3">
        <SyncButton />
        <button
          type="button"
          onClick={exportData}
          className="rounded-lg px-4 py-2 font-figtree text-[13px] font-bold no-underline transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#e8ecf4', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Export My Data
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Export downloads a JSON file of your leagues and preferences.</p>
    </section>
  );
}

// ─── Section 6 — About ────────────────────────────────────────────────────────

function AboutSection() {
  const links: { label: string; href: string }[] = [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Contact', href: 'mailto:hello@boomorbust.app' },
    { label: 'Discord', href: 'https://discord.gg/boomorbust' },
  ];
  return (
    <section className={CARD} style={CARD_STYLE}>
      <SectionHeader title="About" />
      <div className="space-y-1.5 font-mono text-[12px] text-slate-400">
        <div className="flex justify-between"><span>BOB Version</span><span className="text-white">Beta 1.0</span></div>
        <div className="flex justify-between"><span>Forward Validation</span><span className="text-white">Feb 1, 2027</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="rounded-lg px-3 py-1.5 font-figtree text-[12px] no-underline transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Section 7 — Danger Zone ──────────────────────────────────────────────────

function ConfirmAction({
  title, description, confirmWord, actionLabel, onConfirm,
}: {
  title: string; description: string; confirmWord: string; actionLabel: string; onConfirm: () => Promise<void> | void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = text.trim().toLowerCase() === confirmWord;

  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <p className="font-figtree text-[13px] font-bold text-red-400">{title}</p>
      <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Type "${confirmWord}" to confirm`}
          className="min-w-0 flex-1 rounded-lg border border-red-500/25 bg-white/[0.03] px-3 py-2 font-mono text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-red-500/50"
        />
        <button
          type="button"
          disabled={!ready || busy}
          onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          className="shrink-0 rounded-lg px-4 py-2 font-figtree text-[13px] font-bold transition-all disabled:opacity-40"
          style={{ background: '#EF4444', color: '#fff' }}
        >
          {busy ? 'Working…' : actionLabel}
        </button>
      </div>
    </div>
  );
}

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const disconnectAll = () => {
    // No bulk-disconnect endpoint exists; send the user to league setup to
    // manage/reconnect. (Per-league hide lives in the Connected Leagues section.)
    window.location.href = '/leagues/connect';
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (res.ok) onDeleted();
    } catch {
      /* surfaced by the button staying enabled */
    }
  };

  return (
    <section className={CARD} style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.25)' }}>
      <SectionHeader title="Danger Zone" />
      <div className="space-y-3">
        <ConfirmAction
          title="Disconnect All Leagues"
          description="Removes every league from your account and returns you to league setup."
          confirmWord="disconnect"
          actionLabel="Disconnect All"
          onConfirm={disconnectAll}
        />
        <ConfirmAction
          title="Delete Account"
          description="Permanently deletes your account and all associated data. This cannot be undone."
          confirmWord="delete"
          actionLabel="Delete Account"
          onConfirm={deleteAccount}
        />
      </div>
    </section>
  );
}
