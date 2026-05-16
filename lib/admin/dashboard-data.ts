import { readFile } from 'fs/promises';
import path from 'path';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
import { createAdminClient } from '@/lib/supabase/admin';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

const KTC_CACHE_TTL_SEC = 21600;

export type PipelineRow = {
  label: string;
  lastIso: string | null;
  ok: boolean;
  thresholdHours: number;
};

function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3600000;
}

export type RecentUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  tier: 'free' | 'pro' | 'elite' | 'all_pro_terminal';
  signedUpAt: string;
};

export type ErrorLogRow = {
  id: number;
  source: string;
  message: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type AdminDashboardPayload = {
  totalUsers: number;
  signupsThisWeek: number;
  signupSparkline: number[];
  proCount: number;
  eliteCount: number;
  mrrUsd: number | null;
  churnPct: number | null;
  errors24h: number;
  pipeline: { ktc: PipelineRow; bbv: PipelineRow; sleeper: PipelineRow; injuries: PipelineRow };
  recentUsers: RecentUserRow[];
  errorLogs: ErrorLogRow[];
};

async function fetchAllAuthUsers(db: ReturnType<typeof createAdminClient>) {
  const out: { id: string; email?: string; created_at: string }[] = [];
  let page = 1;
  let guard = 0;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || guard++ > 500) break;
    const batch = data.users ?? [];
    for (const u of batch) {
      out.push({ id: u.id, email: u.email ?? undefined, created_at: u.created_at });
    }
    if (batch.length < 1000) break;
    page += 1;
  }
  return out;
}

function tierFromProfile(isPaid: boolean, subscriptionTier?: string | null): 'free' | 'pro' | 'elite' | 'all_pro_terminal' {
  const r = (subscriptionTier ?? '').toLowerCase();
  if (r === 'all_pro_terminal' || r === 'all_pro') return 'all_pro_terminal';
  if (r === 'elite' || r === 'veteran') return 'elite';
  if (r === 'pro' || r === 'rookie' || isPaid) return 'pro';
  return 'free';
}

