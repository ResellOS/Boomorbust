'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SettingsNav, { type SettingsSection } from '@/components/settings/SettingsNav';
import ProfileCard from '@/components/settings/ProfileCard';
import LeagueConnections from '@/components/settings/LeagueConnections';
import SubscriptionCard from '@/components/settings/SubscriptionCard';
import UsageDonuts from '@/components/settings/UsageDonuts';
import NotificationToggles from '@/components/settings/NotificationToggles';
import BobEngineCard from '@/components/settings/BobEngineCard';
import FeedbackSection from '@/components/settings/FeedbackSection';
import AppTopNav from '@/components/nav/AppTopNav';
import type { ProfileData } from '@/app/api/settings/profile/route';

// ─── Placeholder sections ────────────────────────────────────────────────────

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center py-20 gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(54,231,161,0.1)', border: '1px solid rgba(54,231,161,0.2)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#36E7A1" strokeWidth="1.5"/><path d="M10 7v3l1.5 1.5" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <p className="text-[15px] font-semibold text-white">{title}</p>
      <p className="text-[13px] text-slate-500 text-center max-w-xs">{description}</p>
    </div>
  );
}

// ─── Dynasty Title section ───────────────────────────────────────────────────

const DYNASTY_TITLES = [
  { id: 'DYNASTY GOAT',   desc: 'The greatest of all time. Undisputed.' },
  { id: 'THE ARCHITECT',  desc: 'Builds through draft, never overpays.' },
  { id: 'THE SHARK',      desc: 'Consistently wins trades, ruthless.' },
  { id: 'THE GAMBLER',    desc: 'High risk, high reward.' },
  { id: 'THE PROFESSOR',  desc: 'Purely data driven, never emotional.' },
  { id: 'THE PROPHET',    desc: 'Consistently ahead of market.' },
];

