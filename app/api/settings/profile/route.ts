import { NextRequest, NextResponse } from 'next/server';
import type { UserBadge } from '@/lib/feedback/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeTier, type SubscriptionTier } from '@/lib/access/gates';
import {
  avgRosterTfoScore,
  collectRosterPlayerIds,
  formatLeagueConnection,
} from '@/lib/settings/profileHelpers';

export const dynamic = 'force-dynamic';

export interface LeagueConnectionRow {
  id:           string;
  name:         string;
  format:       string;
  role:         string;
  since:        string;
  championships: number;
}

export interface ProfileData {
  userId:          string;
  username:        string;
  teamName:        string;
  bio:             string;
  dynastyTitle:    string;
  memberSince:     string;
  leagueCount:     number;
  championships:   number;
  dynastyPowerRating: number | null;
  playersRostered: number;
  avatarUrl:       string | null;
  leagues:         LeagueConnectionRow[];
  subscription: {
    tier:        SubscriptionTier;
    label:       string;
    price:       string;
    renewsLabel: string | null;
    isPaid:      boolean;
    features:    string[];
  };
  usage: {
    playersTracked:  { current: number; max: number };
    tradeAnalyses:   { current: number; max: number };
    aiQueries:       { current: number; max: number };
    reportsExported: { current: number; max: number };
  };
  notifications: {
    tradeAlerts:       boolean;
    priceAlerts:       boolean;
    waiverAlerts:      boolean;
    injuryAlerts:      boolean;
    lineupReminders:   boolean;
    newsUpdates:       boolean;
  };
  badges: UserBadge[];
}

const TIER_INFO: Record<
  SubscriptionTier,
  { label: string; price: string; features: string[] }
> = {
  all_pro_terminal: {
    label: 'All-Pro Terminal',
    price: '$20 /mo',
    features: ['Unlimited leagues', 'Proactive trades', 'Full API access', 'Priority support'],
  },
  elite: {
    label: 'General Manager',
    price: '$10 /mo',
    features: ['10 leagues synced', 'Smart Counter', 'Blueprint tools', 'Email reports'],
  },
  pro: {
    label: 'League Analyst',
    price: '$5 /mo',
    features: ['5 leagues synced', 'Trade Analyzer', 'Sit/Start optimizer', 'No ads'],
  },
  free: {
    label: 'Rookie Scout',
    price: '$0 /mo',
    features: ['1 league synced', 'Dashboard overview', 'Basic Start/Sit', 'Includes ads'],
  },
};

function usageCaps(tier: SubscriptionTier) {
  if (tier === 'all_pro_terminal') return { players: 1000, trades: 100, ai: 500, reports: 50 };
  if (tier === 'elite') return { players: 500, trades: 50, ai: 200, reports: 25 };
  if (tier === 'pro') return { players: 250, trades: 30, ai: 100, reports: 15 };
  return { players: 100, trades: 10, ai: 20, reports: 5 };
}

function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return 'Dynasty Manager';
  try {
    const d = new Date(iso);
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `Dynasty Manager Since ${month} ${d.getFullYear()}`;
  } catch {
    return 'Dynasty Manager';
  }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const [
    { data: profile },
    { data: leagues, count: leagueCount },
    { data: badgeRows },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('leagues')
      .select('id, name, season, total_rosters, scoring_settings, settings, status', { count: 'exact' })
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false }),
    admin
      .from('user_badges')
      .select('badge_type, badge_label, awarded_at')
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false }),
  ]);

  const profileRec = (profile ?? {}) as Record<string, unknown>;
  const sleeperUserId = String(profileRec.sleeper_user_id ?? '');
  const username =
    String(profileRec.username ?? profileRec.sleeper_username ?? '').replace(/^@/, '') ||
    user.email?.split('@')[0] ||
    'Manager';

  const pref = (profile?.preference_data && typeof profile.preference_data === 'object'
    ? profile.preference_data
    : {}) as Record<string, unknown>;

  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  const tier = normalizeTier(rawTier, profile?.is_paid);
  const tierMeta = TIER_INFO[tier] ?? TIER_INFO.free;

  const rosterPlayerIds = sleeperUserId
    ? await collectRosterPlayerIds(admin, sleeperUserId)
    : [];
  const dynastyPowerRating = await avgRosterTfoScore(admin, rosterPlayerIds);

  const leagueRows: LeagueConnectionRow[] = (leagues ?? []).map((l) =>
    formatLeagueConnection(
      {
        id: l.id,
        name: l.name,
        season: l.season ?? null,
        total_rosters: l.total_rosters,
        scoring_settings: l.scoring_settings as Record<string, number> | null,
        settings: l.settings as Record<string, unknown> | null,
      },
      sleeperUserId || null,
    ),
  );

  const usageMax = usageCaps(tier);
  const playersRostered = rosterPlayerIds.length;

  const notifPref = (pref.notifications ?? {}) as Record<string, boolean>;

  const createdAt =
    (profileRec.created_at as string | undefined) ??
    user.created_at ??
    null;

  const avatarUrl = sleeperUserId
    ? `https://sleepercdn.com/avatars/thumbs/${sleeperUserId}`
    : null;

  // Billing renewal — fetched client-side via /api/stripe/billing-summary when needed
  const data: ProfileData = {
    userId: user.id,
    username,
    teamName: (pref.team_name as string) ?? username,
    bio: (pref.bio as string) ?? '',
    dynastyTitle: (pref.dynasty_title as string) ?? 'THE ARCHITECT',
    memberSince: formatMemberSince(createdAt),
    leagueCount: leagueCount ?? leagueRows.length,
    championships: 0,
    dynastyPowerRating,
    playersRostered,
    avatarUrl,
    leagues: leagueRows,
    subscription: {
      tier,
      label: tierMeta.label,
      price: tierMeta.price,
      renewsLabel: profile?.is_paid ? null : null,
      isPaid: Boolean(profile?.is_paid),
      features: tierMeta.features,
    },
    usage: {
      playersTracked: { current: Math.min(playersRostered, usageMax.players), max: usageMax.players },
      tradeAnalyses: { current: 0, max: usageMax.trades },
      aiQueries: { current: 0, max: usageMax.ai },
      reportsExported: { current: 0, max: usageMax.reports },
    },
    notifications: {
      tradeAlerts: notifPref.tradeAlerts !== false,
      priceAlerts: notifPref.priceAlerts !== false,
      waiverAlerts: notifPref.waiverAlerts !== false,
      injuryAlerts: notifPref.injuryAlerts !== false,
      lineupReminders: notifPref.lineupReminders ?? false,
      newsUpdates: notifPref.newsUpdates ?? false,
    },
    badges: (badgeRows ?? []).map((b) => ({
      badgeType: String(b.badge_type ?? ''),
      badgeLabel: String(b.badge_label ?? 'Badge'),
      awardedAt: String(b.awarded_at ?? new Date().toISOString()),
    })),
  };

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const { data: existing } = await supabase
    .from('profiles')
    .select('preference_data')
    .eq('id', user.id)
    .maybeSingle();

  const current = (existing?.preference_data ?? {}) as Record<string, unknown>;
  const updated = { ...current, ...body };

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, preference_data: updated }, { onConflict: 'id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
