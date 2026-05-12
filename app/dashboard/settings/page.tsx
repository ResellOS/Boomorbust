'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { type RiskTolerance, usePreferences } from '@/store/preferences';
import AppBackground from '@/components/AppBackground';
import LeagueNameSearch from '@/components/LeagueNameSearch';
import { appendLeagueIdToDraft, parseLeagueIds } from '@/lib/leagueIds';
import {
  inferPositionPriorityFromRanking,
  mergePreferenceData,
  rankingFromPositionPriority,
  type ContentionWindow,
  type DefaultValueSystem,
  type PositionPriority,
  type RebuildPhilosophy,
  type UserPreferenceData,
} from '@/lib/preferences/preference-data';

const TABS = ['account', 'preferences', 'billing', 'notifications'] as const;
type TabId = (typeof TABS)[number];

const RISK_OPTS: { v: RiskTolerance; label: string }[] = [
  { v: 'conservative', label: 'Conservative' },
  { v: 'balanced', label: 'Balanced' },
  { v: 'aggressive', label: 'Aggressive' },
];

type BillingSummary = {
  tier: 'free' | 'pro' | 'elite';
  is_paid: boolean;
  renewal_iso: string | null;
  price_label: string | null;
  interval: 'month' | 'year' | null;
  card_last4: string | null;
};