function DynastyTitleSection({ currentTitle }: { currentTitle: string }) {
  const [selected, setSelected] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dynasty_title: selected }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dynasty Title</p>
      <p className="text-[13px] text-slate-500 mb-5">Your public dynasty identity. Displayed on your profile.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {DYNASTY_TITLES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className="flex flex-col text-left p-4 rounded-xl transition-all"
            style={{
              background: selected === t.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              border: selected === t.id ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p className="text-[13px] font-bold" style={{ color: selected === t.id ? '#A78BFA' : '#94a3b8' }}>{t.id}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all"
        style={{ background: '#36E7A1', color: '#0a0d14' }}
      >
        {saving ? 'Saving…' : 'Save Title'}
      </button>
    </div>
  );
}

function ProfileBadges({ badges }: { badges: ProfileData['badges'] }) {
  if (badges.length === 0) {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">Earned Badges</p>
        <p className="text-[13px] text-slate-500">
          Share feedback when prompted to earn your first badge.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-3">Earned Badges</p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={`${b.badgeType}-${b.awardedAt}`}
            className="inline-flex items-center rounded-full px-3 py-1.5 font-mono text-[12px] font-semibold"
            style={{
              color: '#36E7A1',
              background: 'rgba(54, 231, 161, 0.1)',
              border: '1px solid rgba(54, 231, 161, 0.28)',
            }}
          >
            {b.badgeType === 'feedback_contributor' ? '🏆 ' : ''}
            {b.badgeLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [section,  setSection]  = useState<SettingsSection>('profile');
  const [data,     setData]     = useState<ProfileData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) return;
      const profile = (await res.json()) as ProfileData;

      // Enrich subscription with Stripe renewal when paid
      if (profile.subscription.isPaid) {
        try {
          const billRes = await fetch('/api/stripe/billing-summary');
          if (billRes.ok) {
            const bill = (await billRes.json()) as {
              renewal_iso?: string | null;
              price_label?: string | null;
              interval?: 'month' | 'year' | null;
            };
            if (bill.renewal_iso) {
              profile.subscription.renewsLabel = `Renews ${new Date(bill.renewal_iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
            }
            if (bill.price_label && bill.interval) {
              profile.subscription.price = `${bill.price_label} /${bill.interval === 'year' ? 'yr' : 'mo'}`;
            }
          }
        } catch {
          /* billing optional */
        }
      }

      setData(profile);
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

  const handleNotifChange = async (key: keyof ProfileData['notifications'], value: boolean) => {
    if (!data) return;

    // Optimistic update
    setData((prev) => prev ? { ...prev, notifications: { ...prev.notifications, [key]: value } } : prev);

    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Revert on failure
      setData((prev) => prev ? { ...prev, notifications: { ...prev.notifications, [key]: !value } } : prev);
    }
  };

  const renderSection = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
          ))}
        </div>
      );
    }

    switch (section) {
      case 'profile':
        return (
          <div className="space-y-5">
            {data && <ProfileCard data={data} onEdit={() => {}} />}
            {data && <LeagueConnections leagues={data.leagues} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {data && <SubscriptionCard subscription={data.subscription} />}
              {data && <UsageDonuts usage={data.usage} renewsLabel={data.subscription.renewsLabel} />}
            </div>
            {data && <NotificationToggles notifications={data.notifications} onChange={handleNotifChange} />}
            <div
              className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">BOB Record</p>
              <p className="text-[13px] text-slate-500 mb-4">View your prediction track record and model accuracy.</p>
              <Link
                href="/performance"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold no-underline transition hover:opacity-90"
                style={{ background: 'rgba(54,231,161,0.12)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.25)' }}
              >
                View BOB Record →
              </Link>
            </div>
            <FeedbackSection />
          </div>
        );

      case 'dynasty-title':
        return data ? (
          <div className="space-y-5">
            <DynastyTitleSection currentTitle={data.dynastyTitle} />
            <ProfileBadges badges={data.badges} />
          </div>
        ) : null;

      case 'league-connections':
        return data ? <LeagueConnections leagues={data.leagues} /> : null;

      case 'subscription':
        return data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SubscriptionCard subscription={data.subscription} />
            <UsageDonuts usage={data.usage} renewsLabel={data.subscription.renewsLabel} />
          </div>
        ) : null;

      case 'notifications':
      case 'trade-alerts':
      case 'waiver-alerts':
        return data ? <NotificationToggles notifications={data.notifications} onChange={handleNotifChange} /> : null;

      case 'email-preferences':
        return <Placeholder title="Email Preferences" description="Configure which digest emails you receive and how often." />;

      case 'push-notifications':
        return <Placeholder title="Push Notifications" description="Manage browser and mobile push notification settings." />;

      case 'data-settings':
        return <Placeholder title="Data Settings" description="Control how your data is stored and used within the platform." />;

      case 'privacy-settings':
        return (
          <div className="space-y-5">
            <div
              className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Privacy Settings
              </p>
              <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
                We sync your Sleeper league data to power BOB — we do not sell your personal data.
                Free-tier ads are programmatic only. Export or delete your data anytime from Export
                My Data in the sidebar.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="inline-flex items-center rounded-lg px-4 py-2 text-[12px] font-semibold transition hover:opacity-90"
                  style={{
                    background: 'rgba(54, 231, 161, 0.12)',
                    color: '#36E7A1',
                    border: '1px solid rgba(54, 231, 161, 0.25)',
                  }}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex items-center rounded-lg px-4 py-2 text-[12px] font-semibold transition hover:opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e8ecf4',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        );

      case 'export-data':
        return (
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">Export My Data</p>
            <p className="text-[13px] text-slate-500 mb-5">Download a full export of your dynasty data, trade history, and league stats.</p>
            <div className="space-y-3">
              {['Roster History (.csv)', 'Trade History (.csv)', 'Empire Score History (.json)', 'Full Account Data (.zip)'].map((item) => (
                <div key={item} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[14px] text-white">{item}</p>
                  <button className="px-4 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: 'rgba(54,231,161,0.12)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.25)' }}>
                    Export
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-5">Integrations</p>
            <div className="space-y-3">
              {[
                { name: 'Sleeper',   connected: true,  desc: 'Dynasty leagues & rosters' },
                { name: 'Twitter/X', connected: false, desc: 'Share your Wrapped & stats' },
                { name: 'Discord',   connected: false, desc: 'Bot alerts in your server' },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{int.name}</p>
                    <p className="text-[12px] text-slate-500">{int.desc}</p>
                  </div>
                  <button
                    className="px-4 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={int.connected
                      ? { background: 'rgba(54,231,161,0.1)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.25)' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    {int.connected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'bob-engine':
        return <BobEngineCard />;

      case 'api-access':
        return (
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest mb-1">API Access</p>
            <p className="text-[13px] text-slate-500 mb-5">Build on top of Boom or Bust with our API. Requires All-Pro Terminal subscription.</p>
            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p className="text-[12px] font-bold text-slate-400 mb-2 uppercase tracking-wider">API Key</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-[13px] text-slate-400 font-mono truncate">••••••••••••••••••••••••••••••••</code>
                <button className="px-3 py-1.5 rounded-lg text-[12px] text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>Reveal</button>
                <button className="px-3 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: 'rgba(54,231,161,0.12)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.25)' }}>Regenerate</button>
              </div>
            </div>
            <p className="text-[12px] text-slate-500">Rate limit: 1,000 requests/day · <a href="#" style={{ color: '#36E7A1' }}>API Documentation →</a></p>
          </div>
        );

      default:
        return <Placeholder title={section} description="Coming soon." />;
    }
  };

  const sectionLabels: Record<SettingsSection, string> = {
    'profile':            'Settings / Profile',
    'dynasty-title':      'Settings / Dynasty Title',
    'league-connections': 'Settings / League Connections',
    'subscription':       'Settings / Subscription & Billing',
    'notifications':      'Settings / Notifications',
    'email-preferences':  'Settings / Email Preferences',
    'push-notifications': 'Settings / Push Notifications',
    'trade-alerts':       'Settings / Trade Alerts',
    'waiver-alerts':      'Settings / Waiver Alerts',
    'data-settings':      'Settings / Data Settings',
    'privacy-settings':   'Settings / Privacy Settings',
    'export-data':        'Settings / Export My Data',
    'integrations':       'Settings / Integrations',
    'api-access':         'Settings / API Access',
    'bob-engine':         'Settings / BOB Engine',
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0d14]">
      <AppTopNav username={data?.username} avatarUrl={data?.avatarUrl} />
      <div className="flex min-h-0 flex-1">
      {/* Left sidebar (desktop) */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r sticky top-0 h-dvh overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}
      >
        <SettingsNav active={section} onChange={setSection} onLogout={handleLogout} />
      </aside>

      {/* Mobile nav toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: '#36E7A1', color: '#0a0d14' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 overflow-y-auto"
            style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsNav
              active={section}
              onChange={(s) => { setSection(s); setMobileNavOpen(false); }}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 md:px-6 py-6 overflow-y-auto pb-20 lg:pb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[24px] font-bold text-white">{sectionLabels[section]}</h1>
          <p className="text-[14px] text-slate-500 mt-0.5">Manage your account, leagues, and preferences.</p>
        </div>

        {!loading && !data && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <p className="text-[15px] font-semibold text-red-400">Could not load profile</p>
            <p className="text-[13px] text-slate-500 mt-2">Check your connection and try refreshing.</p>
            <button
              onClick={() => { setLoading(true); fetchProfile(); }}
              className="mt-4 px-4 py-2 rounded-lg text-[13px] font-semibold"
              style={{ background: '#36E7A1', color: '#0a0d14' }}
            >
              Retry
            </button>
          </div>
        )}
        {renderSection()}
      </main>
      </div>
    </div>
  );
}
