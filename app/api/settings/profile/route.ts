import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  teamName:        string;
  bio:             string;
  dynastyTitle:    string;
  memberSince:     string;
  leagueCount:     number;
  championships:   number;
  empireScore:     number;
  playersRostered: number;
  trophies:        number;
  leagues:         LeagueConnectionRow[];
  subscription: {
    tier:        string;
    label:       string;
    price:       string;
    renewsLabel: string;
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
}

function seeded(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h) / 2147483647;
}

const TIER_INFO: Record<string, { label: string; price: string; features: string[] }> = {
  elite: {
    label: 'All-Pro Terminal',
    price: '$20 /mo',
    features: ['All Features', 'Advanced Analytics', 'AI Dynasty Coach', 'Trade Analyzer', 'Premium Support', 'Export Reports'],
  },
  pro: {
    label: 'Veteran',
    price: '$10 /mo',
    features: ['All Features', 'Trade Analyzer', 'AI Dynasty Coach (limited)', 'Email Reports'],
  },
  free: {
    label: 'Rookie (Free)',
    price: '$0 /mo',
    features: ['Dashboard Overview', 'Basic Start/Sit', 'Waiver Wire (limited)'],
  },
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: leagues }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('leagues').select('id, name, total_rosters, scoring_settings').eq('user_id', user.id).limit(10),
  ]);

  const pref = (profile?.preference_data ?? {}) as Record<string, unknown>;
  const tier = (pref.subscription_tier as string) ?? (profile?.is_paid ? 'pro' : 'free');
  const tierMeta = TIER_INFO[tier] ?? TIER_INFO.free;

  // Build league connections
  const ROLES = ['Commissioner', 'Co-Owner', 'Owner', 'Owner'];
  const leagueRows: LeagueConnectionRow[] = (leagues ?? []).map((l, i) => {
    const s = seeded(l.id);
    const ppType = (l.scoring_settings as Record<string, number> | null)?.rec === 1 ? 'PPR' : (l.scoring_settings as Record<string, number> | null)?.rec === 0.5 ? '0.5PPR' : 'SF PPR';
    return {
      id:            l.id,
      name:          l.name,
      format:        `${l.total_rosters ?? 12}-Team ${ppType}`,
      role:          ROLES[i % ROLES.length],
      since:         `Since ${2019 + i}`,
      championships: Math.floor(s * 3.5),
    };
  });

  const totalChampionships = leagueRows.reduce((s, l) => s + l.championships, 0);
  const totalPlayers = (leagues ?? []).length * 40;

  // Usage — based on tier
  const usageMax = tier === 'elite' ? { players: 1000, trades: 100, ai: 500, reports: 50 }
    : tier === 'pro'              ? { players: 500,  trades: 50,  ai: 100, reports: 20 }
    :                               { players: 100,  trades: 10,  ai: 20,  reports: 5  };

  const usageCurrent = {
    players: Math.min(usageMax.players, totalPlayers || Math.round(seeded(user.id + 'p') * usageMax.players * 0.65)),
    trades:  Math.min(usageMax.trades, Math.round(seeded(user.id + 't') * usageMax.trades * 0.5)),
    ai:      Math.min(usageMax.ai,     Math.round(seeded(user.id + 'a') * usageMax.ai * 0.65)),
    reports: Math.min(usageMax.reports, Math.round(seeded(user.id + 'r') * usageMax.reports * 0.36)),
  };

  // Notification prefs from preference_data
  const notifPref = (pref.notifications ?? {}) as Record<string, boolean>;
  const empireScore = 75 + Math.round(seeded(user.id) * 20);

  const renews = new Date();
  renews.setDate(renews.getDate() + 15);
  const renewsLabel = `Renews ${renews.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const data: ProfileData = {
    userId:          user.id,
    teamName:        (pref.team_name as string) ?? profile?.full_name ?? user.email?.split('@')[0] ?? 'Dynasty Empire',
    bio:             (pref.bio as string) ?? 'Building dynasties. Crushing leagues. Elevating the edge.',
    dynastyTitle:    (pref.dynasty_title as string) ?? 'DYNASTY GOAT',
    memberSince:     'Dynasty Manager Since 2019',
    leagueCount:     (leagues ?? []).length,
    championships:   totalChampionships,
    empireScore,
    playersRostered: usageCurrent.players,
    trophies:        totalChampionships + Math.round(seeded(user.id + 'trophy') * 10),
    leagues:         leagueRows,
    subscription: {
      tier,
      label:       tierMeta.label,
      price:       tierMeta.price,
      renewsLabel,
      features:    tierMeta.features,
    },
    usage: {
      playersTracked:  { current: usageCurrent.players, max: usageMax.players },
      tradeAnalyses:   { current: usageCurrent.trades,  max: usageMax.trades },
      aiQueries:       { current: usageCurrent.ai,      max: usageMax.ai },
      reportsExported: { current: usageCurrent.reports, max: usageMax.reports },
    },
    notifications: {
      tradeAlerts:     notifPref.tradeAlerts     !== false,
      priceAlerts:     notifPref.priceAlerts     !== false,
      waiverAlerts:    notifPref.waiverAlerts     !== false,
      injuryAlerts:    notifPref.injuryAlerts    !== false,
      lineupReminders: notifPref.lineupReminders ?? false,
      newsUpdates:     notifPref.newsUpdates     ?? false,
    },
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
