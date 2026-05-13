/**
 * Syncs Sleeper transactions (trades + waivers) into the trades table.
 * Called from the nightly sync cron.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchTransactions } from '@/lib/sleeper';
import type { SleeperTransaction } from '@/lib/sleeper';

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

interface SyncResult {
  league_id: string;
  trades_inserted: number;
  waivers_logged: number;
  errors: string[];
}

async function syncLeagueTransactions(leagueId: string): Promise<SyncResult> {
  const supabase = createAdminClient();
  const result: SyncResult = { league_id: leagueId, trades_inserted: 0, waivers_logged: 0, errors: [] };

  for (let week = 1; week <= 18; week++) {
    let txns: SleeperTransaction[] | null = null;
    try {
      txns = await fetchTransactions(leagueId, week);
    } catch (err) {
      result.errors.push(`week ${week}: ${String(err)}`);
      continue;
    }

    if (!txns || txns.length === 0) {
      if (week > 8) break; // Stop early once past midseason with no activity
      continue;
    }

    for (const txn of txns) {
      if (txn.status !== 'complete') continue;

      if (txn.type === 'trade') {
        const assetsAdded = Object.keys(txn.adds ?? {});
        const assetsDropped = Object.keys(txn.drops ?? {});

        try {
          const { error } = await supabase.from('trades').upsert(
            {
              transaction_id: txn.transaction_id,
              league_id: leagueId,
              type: 'trade',
              assets_sent: assetsDropped,
              assets_received: assetsAdded,
              roster_ids: txn.roster_ids,
              draft_picks: txn.draft_picks ?? [],
              status: 'complete',
              created_at: new Date(txn.created).toISOString(),
            },
            { onConflict: 'transaction_id' },
          );
          if (error) result.errors.push(`trade ${txn.transaction_id}: ${error.message}`);
          else result.trades_inserted++;
        } catch (err) {
          result.errors.push(`trade upsert: ${String(err)}`);
        }
      } else if (txn.type === 'waiver' || txn.type === 'free_agent') {
        result.waivers_logged++;
      }
    }

    await delay(100);
  }

  return result;
}

export async function syncTransactionsForLeagues(
  leagueIds: string[],
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const batches: string[][] = [];

  for (let i = 0; i < leagueIds.length; i += 10) {
    batches.push(leagueIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(syncLeagueTransactions));
    results.push(...batchResults);
    await delay(500);
  }

  return results;
}