function hasPushPublicEnv(): boolean {
  const a = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const b = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  return Boolean((a?.length ?? 0) > 0 || (b?.length ?? 0) > 0);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-6 space-y-5">
      <h2 className="font-[family-name:var(--font-body)] text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

function RadioRow<K extends string>({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: K;
  onChange: (v: K) => void;
  options: { id: K; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label
            key={o.id}
            className={clsx(
              'flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition',
              value === o.id
                ? 'border-[var(--indigo)] bg-[var(--indigo)]/15 text-white'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-white/15'
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-[var(--border)] first:border-0 first:pt-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={clsx(
          'relative shrink-0 w-11 h-6 rounded-full transition-colors outline-none focus-visible:ring-2 ring-[var(--indigo)] disabled:opacity-40',
          checked ? 'bg-[var(--indigo)]' : 'bg-white/10'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

const LANDING_PRICE_TIERS = [
  {
    key: 'free' as const,
    name: 'FREE',
    monthly: '$0',
    annual: '$0',
    sub: '',
    features: ['Dashboard · rankings · portfolio access', '3 trades / week analyzed', 'Lightweight roster tools', 'Includes ads'],
    highlight: false,
  },
  {
    key: 'pro' as const,
    name: 'PRO',
    monthly: '$4.99',
    annual: '$49.99',
    subFn: (annual: boolean) => (annual ? '/yr' : '/mo'),
    features: [
      'Unlimited trade breakdowns',
      'Sit/start optimizer',
      'Dynasty Analyst (10 messages / day)',
      'Weekly digest & proactive alerts',
      'No ads',
    ],
    highlight: true,
  },
  {
    key: 'elite' as const,
    name: 'ELITE',
    monthly: '$9.99',
    annual: '$99.99',
    subFn: (annual: boolean) => (annual ? '/yr' : '/mo'),
    features: [
      'Unlimited Analyst conversations',
      'Win-window & timeline tools',
      'F-FIG rookie grades',
      'College BBB scouting layer',
      'Priority support',
    ],
    highlight: false,
  },
] as const;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { loadFromData, hiddenLeagues } = usePreferences();

  const rawTab = searchParams.get('tab');
  const activeTab: TabId = TABS.includes(rawTab as TabId) ? (rawTab as TabId) : 'account';

  function setTab(t: TabId) {
    const u = new URL(window.location.pathname + window.location.search, window.location.origin);
    u.searchParams.set('tab', t);
    router.replace(u.pathname + u.search);
  }

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const [risk, setRisk] = useState<RiskTolerance>('balanced');
  const [positionPriority, setPositionPriority] = useState<PositionPriority>('rb_first');
  const [rebuild, setRebuild] = useState<RebuildPhilosophy>('opportunistic');
  const [contention, setContention] = useState<ContentionWindow>('2');
  const [valueSystem, setValueSystem] = useState<DefaultValueSystem>('ktc');
  const [showPhotos, setShowPhotos] = useState(true);
  const [compact, setCompact] = useState(false);

  const [digestEnabled, setDigestEnabled] = useState(true);
  const [emailInjury, setEmailInjury] = useState(false);
  const [emailPrice, setEmailPrice] = useState(false);
  const [emailTrade, setEmailTrade] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushInjury, setPushInjury] = useState(false);
  const [pushTrade, setPushTrade] = useState(false);

  const pushCapable = useMemo(hasPushPublicEnv, []);

  const [prefBlob, setPrefBlob] = useState<UserPreferenceData & Record<string, unknown>>({});

  const [sleeperDraft, setSleeperDraft] = useState('');
  const [sleeperSaved, setSleeperSaved] = useState('');

  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [leagueIdsDraft, setLeagueIdsDraft] = useState('');

  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [pricingAnnual, setPricingAnnual] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');

  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState<string | null>(null);

  /** Current paid tier derived from preference_data.subscription_tier + is_paid (layout parity) */
  const [effectiveTier, setEffectiveTier] = useState<'free' | 'pro' | 'elite'>('free');

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/billing-summary');
      const data = (await res.json()) as BillingSummary & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load billing');
        setBilling(null);
      } else {
        setBilling(data);
      }
    } catch {
      toast.error('Could not load billing');
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;
      setUserId(user.id);
      if (user.email) setEmail(user.email);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      const { data: leagueRow } = await supabase
        .from('leagues')
        .select('synced_at')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (leagueRow?.synced_at) setLastSynced(String(leagueRow.synced_at));

      if (!profile) return;

      const pd = mergePreferenceData(
        profile.preference_data as Record<string, unknown>,
        {}
      ) as UserPreferenceData & Record<string, unknown>;
      setPrefBlob(pd);

      loadFromData({
        risk_tolerance: profile.risk_tolerance ?? undefined,
        preference_data: {
          positionalRanking: pd.positionalRanking,
          hiddenLeagues: pd.hiddenLeagues,
          position_priority: pd.position_priority,
        },
      });

      let rt: RiskTolerance = 'balanced';
      const rawR = profile.risk_tolerance;
      if (rawR === 'conservative' || rawR === 'balanced' || rawR === 'aggressive') rt = rawR;
      else if (rawR === 'medium') rt = 'balanced';

      let pp: PositionPriority = 'rb_first';
      if (pd.position_priority === 'rb_first' || pd.position_priority === 'wr_first' || pd.position_priority === 'bpa') {
        pp = pd.position_priority;
      } else if (pd.positionalRanking?.length) {
        const inferred = inferPositionPriorityFromRanking(pd.positionalRanking);
        if (inferred) pp = inferred;
      }

      const rb: RebuildPhilosophy =
        pd.rebuild_philosophy === 'patient' || pd.rebuild_philosophy === 'opportunistic' || pd.rebuild_philosophy === 'aggressive'
          ? pd.rebuild_philosophy
          : 'opportunistic';

      const cw: ContentionWindow =
        pd.contention_window === '1' || pd.contention_window === '2' || pd.contention_window === '3' || pd.contention_window === 'forever'
          ? pd.contention_window
          : '2';

      const dv: DefaultValueSystem =
        pd.default_value_system === 'ktc' || pd.default_value_system === 'bbv' || pd.default_value_system === 'fantasycalc'
          ? pd.default_value_system
          : 'ktc';

      setRisk(rt);
      setPositionPriority(pp);
      setRebuild(rb);
      setContention(cw);
      setValueSystem(dv);
      setShowPhotos(pd.show_player_photos !== false);
      setCompact(pd.compact_mode === true);

      setDigestEnabled(pd.digest_enabled !== false);
      setEmailInjury(pd.notify_injury_email === true);
      setEmailPrice(pd.notify_price_email === true);
      setEmailTrade(pd.notify_trade_email === true);
      setPushEnabled(pd.push_enabled === true);
      setPushInjury(pd.notify_push_injury === true);
      setPushTrade(pd.notify_push_trade === true);

      setSleeperSaved(profile.username ?? profile.sleeper_user_id ?? '');
      setSleeperDraft(profile.username ?? profile.sleeper_user_id ?? '');

      let t: typeof effectiveTier = 'free';
      if (pd.subscription_tier === 'elite') t = 'elite';
      else if (profile.is_paid) t = 'pro';
      setEffectiveTier(t);

      await loadBilling();
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'billing') loadBilling();
  }, [searchParams, loadBilling]);

  async function saveSleeper() {
    if (!userId) {
      toast.error('Not signed in');
      return;
    }
    const u = sleeperDraft.trim().replace(/^@/, '');
    if (!u) {
      toast.error('Enter a Sleeper username');
      return;
    }
    try {
      const res = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(u)}`);
      if (!res.ok) {
        toast.error('Sleeper user not found — check the username.');
        return;
      }
      const data = (await res.json()) as { user_id?: string; username?: string };
      if (!data.user_id) {
        toast.error('Invalid Sleeper response');
        return;
      }
      const supabase = createClient();
      await supabase.from('profiles').upsert({
        id: userId,
        sleeper_user_id: data.user_id,
        username: data.username ?? u,
        updated_at: new Date().toISOString(),
      });

      const display = data.username ?? u;
      setSleeperSaved(display);
      toast.success(`Sleeper username saved (@${display})`);
    } catch {
      toast.error('Could not validate Sleeper username');
    }
  }

  async function syncLeagues() {
    const supabase = createClient();
    setSyncing(true);
    try {
      const ids = parseLeagueIds(leagueIdsDraft);
      for (const id of ids) {
        try {
          const res = await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(id)}`);
          const league = res.ok ? ((await res.json()) as { league_id?: string } | null) : null;
          if (!league?.league_id) {
            toast.error(`Invalid league ID: "${id}". Check your IDs and try again.`);
            return;
          }
        } catch {
          toast.error(`Could not validate league ID "${id}". Check your connection and try again.`);
          return;
        }
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids.length > 0 ? { league_ids: ids } : {}),
      });
      const data = (await res.json()) as { success?: boolean; leagues_synced?: number; error?: string };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Sync failed');
        return;
      }
      toast.success(`Synced ${data.leagues_synced ?? 0} leagues`);
      if (userId) {
        const { data: lg } = await supabase
          .from('leagues')
          .select('synced_at')
          .eq('user_id', userId)
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lg?.synced_at) setLastSynced(String(lg.synced_at));
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function savePreferencesFooter() {
    const supabase = createClient();
    if (!userId) return;
    setSavingPrefs(true);
    try {
      const ranking = rankingFromPositionPriority(positionPriority, prefBlob.positionalRanking);
      const nextPd = mergePreferenceData(prefBlob, {
        positionalRanking: ranking,
        position_priority: positionPriority,
        hiddenLeagues,
        rebuild_philosophy: rebuild,
        contention_window: contention,
        default_value_system: valueSystem,
        theme: 'dark',
        show_player_photos: showPhotos,
        compact_mode: compact,
      }) as Record<string, unknown>;

      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          risk_tolerance: risk,
          preference_data: nextPd,
          updated_at: new Date().toISOString(),
        });

      setPrefBlob(nextPd as UserPreferenceData & Record<string, unknown>);
      loadFromData({
        risk_tolerance: risk,
        preference_data: {
          positionalRanking: ranking,
          hiddenLeagues,
          position_priority: positionPriority,
        },
      });

      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  }

  async function saveNotificationsFooter() {
    const supabase = createClient();
    if (!userId) return;
    setSavingNotifications(true);
    try {
      const ranking = rankingFromPositionPriority(positionPriority, prefBlob.positionalRanking);
      const base = mergePreferenceData(prefBlob, {
        positionalRanking: ranking,
        position_priority: positionPriority,
        hiddenLeagues,
      });

      const nextPd = mergePreferenceData(base as Record<string, unknown>, {
        digest_enabled: digestEnabled,
        notify_injury_email: emailInjury,
        notify_price_email: emailPrice,
        notify_trade_email: emailTrade,
        push_enabled: pushEnabled,
        notify_push_injury: pushInjury,
        notify_push_trade: pushTrade,
      }) as Record<string, unknown>;

      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          preference_data: nextPd,
          updated_at: new Date().toISOString(),
        });

      setPrefBlob(nextPd as UserPreferenceData & Record<string, unknown>);
      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save notifications');
    } finally {
      setSavingNotifications(false);
    }
  }

  async function openStripePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? 'Could not open billing portal');
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout(plan: 'pro' | 'elite') {
    const key = `${plan}_${pricingAnnual ? 'annual' : 'monthly'}`;
    setStripeCheckoutLoading(key);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan, interval: pricingAnnual ? 'year' : 'month' }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setStripeCheckoutLoading(null);
    }
  }

  async function confirmDeleteAccount() {
    if (deletePhrase.trim() !== 'DELETE') {
      toast.error('Type DELETE exactly to confirm');
      return;
    }
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((body as { error?: string }).error ?? 'Could not delete account');
        return;
      }
      toast.success('Your account has been deleted');
      setDeleteOpen(false);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      toast.error('Could not delete account');
    }
  }

  function priceDisplay(tier: (typeof LANDING_PRICE_TIERS)[number]): string {
    if (tier.key === 'free') return tier.monthly;
    return pricingAnnual ? tier.annual : tier.monthly;
  }

  const formatSync = () => {
    if (!lastSynced) return 'Never';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSynced));
    } catch {
      return lastSynced;
    }
  };

  const displayTierBadge = useMemo((): 'free' | 'pro' | 'elite' => {
    if (billingLoading) return effectiveTier;
    if (!billing) return effectiveTier;
    if (!billing.is_paid) return 'free';
    return billing.tier === 'elite' ? 'elite' : 'pro';
  }, [billing, billingLoading, effectiveTier]);

  /** Pricing card CTA per tier */
  const actionForTier = (key: string) => {
    if (key === 'free') {
      return displayTierBadge === 'free' ? (
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-white/10 py-3.5 text-center text-sm font-bold text-[var(--text-muted)]"
        >
          Current Plan
        </button>
      ) : null;
    }
    if (key === 'pro') {
      if (!billing?.is_paid || displayTierBadge === 'free') {
        return (
          <button
            type="button"
            disabled={stripeCheckoutLoading?.startsWith('pro')}
            onClick={() => startCheckout('pro')}
            className="rounded-xl bg-[var(--indigo)] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#5254cc]"
          >
            {stripeCheckoutLoading?.startsWith('pro') ? 'Redirecting…' : 'Upgrade'}
          </button>
        );
      }
      if (displayTierBadge === 'pro') {
        return (
          <button type="button" disabled className="cursor-not-allowed rounded-xl border border-white/15 py-3.5 text-center text-sm font-bold text-[var(--text-muted)]">
            Current Plan
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={openStripePortal}
          className="rounded-xl border border-white/15 py-3.5 text-center text-sm font-bold text-white transition hover:border-white/35"
        >
          Manage in portal
        </button>
      );
    }
    if (key === 'elite') {
      if (displayTierBadge === 'elite') {
        return (
          <button type="button" disabled className="cursor-not-allowed rounded-xl border border-white/15 py-3.5 text-center text-sm font-bold text-[var(--text-muted)]">
            Current Plan
          </button>
        );
      }
      return (
        <button
          type="button"
          disabled={stripeCheckoutLoading?.startsWith('elite')}
          onClick={() => startCheckout('elite')}
          className="rounded-xl border border-white/15 py-3.5 text-center text-sm font-bold text-white transition hover:border-white/35"
        >
          {stripeCheckoutLoading?.startsWith('elite') ? 'Redirecting…' : 'Upgrade'}
        </button>
      );
    }
    return null;
  };

  return (
    <AppBackground intensity="minimal">
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <h1 className="display tracking-wide text-[48px] leading-none text-[var(--text-primary)]">Settings</h1>

        {/* Mobile tab select */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <select
            className="md:hidden w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] outline-none ring-offset-2 ring-offset-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--indigo)]"
            value={activeTab}
            onChange={(e) => setTab(e.target.value as TabId)}
            aria-label="Settings section"
          >
            {(['Account', 'Preferences', 'Billing', 'Notifications'] as const).map((label, i) => (
              <option key={TABS[i]} value={TABS[i]}>
                {label}
              </option>
            ))}
          </select>

          <div className="hidden md:flex flex-wrap gap-2 border-b border-[var(--border)] pb-0">
            {(
              [
                ['account', 'Account'],
                ['preferences', 'Preferences'],
                ['billing', 'Billing'],
                ['notifications', 'Notifications'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  'relative px-4 py-3 text-sm font-semibold transition',
                  activeTab === id ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                {label}
                {activeTab === id && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--indigo)]" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'account' && (
          <div className="space-y-6">
            <Section title="Profile">
              <div>
                <label className="mb-2 block text-xs text-[var(--text-muted)]">Email</label>
                <input
                  readOnly
                  value={email}
                  className="w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-[var(--text-muted)]">Sleeper username</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={sleeperDraft}
                    onChange={(e) => setSleeperDraft(e.target.value)}
                    placeholder="@username"
                    className="min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--indigo)]"
                  />
                  <button
                    type="button"
                    onClick={() => saveSleeper()}
                    className="rounded-lg bg-[var(--indigo)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5254cc]"
                  >
                    Save
                  </button>
                </div>
                {sleeperSaved ? (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Connected as <span className="text-[var(--text-primary)] font-medium">@{sleeperSaved.replace(/^@/, '')}</span>
                  </p>
                ) : null}
              </div>

              <div className="border-t border-[var(--border)] pt-5 space-y-5">
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Leagues</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Search by name or paste Sleeper league IDs. Leave the ID box empty to sync every league on your account.
                </p>
                <LeagueNameSearch
                  existingLeagueIds={parseLeagueIds(leagueIdsDraft)}
                  onAppendLeagueId={(id) => setLeagueIdsDraft((prev) => appendLeagueIdToDraft(prev, id))}
                />
                <div>
                  <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-2 font-mono-tactical">
                    Enter league ID{' '}
                    <span className="normal-case text-[var(--text-muted)] font-[family-name:var(--font-body)] tracking-normal">
                      (one per line or comma-separated)
                    </span>
                  </label>
                  <textarea
                    value={leagueIdsDraft}
                    onChange={(e) => setLeagueIdsDraft(e.target.value)}
                    placeholder={'1048374694683095040\n998765432109876543'}
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-[var(--bg-secondary)] px-4 py-3 text-sm font-mono text-white placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--indigo)] focus:ring-1 focus:ring-[var(--indigo)] resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={syncLeagues}
                  className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  {syncing ? 'Syncing…' : 'Sync Leagues'}
                </button>
                <span className="text-sm text-[var(--text-muted)]">Last synced: {formatSync()}</span>
              </div>
            </Section>

            <Section title="Danger Zone">
              <p className="text-sm text-[var(--text-secondary)]">
                Delete your Boom or Bust account and all synced league data. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/25 transition"
              >
                Delete Account
              </button>
            </Section>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <Section title="Dynasty Strategy">
              <RadioRow
                label="Risk tolerance"
                name="risk"
                value={risk}
                onChange={setRisk}
                options={RISK_OPTS.map((r) => ({ id: r.v, label: r.label }))}
              />

              <RadioRow<PositionPriority>
                label="Position priority"
                name="position"
                value={positionPriority}
                onChange={setPositionPriority}
                options={[
                  { id: 'rb_first', label: 'RB-first' },
                  { id: 'wr_first', label: 'WR-first' },
                  { id: 'bpa', label: 'BPA' },
                ]}
              />

              <RadioRow<RebuildPhilosophy>
                label="Rebuild philosophy"
                name="rebuild"
                value={rebuild}
                onChange={setRebuild}
                options={[
                  { id: 'patient', label: 'Patient' },
                  { id: 'opportunistic', label: 'Opportunistic' },
                  { id: 'aggressive', label: 'Aggressive' },
                ]}
              />

              <RadioRow<ContentionWindow>
                label="Contention window"
                name="contention"
                value={contention}
                onChange={setContention}
                options={[
                  { id: '1', label: '1-year' },
                  { id: '2', label: '2-year' },
                  { id: '3', label: '3-year' },
                  { id: 'forever', label: 'Dynasty forever' },
                ]}
              />
            </Section>

            <Section title="UI Preferences">
              <RadioRow<DefaultValueSystem>
                label="Default value system"
                name="vals"
                value={valueSystem}
                onChange={setValueSystem}
                options={[
                  { id: 'ktc', label: 'KTC' },
                  { id: 'bbv', label: 'BBV' },
                  { id: 'fantasycalc', label: 'FantasyCalc' },
                ]}
              />

              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">Theme</p>
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-white/5 px-4 py-2.5 text-sm text-[var(--text-muted)] cursor-not-allowed opacity-70"
                  title="More themes coming later"
                >
                  Dark (only option for now)
                </button>
              </div>

              <Toggle
                checked={showPhotos}
                onChange={setShowPhotos}
                label="Show player photos"
                description="Applies wherever roster cards surface player headshots."
              />
              <Toggle
                checked={compact}
                onChange={setCompact}
                label="Compact mode"
                description="Less padding on cards throughout the dashboard."
              />
            </Section>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingPrefs}
                onClick={savePreferencesFooter}
                className="rounded-xl bg-[var(--indigo)] px-8 py-3 font-semibold text-white transition hover:bg-[#5254cc] disabled:opacity-50"
              >
                {savingPrefs ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-10">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-6">
              <h2 className="mb-4 font-[family-name:var(--font-body)] text-lg font-semibold text-[var(--text-primary)]">
                Current plan
              </h2>
              {billingLoading ? (
                <p className="text-sm text-[var(--text-muted)]">Loading billing…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide',
                        displayTierBadge === 'elite'
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                          : displayTierBadge === 'pro'
                            ? 'border-[var(--indigo)] bg-[var(--indigo)]/15 text-[var(--indigo-light)]'
                            : 'border-white/15 text-[var(--text-secondary)]'
                      )}
                    >
                      {displayTierBadge === 'free' ? 'Free' : displayTierBadge === 'pro' ? 'Pro' : 'Elite'}
                    </span>
                    {billing?.is_paid && billing.price_label && (
                      <span className="text-sm text-[var(--text-secondary)]">
                        {billing.price_label}/{billing.interval === 'year' ? 'yr' : 'mo'}
                      </span>
                    )}
                    {billing?.is_paid && billing.renewal_iso && (
                      <span className="text-sm text-[var(--text-muted)]">Renews {new Date(billing.renewal_iso).toLocaleDateString()}</span>
                    )}
                  </div>

                  {billing?.is_paid && billing.card_last4 && (
                    <p className="mb-4 text-sm text-[var(--text-secondary)]">
                      Payment method ending in ****{billing.card_last4}
                      <button
                        type="button"
                        className="ml-3 font-medium text-[var(--indigo-light)] underline-offset-4 hover:underline"
                        disabled={portalLoading}
                        onClick={openStripePortal}
                      >
                        {portalLoading ? 'Loading…' : 'Update Payment'}
                      </button>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {billing?.is_paid ? (
                      <button
                        type="button"
                        disabled={portalLoading}
                        onClick={openStripePortal}
                        className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
                      >
                        {portalLoading ? 'Loading…' : 'Manage Subscription'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPricingModalOpen(true)}
                        className="rounded-xl bg-[var(--indigo)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5254cc]"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            <section>
              <div className="mb-10 text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-8">Pricing</p>
                <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setPricingAnnual(false)}
                    className={clsx(
                      'rounded-full px-5 py-2 text-sm font-semibold transition',
                      !pricingAnnual ? 'bg-[var(--indigo)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingAnnual(true)}
                    className={clsx(
                      'rounded-full px-5 py-2 text-sm font-semibold transition',
                      pricingAnnual ? 'bg-[var(--indigo)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                    )}
                  >
                    Annual <span className="ml-1 text-xs font-bold text-emerald-400/90">−17%</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {LANDING_PRICE_TIERS.map((tier) => (
                  <div
                    key={tier.key}
                    className={clsx(
                      'card relative flex flex-col rounded-2xl border p-8',
                      tier.highlight && 'border-[var(--indigo)]/55 shadow-[var(--shadow-glow)] lg:scale-[1.02]'
                    )}
                  >
                    {tier.key === displayTierBadge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--cyan)] px-4 py-1 text-xs font-bold text-[var(--bg-primary)]">
                        Current Plan
                      </span>
                    )}
                    {tier.highlight && tier.key === 'pro' && displayTierBadge === 'free' && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--indigo)] px-4 py-1 text-xs font-bold text-white">
                        Popular
                      </span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{tier.name}</p>
                    <div className="my-5 flex flex-wrap items-baseline gap-1">
                      <span className="display text-5xl text-white">{priceDisplay(tier)}</span>
                      {tier.key !== 'free' && (
                        <span className="text-sm text-[var(--text-muted)]">
                          {(tier as { subFn?: (b: boolean) => string }).subFn?.(pricingAnnual) ?? ''}
                        </span>
                      )}
                    </div>
                    <ul className="mb-8 flex-1 space-y-3 text-sm text-[var(--text-secondary)]">
                      {tier.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className="shrink-0 text-[var(--green)]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {actionForTier(tier.key)}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Section title="Email Notifications">
              <Toggle
                checked={digestEnabled}
                onChange={setDigestEnabled}
                label="Weekly digest (Monday 6am)"
                description="League standings, pickups, and a weekly recap."
              />
              <Toggle checked={emailInjury} onChange={setEmailInjury} label="Injury alerts" />
              <Toggle checked={emailPrice} onChange={setEmailPrice} label="Price alerts" />
              <Toggle checked={emailTrade} onChange={setEmailTrade} label="Trade opportunities" />
            </Section>

            {pushCapable && (
              <Section title="Push Notifications">
                <Toggle checked={pushEnabled} onChange={setPushEnabled} label="Enable browser push" />
                <Toggle checked={pushInjury} onChange={setPushInjury} label="Injury alerts" disabled={!pushEnabled} />
                <Toggle checked={pushTrade} onChange={setPushTrade} label="Trade opportunities" disabled={!pushEnabled} />
                <button
                  type="button"
                  disabled={!pushEnabled}
                  onClick={() => toast.success('Push test queued — subscribe flow ships next.')}
                  className={clsx(
                    'mt-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                    pushEnabled ? 'border border-[var(--indigo)] text-[var(--indigo-light)] hover:bg-[var(--indigo)]/15' : 'cursor-not-allowed border border-white/10 text-[var(--text-muted)]'
                  )}
                >
                  Test Notification
                </button>
              </Section>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingNotifications}
                onClick={saveNotificationsFooter}
                className="rounded-xl bg-[var(--indigo)] px-8 py-3 font-semibold text-white transition hover:bg-[#5254cc] disabled:opacity-50"
              >
                {savingNotifications ? 'Saving…' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}

        {email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
          <Section title="Admin">
            <p className="text-xs text-[var(--text-muted)]">Internal admin panel for Boom or Bust.</p>
            <Link
              href="/admin"
              className="inline-block rounded-xl border border-[var(--indigo)]/30 px-4 py-2 text-sm font-medium text-[var(--indigo-light)] transition hover:bg-[var(--indigo)]/10"
            >
              Open Admin Panel →
            </Link>
          </Section>
        )}

        {pricingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
            <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setPricingModalOpen(false)} aria-label="Close" />
            <div className="relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="display text-2xl text-white">Plans</p>
                <button type="button" className="text-[var(--text-muted)] hover:text-white" onClick={() => setPricingModalOpen(false)}>
                  Close
                </button>
              </div>
              <div className="mb-10 text-center">
                <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-card)]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setPricingAnnual(false)}
                    className={clsx(
                      'rounded-full px-5 py-2 text-sm font-semibold transition',
                      !pricingAnnual ? 'bg-[var(--indigo)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingAnnual(true)}
                    className={clsx(
                      'rounded-full px-5 py-2 text-sm font-semibold transition',
                      pricingAnnual ? 'bg-[var(--indigo)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                    )}
                  >
                    Annual −17%
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {LANDING_PRICE_TIERS.map((tier) => (
                  <div
                    key={`m-${tier.key}`}
                    className={clsx(
                      'card relative flex flex-col rounded-2xl border p-6',
                      tier.highlight && 'border-[var(--indigo)]/55 shadow-[var(--shadow-glow)] md:scale-[1.02]'
                    )}
                  >
                    {tier.key === displayTierBadge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--cyan)] px-3 py-0.5 text-[10px] font-bold uppercase text-[var(--bg-primary)]">
                        Current Plan
                      </span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{tier.name}</p>
                    <div className="my-5 flex flex-wrap items-baseline gap-1">
                      <span className="display text-5xl text-white">{priceDisplay(tier)}</span>
                      {tier.key !== 'free' && (
                        <span className="text-sm text-[var(--text-muted)]">
                          {(tier as { subFn?: (b: boolean) => string }).subFn?.(pricingAnnual) ?? ''}
                        </span>
                      )}
                    </div>
                    <ul className="mb-6 flex-1 space-y-2 text-sm text-[var(--text-secondary)]">
                      {tier.features.map((f) => (
                        <li key={`${tier.key}-${f}`} className="flex gap-2">
                          <span className="text-[var(--green)]">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {actionForTier(tier.key)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {deleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDeleteOpen(false)} aria-label="Close" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/40 bg-[var(--bg-card)] p-6 shadow-xl">
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delete account?</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                This will delete all your data. Type DELETE to confirm.
              </p>
              <input
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                className="mb-6 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-red-400"
                placeholder="DELETE"
              />
              <div className="flex justify-end gap-3">
                <button type="button" className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)]" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletePhrase.trim() !== 'DELETE'}
                  onClick={() => confirmDeleteAccount()}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                >
                  Permanently delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppBackground>
  );
}
