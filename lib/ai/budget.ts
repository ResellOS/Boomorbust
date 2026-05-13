/**
 * AI spend tracker — hard monthly cap on Claude API costs.
 * Uses Upstash Redis counters (cent-precision).
 */

import { Redis } from '@upstash/redis';
import { Resend } from 'resend';

const MONTHLY_BUDGET_CENTS = 10000;   // $100.00
const WARNING_THRESHOLD_CENTS = 7500; // $75.00 alert

// claude-sonnet-4-6 pricing (cents per 1K tokens)
const INPUT_COST_PER_1K  = 0.3;  // $0.003/tok → 0.3 cents/1K
const OUTPUT_COST_PER_1K = 1.5;  // $0.015/tok → 1.5 cents/1K

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

function getMonthKey(): string {
  const now = new Date();
  return `ai:spend:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost  = (inputTokens  / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;
  return Math.ceil(inputCost + outputCost);
}

export async function getCurrentSpend(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return (await redis.get<number>(getMonthKey())) ?? 0;
  } catch {
    return 0;
  }
}

async function sendBudgetAlert(currentDollars: number, capDollars: number): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail || !process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'alerts@boomorbust.app',
      to: adminEmail,
      subject: `⚠️ BOB AI Spend Alert — $${currentDollars.toFixed(2)} of $${capDollars}`,
      html: `<p>AI spend has reached <strong>$${currentDollars.toFixed(2)}</strong> this month (cap: $${capDollars}).</p><p>Review usage or raise the cap in <code>lib/ai/budget.ts</code>.</p>`,
    });
  } catch { /* non-fatal */ }
}

export async function trackSpend(costCents: number): Promise<void> {
  const redis = getRedis();
  if (!redis || costCents <= 0) return;
  try {
    const key = getMonthKey();
    const newTotal = await redis.incrby(key, costCents);
    // TTL of 35 days so it survives the month boundary
    await redis.expire(key, 35 * 86400);

    if (
      newTotal >= WARNING_THRESHOLD_CENTS &&
      newTotal - costCents < WARNING_THRESHOLD_CENTS
    ) {
      await sendBudgetAlert(newTotal / 100, MONTHLY_BUDGET_CENTS / 100);
    }
  } catch { /* non-fatal — never block the response */ }
}

export interface BudgetStatus {
  allowed: boolean;
  currentSpend: number;     // cents
  remainingBudget: number;  // cents
  percentUsed: number;
}

export async function checkBudget(): Promise<BudgetStatus> {
  const currentSpend = await getCurrentSpend();
  const allowed = currentSpend < MONTHLY_BUDGET_CENTS;
  const remainingBudget = Math.max(0, MONTHLY_BUDGET_CENTS - currentSpend);
  const percentUsed = Math.round((currentSpend / MONTHLY_BUDGET_CENTS) * 100);
  return { allowed, currentSpend, remainingBudget, percentUsed };
}
