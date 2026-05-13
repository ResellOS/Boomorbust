/**
 * Notifications engine — creates, fetches, and marks notifications.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationType =
  | 'SELL_HIGH'
  | 'INJURY_ALERT'
  | 'TRADE_OFFER'
  | 'PRICE_SPIKE'
  | 'WAIVER_ADD'
  | 'BREAKOUT_ALERT';

export interface NotificationPayload {
  player_id?: string;
  league_id?: string;
  message: string;
  redirects_to: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  player_id: string | null;
  league_id: string | null;
  message: string;
  redirects_to: string;
  read: boolean;
  created_at: string;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    player_id: payload.player_id ?? null,
    league_id: payload.league_id ?? null,
    message: payload.message,
    redirects_to: payload.redirects_to,
    read: false,
    created_at: new Date().toISOString(),
  });
}

export async function getUnread(userId: string): Promise<Notification[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Notification[];
}

export async function markRead(notificationId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function generateSellHighAlert(
  playerId: string,
  userId: string,
  leagueId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from('player_values')
    .select('bvi_score, calculated_at')
    .eq('player_id', playerId)
    .gte('calculated_at', thirtyDaysAgo)
    .order('calculated_at', { ascending: false });

  if (!rows || rows.length < 2) return;

  type Row = { bvi_score: number };
  const typed = rows as Row[];
  const latest = typed[0]!.bvi_score;
  const peak = Math.max(...typed.map((r) => r.bvi_score));
  const drop = peak - latest;
  if (drop < 800) return;

  const { data: player } = await supabase
    .from('bbv_values')
    .select('player_name')
    .eq('player_id', playerId)
    .maybeSingle();

  const name = (player as { player_name?: string } | null)?.player_name ?? playerId;

  await createNotification(userId, 'SELL_HIGH', {
    player_id: playerId,
    league_id: leagueId,
    message: `${name} is showing sell-high signals. BVI dropped ${Math.round(drop)} points. Act before the market catches on.`,
    redirects_to: '/dashboard/trade-hub',
  });
}

export async function generateInjuryAlert(
  playerId: string,
  userId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: injury } = await supabase
    .from('medical_history')
    .select('injury_type')
    .eq('player_id', playerId)
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();

  const injuryType = (injury as { injury_type?: string } | null)?.injury_type ?? 'injury';

  const { data: mrsRow } = await supabase
    .from('tfo_cache')
    .select('mrs_score')
    .eq('player_id', playerId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const mrsScore = (mrsRow as { mrs_score?: number } | null)?.mrs_score;
  const mrsTier =
    mrsScore == null ? '' : mrsScore < 20 ? ' GREEN' : mrsScore <= 35 ? ' YELLOW' : ' RED';

  const { data: player } = await supabase
    .from('bbv_values')
    .select('player_name')
    .eq('player_id', playerId)
    .maybeSingle();

  const name = (player as { player_name?: string } | null)?.player_name ?? playerId;

  await createNotification(userId, 'INJURY_ALERT', {
    player_id: playerId,
    message: `${name} injury update: ${injuryType}. MRS risk:${mrsTier}.`,
    redirects_to: `/dashboard/players/${playerId}`,
  });
}

export async function generateBreakoutAlert(
  playerId: string,
  userId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: pvRow } = await supabase
    .from('player_values')
    .select('bvi_score')
    .eq('player_id', playerId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const bpsScore = (pvRow as { bvi_score?: number } | null)?.bvi_score;
  if (!bpsScore || bpsScore < 75) return;

  const { data: player } = await supabase
    .from('bbv_values')
    .select('player_name')
    .eq('player_id', playerId)
    .maybeSingle();

  const name = (player as { player_name?: string } | null)?.player_name ?? playerId;

  await createNotification(userId, 'BREAKOUT_ALERT', {
    player_id: playerId,
    message: `${name} breakout signal detected. BPS: ${Math.round(bpsScore)}. Add before the market reacts.`,
    redirects_to: '/dashboard/waiver-wire',
  });
}
