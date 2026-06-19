import { createAdminClient } from '@/lib/supabase/admin';
import { mapDailyTaskRow, type DailyTask } from './dailyTasks';

export async function fetchDailyTasks(userId: string): Promise<DailyTask[]> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'PENDING'])
      .gt('expires_at', now)
      .order('task_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[dashboard] daily_tasks fetch failed:', error);
      return [];
    }

    return (data ?? []).map((row) => mapDailyTaskRow(row as Record<string, unknown>));
  } catch (err) {
    console.error('[dashboard] fetchDailyTasks failed:', err);
    return [];
  }
}