async function buildKtcPipelineRow(redis: Redis | null): Promise<PipelineRow> {
  let lastIso: string | null = null;

  if (redis) {
    try {
      lastIso = (await redis.get<string>('metrics:pipeline:ktc')) ?? null;
    } catch {
      lastIso = null;
    }
    const ageHours = hoursSince(lastIso);
    if (lastIso && ageHours != null) {
      return { label: 'KTC', lastIso, thresholdHours: 12, ok: ageHours <= 12 };
    }
    try {
      const ttl = await redis.ttl('ktc:dynasty:values');
      if (ttl > 0 && ttl <= KTC_CACHE_TTL_SEC) {
        const approxAgeHr = (KTC_CACHE_TTL_SEC - ttl) / 3600;
        const approxIso = new Date(Date.now() - approxAgeHr * 3600000).toISOString();
        return {
          label: 'KTC',
          lastIso: approxIso,
          thresholdHours: 12,
          ok: approxAgeHr <= 12,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return { label: 'KTC', lastIso: null, thresholdHours: 12, ok: false };
}

export async function getAdminDashboardPayload(): Promise<AdminDashboardPayload> {
  const db = createAdminClient();
  const redis = getRedis();

  const now = Date.now();
  const dayMs = 86400000;
  const weekAgo = now - 7 * dayMs;
  const thirtyDaysAgo = now - 30 * dayMs;

  const [profRes, allUsersChunk, bbRes, lgRes, errRes] = await Promise.all([
    db.from('profiles').select('id, username, is_paid, subscription_tier, preference_data'),
    fetchAllAuthUsers(db),
    db.from('bbv_values').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('leagues').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('error_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(now - 86400000).toISOString()),
  ]);

  const profilesList = profRes.data ?? [];
  const allUsers = allUsersChunk;
  const bbvMaxRow = bbRes.data;
  const leagueSyncRow = lgRes.data;
  const errors24hCount = errRes.count ?? 0;

  const { data: errorLogsRows } = await db
    .from('error_logs')
    .select('id, source, message, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(50);

  const profMap = new Map(profilesList.map((p) => [p.id, p]));

  const totalUsersFromDb = profilesList.length || allUsers.length;

  const signupsThisWeek = allUsers.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length;

  const sparkBuckets = Array.from({ length: 30 }, () => 0);
  for (const u of allUsers) {
    const t = new Date(u.created_at).getTime();
    if (t < thirtyDaysAgo) continue;
    const dayIndex = Math.floor((t - thirtyDaysAgo) / dayMs);
    if (dayIndex >= 0 && dayIndex < 30) sparkBuckets[dayIndex] += 1;
  }

  let proCount = 0;
  let eliteCount = 0;
  for (const p of profilesList) {
    const tier = tierFromProfile(!!p.is_paid, (p as unknown as { subscription_tier?: string }).subscription_tier);
    if (tier === 'elite' || tier === 'all_pro_terminal') eliteCount += 1;
    else if (tier === 'pro') proCount += 1;
  }

  const ktcRowPromise = buildKtcPipelineRow(redis);

  const bbvIso = bbvMaxRow?.updated_at ? String(bbvMaxRow.updated_at) : null;
  const bbvHours = hoursSince(bbvIso);
  const bbvRow: PipelineRow = {
    label: 'BBV',
    lastIso: bbvIso,
    thresholdHours: 24 * 7,
    ok: bbvHours != null ? bbvHours <= 24 * 7 : false,
  };

  const sleeperIso = leagueSyncRow?.synced_at ? String(leagueSyncRow.synced_at) : null;
  const sleeperHours = hoursSince(sleeperIso);
  const sleeperRow: PipelineRow = {
    label: 'Sleeper',
    lastIso: sleeperIso,
    thresholdHours: 24,
    ok: sleeperHours != null ? sleeperHours <= 24 : false,
  };

  let injuriesIso: string | null = null;
  if (redis) {
    try {
      injuriesIso = (await redis.get<string>('metrics:pipeline:injuries')) ?? null;
    } catch {
      injuriesIso = null;
    }
  }
  const injHours = hoursSince(injuriesIso);
  const injuriesRow: PipelineRow = {
    label: 'Injuries',
    lastIso: injuriesIso,
    thresholdHours: 1,
    ok: injHours != null ? injHours <= 1 : false,
  };

  let mrrUsd: number | null = null;
  let churnPct: number | null = null;

  let activeSubs = Math.max(proCount + eliteCount, 1);

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
      let cents = 0;
      let counted = 0;
      let sa: string | undefined;
      for (let pg = 0; pg < 60; pg++) {
        const subs = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
          starting_after: sa,
        });
        if (!subs.data.length) break;
        for (const sub of subs.data) {
          counted++;
          const item = sub.items.data[0];
          const amt = item?.price?.unit_amount;
          const interval = item?.price?.recurring?.interval;
          if (amt == null) continue;
          cents += interval === 'year' ? Math.round(amt / 12) : amt;
        }
        if (!subs.has_more) break;
        sa = subs.data[subs.data.length - 1]!.id;
      }
      activeSubs = Math.max(counted, 1);
      mrrUsd = Math.round(cents) / 100;

      const sinceSec = Math.floor((now - 30 * dayMs) / 1000);
      let canceled = 0;
      let cs: string | undefined;
      for (let pg = 0; pg < 60; pg++) {
        const list = await stripe.subscriptions.list({
          status: 'canceled',
          limit: 100,
          starting_after: cs,
        });
        if (!list.data.length) break;
        for (const s of list.data) {
          const canceledAt =
            typeof s.canceled_at === 'number'
              ? s.canceled_at
              : typeof s.ended_at === 'number'
                ? s.ended_at
                : null;
          if (canceledAt != null && canceledAt >= sinceSec) canceled += 1;
        }
        if (!list.has_more) break;
        cs = list.data[list.data.length - 1]!.id;
      }
      churnPct = Math.round((Math.min(100, (canceled / activeSubs) * 100)) * 100) / 100;
    } catch {
      mrrUsd = null;
      churnPct = null;
    }
  }

  const ktcRow = await ktcRowPromise;

  const newestSignups = [...allUsers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);

  const recentUsers: RecentUserRow[] = newestSignups.map((u) => {
    const p = profMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      username: p?.username ?? null,
      tier: tierFromProfile(!!p?.is_paid, (p as unknown as { subscription_tier?: string } | undefined)?.subscription_tier),
      signedUpAt: u.created_at,
    };
  });

  const errRows: ErrorLogRow[] = (errorLogsRows ?? []).map((e) => ({
    id: Number(e.id),
    source: String(e.source),
    message: String(e.message),
    created_at: String(e.created_at),
    metadata: e.metadata && typeof e.metadata === 'object' ? (e.metadata as Record<string, unknown>) : null,
  }));

  return {
    totalUsers: totalUsersFromDb,
    signupsThisWeek,
    signupSparkline: sparkBuckets,
    proCount,
    eliteCount,
    mrrUsd,
    churnPct,
    errors24h: errors24hCount,
    pipeline: { ktc: ktcRow, bbv: bbvRow, sleeper: sleeperRow, injuries: injuriesRow },
    recentUsers,
    errorLogs: errRows,
  };
}

export async function getBuildMetaPackageJson(): Promise<{ nextVersion: string }> {
  try {
    const raw = await readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as { dependencies?: { next?: string } };
    return { nextVersion: pkg.dependencies?.next ?? '14.x' };
  } catch {
    return { nextVersion: '—' };
  }
}
