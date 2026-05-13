/**
 * Upstash QStash client — durable background job queue.
 * Fixes Vercel timeout problem for per-user TFO/BVI calculations at scale.
 */

import { Client } from '@upstash/qstash';

let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;
  if (!_client) {
    _client = new Client({ token: process.env.QSTASH_TOKEN });
  }
  return _client;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dynasty-command-center-gules.vercel.app';

export interface QueueJobResult {
  queued: boolean;
  messageId?: string;
  error?: string;
}

export async function enqueueJob(
  path: string,
  body: Record<string, unknown>,
  options?: Record<string, unknown>,
): Promise<QueueJobResult> {
  const client = getClient();
  if (!client) {
    return { queued: false, error: 'QSTASH_TOKEN not configured' };
  }

  try {
    const res = await client.publish({
      url: `${BASE_URL}${path}`,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
      },
      ...options,
    } as Parameters<typeof client.publish>[0]);
    const messageId = (res as { messageId?: string }).messageId;
    return { queued: true, messageId };
  } catch (err) {
    return { queued: false, error: String(err) };
  }
}

/** Queue TFO calculation for a single user */
export async function enqueueTFOJob(userId: string): Promise<QueueJobResult> {
  return enqueueJob('/api/jobs/tfo-user', { userId });
}

/** Queue BVI calculation for a single user */
export async function enqueueBVIJob(userId: string): Promise<QueueJobResult> {
  return enqueueJob('/api/jobs/bvi-user', { userId });
}

/** Batch-enqueue TFO jobs for a list of user IDs */
export async function batchEnqueueTFO(userIds: string[]): Promise<{ queued: number; failed: number }> {
  let queued = 0;
  let failed = 0;
  // QStash batch (sequential to respect rate limits)
  for (const userId of userIds) {
    const r = await enqueueTFOJob(userId);
    if (r.queued) queued++;
    else failed++;
  }
  return { queued, failed };
}
