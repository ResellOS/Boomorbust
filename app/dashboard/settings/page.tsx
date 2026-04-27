'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { usePreferences, type RiskTolerance } from '@/store/preferences';

const RISK_OPTIONS: { value: RiskTolerance; label: string; desc: string }[] = [
  { value: 'conservative', label: 'Conservative', desc: 'Weight current value more heavily' },
  { value: 'balanced', label: 'Balanced', desc: 'Equal weight to current and future value' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Weight future upside more heavily' },
];

export default function SettingsPage() {
  const supabase = createClient();
  const { riskTolerance, positionalRanking, hiddenLeagues, setRiskTolerance, setPositionalRanking, loadFromData } = usePreferences();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [sleeperConnected, setSleeperConnected] = useState('');
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? '');

      const [{ data: profile }, { data: lgData }] = await Promise.all([
        supabase.from('profiles').select('sleeper_user_id, username, risk_tolerance, preference_data, is_paid').single(),
        supabase.from('leagues').select('id, name'),
      ]);

      if (profile) {
        setSleeperConnected(profile.username ?? profile.sleeper_user_id ?? '');
        loadFromData(profile);
        setDigestEnabled(profile.preference_data?.digest_enabled ?? true);
        setIsPaid(profile.is_paid ?? false);
      }
      setLeagues(lgData ?? []);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success('Password updated'); setNewPassword(''); }
  }

  async function reconnectSleeper() {
    if (!sleeperUsername.trim()) return;
    try {
      const res = await fetch(`https://api.sleeper.app/v1/user/${sleeperUsername.trim()}`);
      if (!res.ok) { toast.error('Sleeper user not found'); return; }
      const data = await res.json();
      await supabase.from('profiles').upsert({ sleeper_user_id: data.user_id, username: data.username });
      setSleeperConnected(data.username);
      toast.success(`Connected to @${data.username}`);
    } catch { toast.error('Failed to connect Sleeper account'); }
  }

  async function handleSync() {
    setSyncResult(null);
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) { toast.success(`Synced ${data.leagues_synced} leagues`); setSyncResult(`${data.leagues_synced} leagues synced`); }
    else { toast.error(data.error ?? 'Sync failed'); setSyncResult('Sync failed'); }
  }

  function movePosition(index: number, direction: -1 | 1) {
    const newRanking = [...positionalRanking];
    const target = index + direction;
    if (target < 0 || target >= newRanking.length) return;
    [newRanking[index], newRanking[target]] = [newRanking[target], newRanking[index]];
    setPositionalRanking(newRanking);
  }

  async function savePreferences() {
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      risk_tolerance: riskTolerance,
      preference_data: { positionalRanking, hiddenLeagues, digest_enabled: digestEnabled },
      updated_at: new Date().toISOString(),
    });
    if (error) toast.error('Failed to save preferences');
    else toast.success('Preferences saved');
    setSaving(false);
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? 'Could not open billing portal');
    } catch { toast.error('Failed to open billing portal'); }
    setPortalLoading(false);
  }

  async function subscribe() {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? 'Could not start checkout');
    } catch { toast.error('Failed to start checkout'); }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">Account &amp; Preferences</p>
      </div>

      {/* Account */}
      <Section title="Account">
        <div>
          <label className="text-xs text-[#94A3B8] block mb-1.5">Email</label>
          <input readOnly value={email} className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[#94A3B8] cursor-not-allowed" />
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <label className="text-xs text-[#94A3B8] block">Change Password</label>
          <div className="flex gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              minLength={6}
              className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1]"
            />
            <button type="submit" className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white text-sm font-medium px-4 rounded-lg transition">Update</button>
          </div>
        </form>
      </Section>

      {/* Sleeper connection */}
      <Section title="Sleeper Connection">
        {sleeperConnected && (
          <p className="text-sm text-[#CBD5E1]">
            Connected as <span className="text-white font-medium">@{sleeperConnected}</span>
          </p>
        )}
        <div className="flex gap-3">
          <input
            value={sleeperUsername}
            onChange={(e) => setSleeperUsername(e.target.value)}
            placeholder="Sleeper username"
            className="flex-1 bg-[#0F172A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1]"
          />
          <button onClick={reconnectSleeper} className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white text-sm font-medium px-4 rounded-lg transition">
            {sleeperConnected ? 'Reconnect' : 'Connect'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSync} className="bg-white/10 hover:bg-white/15 text-white text-sm px-4 py-2 rounded-lg transition">
            Sync Now
          </button>
          {syncResult && <p className="text-xs text-[#94A3B8]">{syncResult}</p>}
        </div>
      </Section>

      {/* Dynasty preferences */}
      <Section title="Dynasty Preferences">
        <div>
          <label className="text-xs text-[#94A3B8] block mb-3">Risk Tolerance</label>
          <div className="space-y-2">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRiskTolerance(opt.value)}
                className={clsx(
                  'w-full text-left px-4 py-3 rounded-xl border text-sm transition',
                  riskTolerance === opt.value
                    ? 'border-[#6366F1] bg-[#6366F1]/10 text-white'
                    : 'border-white/10 text-[#CBD5E1] hover:border-white/20'
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-[#94A3B8] ml-2 text-xs">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#94A3B8] block mb-3">Positional Value Ranking</label>
          <ul className="space-y-2">
            {positionalRanking.map((pos, i) => (
              <li key={pos} className="flex items-center gap-3 bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3">
                <span className="text-[#94A3B8] text-xs w-5">{i + 1}.</span>
                <span className="text-white font-medium flex-1">{pos}</span>
                <div className="flex gap-1">
                  <button onClick={() => movePosition(i, -1)} disabled={i === 0} className="text-[#94A3B8] hover:text-white disabled:opacity-30 p-1">↑</button>
                  <button onClick={() => movePosition(i, 1)} disabled={i === positionalRanking.length - 1} className="text-[#94A3B8] hover:text-white disabled:opacity-30 p-1">↓</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#CBD5E1] font-medium">Weekly digest email</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">Monday morning summary of injuries, standings, and hot pickups</p>
          </div>
          <button
            onClick={() => setDigestEnabled(!digestEnabled)}
            className={clsx(
              'relative w-11 h-6 rounded-full transition-colors',
              digestEnabled ? 'bg-[#6366F1]' : 'bg-white/10'
            )}
          >
            <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', digestEnabled ? 'left-5' : 'left-0.5')} />
          </button>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="text-sm text-[#6366F1] hover:text-white transition"
        >
          Save notification preferences
        </button>
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        {isPaid ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm text-green-400 font-medium">Pro — Active</p>
            </div>
            <p className="text-xs text-[#94A3B8]">Full access to Trade Finder, Dynasty Coach, Season Wrapped, and all premium features.</p>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition"
            >
              {portalLoading ? 'Loading…' : 'Manage billing →'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#CBD5E1]">Unlock all features with The Front Office Pro.</p>
            <ul className="space-y-1.5 text-sm text-[#94A3B8]">
              <li className="flex items-center gap-2"><span className="text-[#6366F1]">✦</span> Dynasty Coach AI — unlimited advice</li>
              <li className="flex items-center gap-2"><span className="text-[#6366F1]">✦</span> Trade Finder with AI pitches</li>
              <li className="flex items-center gap-2"><span className="text-[#6366F1]">✦</span> Season Wrapped shareable card</li>
              <li className="flex items-center gap-2"><span className="text-[#6366F1]">✦</span> Weekly email digest</li>
            </ul>
            <button
              onClick={subscribe}
              className="bg-[#6366F1] hover:bg-[#5254cc] text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
            >
              Upgrade to Pro →
            </button>
          </div>
        )}
      </Section>

      {/* Leagues */}
      <Section title="Leagues">
        <ul className="space-y-2">
          {leagues.length === 0 && <p className="text-[#94A3B8] text-sm">No leagues synced yet.</p>}
          {leagues.map((league) => {
            const hidden = hiddenLeagues.includes(league.id);
            const { toggleLeagueVisibility } = usePreferences.getState();
            return (
              <li key={league.id} className="flex items-center gap-3 bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3">
                <span className="text-[#CBD5E1] flex-1 text-sm truncate">{league.name}</span>
                <button
                  onClick={() => toggleLeagueVisibility(league.id)}
                  className={clsx('text-xs font-medium px-3 py-1 rounded-lg border transition', hidden ? 'border-white/10 text-[#94A3B8]' : 'border-green-500/30 text-green-400 bg-green-500/10')}
                >
                  {hidden ? 'Hidden' : 'Visible'}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Admin — only visible to admin email */}
      {email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
        <Section title="Admin">
          <p className="text-xs text-[#94A3B8]">Internal admin panel for The Front Office.</p>
          <Link
            href="/admin"
            className="inline-block text-sm font-medium text-[#6366F1] hover:text-white border border-[#6366F1]/30 hover:border-[#6366F1] px-4 py-2 rounded-xl transition"
          >
            Open Admin Panel →
          </Link>
        </Section>
      )}
    </main>
  );
}
